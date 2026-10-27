import assert from "node:assert/strict";
import test from "node:test";

import { content, React, ReactDOMServer, renderer } from "./helpers/modules";
import { collectNodes, markFor, textOf, type JsonNode } from "./helpers/json";

function asJson(value: unknown): JsonNode {
  return value as JsonNode;
}

test("legacy plain-text article content becomes structured paragraphs", () => {
  const doc = asJson(
    content.normalizeArticleContent("First line\nsecond line\n\nSecond paragraph"),
  );

  assert.equal(doc.type, "doc");
  const paragraphs = collectNodes(doc, "paragraph");
  assert.equal(paragraphs.length, 2);
  assert.equal(textOf(paragraphs[0]), "First linesecond line");
  assert.deepEqual(
    paragraphs[0].content?.map((node) => node.type),
    ["text", "hardBreak", "text"],
  );
  assert.equal(textOf(paragraphs[1]), "Second paragraph");

  const hardBreaks = collectNodes(doc, "hardBreak");
  assert.equal(hardBreaks.length, 1);
});

test("server normalization removes unsafe nodes, marks, URLs, and attrs", () => {
  const normalized = asJson(
    content.normalizeArticleContent({
      type: "doc",
      content: [
        { type: "script", text: "alert(1)" },
        { type: "iframe", attrs: { src: "https://evil.example" } },
        {
          type: "paragraph",
          attrs: {
            onclick: "alert(1)",
            style: "color:red",
            textAlign: "evil",
            __proto__: { polluted: true },
          },
          content: [
            { type: "text", text: "Safe <text> " },
            {
              type: "text",
              text: "bad link",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
            {
              type: "text",
              text: "unknown mark",
              marks: [{ type: "script" }],
            },
          ],
        },
        {
          type: "image",
          attrs: { src: "javascript:alert(1)", alt: "bad" },
        },
        {
          type: "image",
          attrs: {
            src: "https://example.com/photo.png",
            alt: "Photo",
            onerror: "alert(1)",
            caption: "Caption",
          },
        },
        {
          type: "videoEmbed",
          attrs: { src: "javascript:alert(1)", title: "Bad" },
        },
        {
          type: "heading",
          attrs: { level: 99, textAlign: "right" },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "callout",
          attrs: { variant: "evil", title: "Callout" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Callout body" }],
            },
          ],
        },
        { type: "paragraph", content: [] },
        { type: "unknownNode", content: [{ type: "text", text: "unknown" }] },
      ],
    }),
  );

  assert.equal(collectNodes(normalized, "script").length, 0);
  assert.equal(collectNodes(normalized, "iframe").length, 0);
  assert.equal(collectNodes(normalized, "unknownNode").length, 0);

  const paragraph = collectNodes(normalized, "paragraph")[0];
  assert.equal(paragraph.attrs?.onclick, undefined);
  assert.equal(paragraph.attrs?.style, undefined);
  assert.equal(paragraph.attrs?.textAlign, undefined);
  assert.equal(markFor(normalized, "bad link", "link"), undefined);
  assert.equal(markFor(normalized, "unknown mark", "script"), undefined);

  const images = collectNodes(normalized, "image");
  assert.equal(images.length, 1);
  assert.equal(images[0].attrs?.src, "https://example.com/photo.png");
  assert.equal(images[0].attrs?.onerror, undefined);
  assert.equal(images[0].attrs?.caption, "Caption");

  assert.equal(collectNodes(normalized, "videoEmbed").length, 0);

  const heading = collectNodes(normalized, "heading")[0];
  assert.equal(heading.attrs?.level, 3);
  assert.equal(heading.attrs?.textAlign, "right");

  const callout = collectNodes(normalized, "callout")[0];
  assert.equal(callout.attrs?.variant, "info");

  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /javascript:|onerror|onclick|<script/i);
  assert.doesNotMatch(serialized, /polluted/);
});

test("cover image URLs only keep safe web or relative paths", () => {
  assert.equal(
    content.getSafeCoverImageUrl("https://example.com/cover.png"),
    "https://example.com/cover.png",
  );
  assert.equal(content.getSafeCoverImageUrl("/images/cover.png"), "/images/cover.png");
  assert.equal(content.getSafeCoverImageUrl("javascript:alert(1)"), null);
  assert.equal(content.getSafeCoverImageUrl("data:image/png;base64,AAAA"), null);
});

const RICH_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Bold" },
        { type: "text", text: " " },
        { type: "text", marks: [{ type: "italic" }], text: "Italic" },
        { type: "text", text: " " },
        { type: "text", marks: [{ type: "underline" }], text: "Under" },
        { type: "text", text: " " },
        { type: "text", marks: [{ type: "strike" }], text: "Strike" },
        { type: "text", text: " " },
        { type: "text", marks: [{ type: "code" }], text: "Code" },
        { type: "text", text: " " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          text: "Link",
        },
        { type: "text", text: " " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          text: "Unsafe link",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2, textAlign: "right" },
      content: [{ type: "text", text: "Heading" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Item" }],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Quote" }],
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "js" },
      content: [{ type: "text", text: "const x = 1;" }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Head" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              attrs: { colspan: 1, rowspan: 1 },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Cell" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        src: "https://example.com/photo.png",
        alt: "Photo",
        caption: "Caption",
      },
    },
    {
      type: "callout",
      attrs: { variant: "warning", title: "Careful" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Callout body" }],
        },
      ],
    },
    {
      type: "details",
      attrs: { summary: "More" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Details body" }],
        },
      ],
    },
    {
      type: "equation",
      attrs: { latex: "E = mc^2", displayMode: true },
    },
  ],
};

test("normalization is idempotent and preserves rich formatting for reload", () => {
  const once = asJson(content.normalizeArticleContent(RICH_DOC));
  const twice = asJson(content.normalizeArticleContent(once));

  assert.deepEqual(twice, once);
  assert.equal(collectNodes(once, "paragraph")[0].attrs?.textAlign, "center");
  assert.equal(collectNodes(once, "heading")[0].attrs?.textAlign, "right");
  assert.equal(markFor(once, "Bold", "bold")?.type, "bold");
  assert.equal(markFor(once, "Italic", "italic")?.type, "italic");
  assert.equal(markFor(once, "Under", "underline")?.type, "underline");
  assert.equal(markFor(once, "Strike", "strike")?.type, "strike");
  assert.equal(markFor(once, "Code", "code")?.type, "code");
  assert.equal(
    markFor(once, "Link", "link")?.attrs?.href,
    "https://example.com/",
  );
  assert.equal(markFor(once, "Unsafe link", "link"), undefined);
  assert.equal(collectNodes(once, "tableRow").length, 2);
  assert.equal(collectNodes(once, "callout")[0].attrs?.variant, "warning");
  assert.equal(collectNodes(once, "details")[0].attrs?.summary, "More");
  assert.equal(collectNodes(once, "image")[0].attrs?.caption, "Caption");
  assert.equal(collectNodes(once, "equation").length, 1);
});

test("published renderer matches editor marks, blocks, and security rules", () => {
  const normalized = asJson(content.normalizeArticleContent(RICH_DOC));
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(renderer.ArticleRenderer, {
      content: normalized as Record<string, unknown>,
    }),
  );

  assert.match(markup, /<strong>Bold<\/strong>/);
  assert.match(markup, /<em>Italic<\/em>/);
  assert.match(markup, /<u>Under<\/u>/);
  assert.match(markup, /<del>Strike<\/del>/);
  assert.match(markup, /<code class="journal-inline-code">Code<\/code>/);
  assert.match(markup, /<a href="https:\/\/example\.com\/"/);
  assert.match(markup, /rel="noopener noreferrer"/);
  assert.match(markup, /text-align:center/);
  assert.match(markup, /<h2[^>]*text-align:right/);
  assert.match(markup, /<ul class="journal-ul">/);
  assert.match(markup, /<blockquote class="journal-blockquote">/);
  assert.match(markup, /class="journal-code-wrapper"/);
  assert.match(markup, /<table class="journal-table">/);
  assert.match(markup, /src="https:\/\/example\.com\/photo\.png"/);
  assert.match(markup, /journal-callout-warning/);
  assert.match(markup, /Careful/);
  assert.match(markup, /journal-details-summary/);
  assert.match(markup, /More/);
  assert.match(markup, /katex/);
  assert.doesNotMatch(markup, /javascript:/i);
  assert.doesNotMatch(markup, /<script/i);
});
