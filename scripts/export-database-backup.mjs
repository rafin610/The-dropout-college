import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const backupDir = join(root, "supabase", "backups", "pre-cleanup");
mkdirSync(backupDir, { recursive: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddgklwyjvttjcclanism.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  "admin_role_permissions",
  "admin_roles",
  "articles",
  "audit_logs",
  "badges",
  "categories",
  "discord_connections",
  "event_participants",
  "events",
  "follows",
  "moderation_reports",
  "navigation_items",
  "notifications",
  "permissions",
  "profile_badges",
  "profile_categories",
  "profile_skills",
  "profiles",
  "project_comments",
  "project_links",
  "project_members",
  "project_technologies",
  "project_upvotes",
  "projects",
  "site_content",
  "site_sections",
  "site_settings",
  "site_social_links",
  "skills",
  "social_links",
  "team_invitations",
  "team_members",
  "teams",
  "user_admin_roles",
  "user_roles",
  "user_skills",
  "users"
];

async function main() {
  console.log(`Starting complete database backup to ${backupDir}...`);
  const manifest = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tables: {},
  };

  for (const table of tables) {
    console.log(`Exporting ${table}...`);
    const { data, error, count } = await supabase
      .from(table)
      .select("*", { count: "exact" });

    if (error) {
      console.warn(`  Warning: Failed to export ${table}: ${error.message}`);
      manifest.tables[table] = { status: "error", error: error.message };
      continue;
    }

    const rowCount = data?.length ?? 0;
    manifest.tables[table] = { status: "ok", count: rowCount };
    const filePath = join(backupDir, `${table}.json`);
    writeFileSync(filePath, JSON.stringify(data ?? [], null, 2), "utf8");
    console.log(`  Saved ${rowCount} rows to ${table}.json`);
  }

  writeFileSync(
    join(backupDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  console.log("Database backup completed successfully!");
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
