import assert from "node:assert/strict";
import test from "node:test";

import { urls } from "./helpers/modules";

test("href sanitizer allows web, mail, phone, and relative links only", () => {
  assert.equal(
    urls.sanitizeHref("https://example.com/path?q=1"),
    "https://example.com/path?q=1",
  );
  assert.equal(urls.sanitizeHref("http://example.com"), "http://example.com/");
  assert.equal(urls.sanitizeHref("/journal/post"), "/journal/post");
  assert.equal(urls.sanitizeHref("#section"), "#section");
  assert.equal(urls.sanitizeHref("mailto:hello@example.com"), "mailto:hello@example.com");
  assert.equal(urls.sanitizeHref("tel:+123456789"), "tel:+123456789");
  assert.equal(urls.sanitizeHref("//cdn.example.com/file"), "//cdn.example.com/file");

  assert.equal(urls.sanitizeHref("javascript:alert(1)"), null);
  assert.equal(urls.sanitizeHref("JAVASCRIPT:alert(1)"), null);
  assert.equal(urls.sanitizeHref("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(urls.sanitizeHref("vbscript:msgbox(1)"), null);
  assert.equal(urls.sanitizeHref("\\\\server\\share"), null);
  assert.equal(urls.sanitizeHref("java\nscript:alert(1)"), null);
  assert.equal(urls.sanitizeHref(""), null);
  assert.equal(urls.sanitizeHref("https://example.com/" + "a".repeat(2_100)), null);
});

test("media sanitizer allows raster data images but rejects SVG and scripts", () => {
  assert.equal(
    urls.sanitizeMediaUrl("https://example.com/image.png"),
    "https://example.com/image.png",
  );
  assert.equal(urls.sanitizeMediaUrl("/images/local.png"), "/images/local.png");
  assert.equal(urls.sanitizeMediaUrl("//cdn.example.com/image.png"), "//cdn.example.com/image.png");
  assert.equal(
    urls.sanitizeMediaUrl("data:image/png;base64,iVBORw0KGgo="),
    "data:image/png;base64,iVBORw0KGgo=",
  );

  assert.equal(urls.sanitizeMediaUrl("javascript:alert(1)"), null);
  assert.equal(urls.sanitizeMediaUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="), null);
  assert.equal(urls.sanitizeMediaUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(urls.sanitizeMediaUrl("blob:https://example.com/id"), null);
  assert.equal(
    urls.sanitizeMediaUrl("data:image/png;base64,iVBORw0KGgo=", {
      allowDataImage: false,
    }),
    null,
  );
  assert.equal(urls.sanitizeMediaUrl("https://example.com/image.png", { allowRelative: false }), "https://example.com/image.png");
  assert.equal(urls.sanitizeMediaUrl("/local.png", { allowRelative: false }), null);
});

test("cover images reject inline data and unsafe schemes", () => {
  assert.equal(
    urls.sanitizeCoverImageUrl("https://example.com/cover.jpg"),
    "https://example.com/cover.jpg",
  );
  assert.equal(urls.sanitizeCoverImageUrl("/covers/local.jpg"), "/covers/local.jpg");
  assert.equal(urls.sanitizeCoverImageUrl("data:image/png;base64,iVBORw0KGgo="), null);
  assert.equal(urls.sanitizeCoverImageUrl("javascript:alert(1)"), null);
});

test("text alignment only accepts supported values", () => {
  for (const value of ["left", "center", "right", "justify"]) {
    assert.equal(urls.isSafeTextAlign(value), true);
  }
  for (const value of ["start", "end", "CENTER", "center; color:red", "", null]) {
    assert.equal(urls.isSafeTextAlign(value), false);
  }
});
