import assert from "node:assert/strict";
import test from "node:test";

import { accountStatus, journalAccess, memberPolicy, safeRedirect } from "./helpers/modules";

test("account status policy only accepts an explicit active account", () => {
  assert.equal(accountStatus.isActiveAccountStatus("active"), true);
  assert.equal(accountStatus.isActiveAccountStatus("suspended"), false);
  assert.equal(accountStatus.isActiveAccountStatus("deleted"), false);
  assert.equal(accountStatus.isActiveAccountStatus("ACTIVE"), false);
  assert.equal(accountStatus.isActiveAccountStatus(undefined), false);
  assert.equal(accountStatus.isActiveAccountStatus(null), false);

  assert.equal(accountStatus.normalizeAccountStatus("active"), "active");
  assert.equal(accountStatus.normalizeAccountStatus("suspended"), "suspended");
  assert.equal(accountStatus.normalizeAccountStatus("deleted"), "deleted");
  assert.equal(accountStatus.normalizeAccountStatus("pending"), null);
  assert.equal(accountStatus.normalizeAccountStatus(1), null);
});

test("safe redirects accept only same-origin application paths", () => {
  const safe = [
    "/dashboard",
    "/journal/studio?tab=drafts#editor",
    "/explore?query=hello%20world",
    "/settings/profile",
  ];

  for (const value of safe) {
    assert.equal(safeRedirect.safeRedirectPath(value), value);
  }

  assert.equal(safeRedirect.safeRedirectPath(undefined), "/dashboard");
  assert.equal(safeRedirect.safeRedirectPath(null), "/dashboard");
  assert.equal(safeRedirect.safeRedirectPath(""), "/dashboard");
  assert.equal(safeRedirect.safeRedirectPath("/dashboard", "/explore"), "/dashboard");
  assert.equal(safeRedirect.safeRedirectPath("https://evil.example", "/explore"), "/explore");
});

test("safe redirects reject open-redirect and control-character payloads", () => {
  const attacks = [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\evil.example",
    "/%5cevil.example",
    "/%2f%2fevil.example",
    "/%2F%2Fevil.example",
    "/..//evil.example",
    "/%2e%2e//evil.example",
    "/%00dashboard",
    "/%1fdashboard",
    "/%7fdashboard",
    "/dashboard\nLocation: https://evil.example",
    "/dashboard\r\nSet-Cookie: x=y",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ];

  for (const value of attacks) {
    assert.equal(
      safeRedirect.safeRedirectPath(value, "/fallback"),
      "/fallback",
      `expected ${JSON.stringify(value)} to be rejected`,
    );
  }
});

test("admin hierarchy prevents self edits and non-super edits of administrators", () => {
  const superAdmin = { id: "super", isSuperAdmin: true };
  const admin = { id: "admin", isSuperAdmin: false };

  assert.equal(
    memberPolicy.canManageMember(superAdmin, { id: "super", roles: ["super_admin"] }).allowed,
    false,
  );
  assert.equal(
    memberPolicy.canManageMember(admin, { id: "other-admin", roles: ["admin"] }).allowed,
    false,
  );
  assert.equal(
    memberPolicy.canManageMember(admin, { id: "other-super", roles: ["super_admin"] }).allowed,
    false,
  );
  assert.equal(
    memberPolicy.canManageMember(admin, { id: "member", roles: ["member"] }).allowed,
    true,
  );
  assert.equal(
    memberPolicy.canManageMember(admin, { id: "moderator", roles: ["moderator"] }).allowed,
    true,
  );
  assert.equal(
    memberPolicy.canManageMember(superAdmin, { id: "other-admin", roles: ["admin"] }).allowed,
    true,
  );
});

test("removing super-admin access is detected for role and status changes", () => {
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], "member", undefined), true);
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], "admin", undefined), true);
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], undefined, "suspended"), true);
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], undefined, "deleted"), true);
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], undefined, "active"), false);
  assert.equal(memberPolicy.removesSuperAdminAccess(["super_admin"], undefined, undefined), false);
  assert.equal(memberPolicy.removesSuperAdminAccess(["admin"], "member", undefined), false);
});

test("journal permissions separate writing, publishing, featuring, moderation, and deletion", () => {
  const createOnly = new Set(["articles.create"]);
  const publishOnly = new Set(["articles.publish"]);
  const manage = new Set(["articles.manage"]);
  const moderate = new Set(["articles.moderate"]);
  const wildcard = new Set(["*"]);

  assert.equal(journalAccess.canCreateArticles(createOnly), true);
  assert.equal(journalAccess.canCreateArticles(publishOnly), false);
  assert.equal(journalAccess.canCreateArticles(manage), true);
  assert.equal(journalAccess.canCreateArticles(wildcard), true);

  assert.equal(journalAccess.canPublishArticles(createOnly), false);
  assert.equal(journalAccess.canPublishArticles(publishOnly), true);
  assert.equal(journalAccess.canPublishArticles(manage), true);

  assert.equal(journalAccess.canFeatureArticles(publishOnly), false);
  assert.equal(journalAccess.canFeatureArticles(manage), true);
  assert.equal(journalAccess.canFeatureArticles(wildcard), true);

  assert.equal(journalAccess.canModerateArticles(moderate), true);
  assert.equal(journalAccess.canModerateArticles(createOnly), false);
  assert.equal(journalAccess.canModerateArticles(manage), true);
});

test("only managers or authors of drafts may delete an article", () => {
  const draft = { authorId: "author", status: "draft" as const };
  const published = { authorId: "author", status: "published" as const };
  const archived = { authorId: "author", status: "archived" as const };

  assert.equal(journalAccess.canDeleteArticle(draft, "author", new Set(["articles.create"])), true);
  assert.equal(journalAccess.canDeleteArticle(published, "author", new Set(["articles.create"])), false);
  assert.equal(journalAccess.canDeleteArticle(archived, "author", new Set(["articles.create"])), false);
  assert.equal(journalAccess.canDeleteArticle(draft, "other", new Set(["articles.create"])), false);
  assert.equal(journalAccess.canDeleteArticle(draft, "author", new Set()), false);
  assert.equal(journalAccess.canDeleteArticle(published, "author", new Set(["articles.delete"])), true);
  assert.equal(journalAccess.canDeleteArticle(published, "other", new Set(["articles.manage"])), true);
  assert.equal(journalAccess.canDeleteArticle(published, "other", new Set(["*"])), true);
});
