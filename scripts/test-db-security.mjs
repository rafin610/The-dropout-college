#!/usr/bin/env node
/**
 * Real RLS/RPC test runner for the security hardening migration.
 *
 * Starts a throwaway PostgreSQL 16 container, installs a Supabase-compatible
 * bootstrap, applies the repository migrations in the same order used for
 * local verification, re-applies 0013 to prove idempotence, and runs
 * supabase/tests/security_rls.sql with ON_ERROR_STOP.
 *
 * Requires Docker. No host PostgreSQL installation is needed because psql
 * runs inside the container.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const container = `dropout-security-test-${process.pid}`;
const image = process.env.SECURITY_TEST_IMAGE || "postgres:16-alpine";
const keep = process.env.KEEP_SECURITY_TEST_DB === "1";

const migrations = [
  // 0009 creates tables that 0005_fix_user_isolation_and_rls expects, and its
  // notification policy conflicts with the policies from 0001. The compatibility
  // step below drops those two policies before 0009 runs.
  "0001_initial_schema.sql",
  "0002_admin_system.sql",
  "0003_site_cms.sql",
  "0004_seed_community_data.sql",
  "COMPAT_NOTIFICATION_POLICIES",
  "0009_social_project_features.sql",
  "0005_event_visibility_fix.sql",
  "0005_fix_user_isolation_and_rls.sql",
  "0006_secure_member_roles.sql",
  "0007_profile_events_notifications.sql",
  "0008_predefined_profile_skills.sql",
  "0010_social_fixes.sql",
  "0011_notification_pipeline_and_realtime.sql",
  "0012_create_journal_articles.sql",
  "0013_security_hardening.sql",
];

const compatNotificationPolicies = `
drop policy if exists "users read their notifications" on public.notifications;
drop policy if exists "users update their notifications" on public.notifications;
`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}\n${output}`,
    );
  }

  return result;
}

function docker(args, options = {}) {
  return run("docker", args, options);
}

function psql(sql, label) {
  try {
    return docker(
      [
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-X",
        "-q",
        "-f",
        "-",
      ],
      { input: sql },
    );
  } catch (error) {
    error.message = `${label} failed:\n${error.message}`;
    throw error;
  }
}

function file(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

async function waitForPostgres() {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const result = spawnSync(
      "docker",
      ["exec", container, "pg_isready", "-U", "postgres", "-d", "postgres"],
      { encoding: "utf8" },
    );
    if (result.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("PostgreSQL did not become ready within 90 seconds.");
}

function cleanup() {
  if (keep) {
    console.log(`Keeping container ${container} for inspection.`);
    return;
  }
  spawnSync("docker", ["rm", "-f", container], { encoding: "utf8" });
}

async function main() {
  if (spawnSync("docker", ["info"], { encoding: "utf8" }).status !== 0) {
    throw new Error("Docker is not available. Start Docker to run test:db.");
  }

  // Remove a leftover container from an interrupted run with the same PID.
  spawnSync("docker", ["rm", "-f", container], { encoding: "utf8" });

  console.log(`Starting ${image} as ${container}...`);
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    container,
    "-e",
    "POSTGRES_PASSWORD=security-test",
    "-e",
    "POSTGRES_DB=postgres",
    image,
  ]);

  await waitForPostgres();

  console.log("Applying Supabase-compatible bootstrap...");
  psql(file("supabase/tests/bootstrap.sql"), "bootstrap");

  for (const migration of migrations) {
    if (migration === "COMPAT_NOTIFICATION_POLICIES") {
      console.log("Applying local-migration compatibility step...");
      psql(compatNotificationPolicies, "notification policy compatibility step");
      continue;
    }

    console.log(`Applying ${migration}...`);
    psql(file(`supabase/migrations/${migration}`), migration);
  }

  console.log("Re-applying 0013_security_hardening.sql to verify idempotence...");
  psql(
    file("supabase/migrations/0013_security_hardening.sql"),
    "0013_security_hardening.sql (second application)",
  );

  console.log("Running RLS/RPC assertions...");
  const result = psql(file("supabase/tests/security_rls.sql"), "security_rls.sql");
  if (result.stdout.trim()) console.log(result.stdout.trim());

  console.log("Database security tests passed.");
}

try {
  await main();
} finally {
  cleanup();
}
