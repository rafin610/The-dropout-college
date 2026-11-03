import "./dom";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const clipboard = require(
  "../../src/components/journal/editor/clipboard.ts",
) as typeof import("../../src/components/journal/editor/clipboard");

export const content = require(
  "../../src/server/journal/content.ts",
) as typeof import("../../src/server/journal/content");

export const urls = require("../../src/lib/journal/urls.ts") as typeof import(
  "../../src/lib/journal/urls"
);

export const deleteArticleModule = require(
  "../../src/server/journal/delete-article.ts",
) as typeof import("../../src/server/journal/delete-article");

export const articles = require(
  "../../src/server/journal/articles.ts",
) as typeof import("../../src/server/journal/articles");

export const validation = require(
  "../../src/server/journal/validation.ts",
) as typeof import("../../src/server/journal/validation");

export const errors = require("../../src/server/errors.ts") as typeof import(
  "../../src/server/errors"
);

export const accountStatus = require(
  "../../src/server/auth/account-status.ts",
) as typeof import("../../src/server/auth/account-status");

export const safeRedirect = require(
  "../../src/lib/safe-redirect.ts",
) as typeof import("../../src/lib/safe-redirect");

export const memberPolicy = require(
  "../../src/server/admin/member-policy.ts",
) as typeof import("../../src/server/admin/member-policy");

export const journalAccess = require(
  "../../src/server/journal/access.ts",
) as typeof import("../../src/server/journal/access");

export const renderer = require(
  "../../src/components/journal/renderer/article-renderer.tsx",
) as typeof import("../../src/components/journal/renderer/article-renderer");

export const React = require("react") as typeof import("react");

export const ReactDOMServer = require("react-dom/server") as typeof import(
  "react-dom/server"
);
