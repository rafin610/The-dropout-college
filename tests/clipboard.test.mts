import assert from "node:assert/strict";
import test from "node:test";

import { clipboard } from "./helpers/modules";
import { createTestEditor, dispatchPaste } from "./helpers/editor";
import {
  collectNodes,
  markFor,
  textOf,
  type JsonNode,
} from "./helpers/json";

const NOTION_HTML = `
  <p style="text-align: center">Intro <strong>bold</strong> <em>italic</em>
    <u>under</u> <s>strike</s> <code>inline</code></p>
  <h2>Heading two</h2>
  <p><a href="https://example.com/article" onclick="alert(1)">Link text</a></p>
  <ul>
    <li><p>First item</p><ul><li><p>Nested item</p></li></ul></li>
  </ul>
  <ol><li><p>Step one</p></li></ol>
  <blockquote><p>Quoted text</p></blockquote>
  <pre><code class="language-typescript">const answer: number = 42;</code></pre>
  <table>
    <tbody>
      <tr><th>Name</th><th>Value</th></tr>
      <tr><td>A</td><td>1</td></tr>
    </tbody>
  </table>
  <figure>
    <img src="https://example.com/photo.png" alt="Photo" onerror="alert(1)">
    <figcaption>Caption</figcaption>
  </figure>
  <aside data-type="callout" data-variant="tip" data-title="Note">
    <p>Callout body</p>
  </aside>
  <details data-type="details" data-summary="Read more">
    <summary>Read more</summary>
    <p>Details body</p>
  </details>
  <hr>
  <script>alert("xss")</script>
  <!-- notionvc: harmless-comment -->
`;

function asJson(value: unknown): JsonNode {
  return value as JsonNode;
}

test("sanitizer rebuilds clipboard HTML from an allowlist and strips XSS", () => {
  const sanitized = clipboard.sanitizeClipboardHtml(`
    <style>p { color: red }</style>
    <script>alert("xss")</script>
    <iframe src="https://evil.example"></iframe>
    <p onclick="alert(1)" style="text-align: center">
      Hello <span style="font-style: italic; text-decoration: underline">world</span>
    </p>
    <p><a href="javascript:alert(1)">bad link</a>
       <a href="https://example.com/safe" onmouseover="alert(2)">safe link</a></p>
    <img src="javascript:alert(1)" onerror="alert(3)" alt="bad">
    <img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" alt="bad svg">
    <img src="https://example.com/photo.png" alt="Photo" onerror="alert(4)">
    <table><tbody><tr><th>Head</th></tr><tr><td><b>Cell</b></td></tr></tbody></table>
    <aside data-type="callout" data-variant="warning" data-title="Careful">
      <p><strong>Important</strong></p>
    </aside>
    <details data-type="details" data-summary="More"><summary>More</summary><p>Hidden</p></details>
    <h4>Normalized heading</h4>
  `);

  assert.match(sanitized, /text-align: center/);
  assert.match(sanitized, /<u><em>world<\/em><\/u>/);
  assert.match(sanitized, /<a href="https:\/\/example\.com\/safe">safe link<\/a>/);
  assert.match(sanitized, /<img src="https:\/\/example\.com\/photo\.png" alt="Photo">/);
  assert.match(sanitized, /<th><p>Head<\/p><\/th>/);
  assert.match(sanitized, /<td><p><strong>Cell<\/strong><\/p><\/td>/);
  assert.match(
    sanitized,
    /<aside data-type="callout" data-variant="warning" data-title="Careful">/,
  );
  assert.match(
    sanitized,
    /<details data-type="details" data-summary="More">/,
  );
  assert.match(sanitized, /<h3>Normalized heading<\/h3>/);

  assert.doesNotMatch(sanitized, /<script|<style|<iframe/i);
  assert.doesNotMatch(sanitized, /onclick|onerror|onmouseover/i);
  assert.doesNotMatch(sanitized, /javascript:|data:image\/svg/i);
  assert.doesNotMatch(sanitized, /style="(?![^"]*text-align:)/i);
  assert.doesNotMatch(sanitized, /<span/i);
  assert.doesNotMatch(sanitized, /bad link<\/a>/);
  assert.match(sanitized, /bad link/);
});

test("sanitizer rejects oversized and empty clipboard payloads", () => {
  assert.equal(clipboard.sanitizeClipboardHtml(""), "");
  assert.equal(clipboard.sanitizeClipboardHtml("   "), "");
  assert.equal(clipboard.sanitizeClipboardHtml("<p>ok</p>"), "<p>ok</p>");
  assert.equal(clipboard.sanitizeClipboardHtml("x".repeat(5_000_001)), "");
});

test("plain-text fallback becomes structured, escaped HTML", () => {
  const html = clipboard.plainTextToClipboardHtml(
    [
      "# Plain heading",
      "",
      "A <script>alert(1)</script> & more",
      "",
      "- first",
      "- second",
      "",
      "1. one",
      "2. two",
      "",
      "> quote",
      "",
      "```js",
      "const x = 1 < 2;",
      "```",
    ].join("\n"),
  );

  assert.match(html, /<h1>Plain heading<\/h1>/);
  assert.match(html, /<p>A &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; more<\/p>/);
  assert.match(html, /<ul><li><p>first<\/p><\/li><li><p>second<\/p><\/li><\/ul>/);
  assert.match(html, /<ol><li><p>one<\/p><\/li><li><p>two<\/p><\/li><\/ol>/);
  assert.match(html, /<blockquote><p>quote<\/p><\/blockquote>/);
  assert.match(
    html,
    /<pre><code class="language-js">const x = 1 &lt; 2;<\/code><\/pre>/,
  );
  assert.doesNotMatch(html, /<script>alert/);
});

test("paste marker forces blocks closed but preserves internal inline slices", () => {
  const transform = clipboard.journalClipboardEditorProps.transformPastedHTML;
  assert.ok(transform);

  const external = transform("<p>One</p><p>Two</p>", {} as never);
  assert.match(external, /data-pm-slice="0 0 \[\]"/);

  const inline = transform('<p data-pm-slice="1 1 [{&quot;type&quot;:&quot;paragraph&quot;}]">Inline</p>', {} as never);
  assert.match(inline, /data-pm-slice="1 1 \[\]"/);

  const inlineOnly = transform("<strong>just inline</strong>", {} as never);
  assert.doesNotMatch(inlineOnly, /data-pm-slice/);
});

test("Notion paste inserts every block as new content and keeps existing text", (t) => {
  const harness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "EXISTING" }],
      },
    ],
  });
  t.after(() => harness.destroy());

  const { editor } = harness;
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  const before = asJson(JSON.parse(JSON.stringify(editor.getJSON())));

  const event = dispatchPaste(editor, { html: NOTION_HTML, text: "plain fallback" });
  const after = asJson(JSON.parse(JSON.stringify(editor.getJSON())));

  assert.equal(event.defaultPrevented, true);

  const paragraphs = collectNodes(after, "paragraph");
  assert.equal(textOf(paragraphs[0]), "EXISTING");
  assert.equal(textOf(paragraphs[1]), "Intro bold italic under strike inline");
  assert.equal(paragraphs[1].attrs?.textAlign, "center");
  assert.ok(!textOf(paragraphs[0]).includes("Intro"));

  const heading = collectNodes(after, "heading")[0];
  assert.equal(heading.attrs?.level, 2);
  assert.equal(textOf(heading), "Heading two");

  assert.equal(markFor(after, "bold", "bold")?.type, "bold");
  assert.equal(markFor(after, "italic", "italic")?.type, "italic");
  assert.equal(markFor(after, "under", "underline")?.type, "underline");
  assert.equal(markFor(after, "strike", "strike")?.type, "strike");
  assert.equal(markFor(after, "inline", "code")?.type, "code");
  assert.equal(
    markFor(after, "Link text", "link")?.attrs?.href,
    "https://example.com/article",
  );

  assert.equal(collectNodes(after, "bulletList").length, 2);
  assert.equal(collectNodes(after, "orderedList").length, 1);
  assert.equal(collectNodes(after, "listItem").length, 3);
  assert.equal(textOf(collectNodes(after, "blockquote")[0]), "Quoted text");

  const codeBlock = collectNodes(after, "codeBlock")[0];
  assert.equal(codeBlock.attrs?.language, "typescript");
  assert.equal(textOf(codeBlock), "const answer: number = 42;");

  assert.equal(collectNodes(after, "tableRow").length, 2);
  assert.equal(collectNodes(after, "tableHeader").length, 2);
  assert.equal(collectNodes(after, "tableCell").length, 2);

  const image = collectNodes(after, "image")[0];
  assert.equal(image.attrs?.src, "https://example.com/photo.png");
  assert.equal(image.attrs?.alt, "Photo");
  assert.equal(image.attrs?.caption, "Caption");

  const callout = collectNodes(after, "callout")[0];
  assert.equal(callout.attrs?.variant, "tip");
  assert.equal(callout.attrs?.title, "Note");
  assert.equal(textOf(callout), "Callout body");

  const details = collectNodes(after, "details")[0];
  assert.equal(details.attrs?.summary, "Read more");
  assert.equal(textOf(details), "Details body");

  assert.equal(collectNodes(after, "horizontalRule").length, 1);
  assert.equal(
    collectNodes(after, "text").filter((node) => node.text === "Intro ").length,
    1,
  );

  const serialized = JSON.stringify(after);
  assert.doesNotMatch(serialized, /javascript:|onerror|onclick|<script/i);

  editor.commands.undo();
  assert.deepEqual(asJson(JSON.parse(JSON.stringify(editor.getJSON()))), before);

  editor.commands.redo();
  assert.deepEqual(asJson(JSON.parse(JSON.stringify(editor.getJSON()))), after);
});

test("paste replaces the current selection and preserves surrounding text", (t) => {
  const harness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      },
    ],
  });
  t.after(() => harness.destroy());

  const { editor } = harness;
  editor.commands.setTextSelection({ from: 7, to: 12 });
  dispatchPaste(editor, {
    html: "<p><strong>brave</strong> new</p>",
    text: "brave new",
  });

  const doc = asJson(editor.getJSON());
  const allText = textOf(doc);
  assert.match(allText, /Hello/);
  assert.match(allText, /brave new/);
  assert.doesNotMatch(allText, /world/);
  assert.equal(markFor(doc, "brave", "bold")?.type, "bold");
});

test("plain-text-only paste is structured and inserted exactly once", (t) => {
  const harness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Start" }],
      },
    ],
  });
  t.after(() => harness.destroy());

  const { editor } = harness;
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);

  const event = dispatchPaste(editor, {
    html: "",
    text: [
      "# Plain heading",
      "",
      "- first",
      "- second",
      "",
      "1. one",
      "",
      "> quote",
      "",
      "```js",
      "const x = 1;",
      "```",
    ].join("\n"),
  });

  assert.equal(event.defaultPrevented, true);

  const doc = asJson(editor.getJSON());
  assert.equal(textOf(collectNodes(doc, "paragraph")[0]), "Start");
  assert.equal(collectNodes(doc, "heading").length, 1);
  assert.equal(textOf(collectNodes(doc, "heading")[0]), "Plain heading");
  assert.equal(collectNodes(doc, "bulletList").length, 1);
  assert.equal(collectNodes(doc, "listItem").length, 3);
  assert.equal(textOf(collectNodes(doc, "blockquote")[0]), "quote");
  assert.equal(collectNodes(doc, "codeBlock").length, 1);
  assert.equal(textOf(collectNodes(doc, "codeBlock")[0]), "const x = 1;");
});

test("unsafe-only HTML falls back to plain text without injecting markup", (t) => {
  const harness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Start" }],
      },
    ],
  });
  t.after(() => harness.destroy());

  const { editor } = harness;
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);

  const unsafeHtml = '<script>alert("xss")</script><img src="javascript:alert(1)">';
  assert.equal(clipboard.sanitizeClipboardHtml(unsafeHtml), "");

  dispatchPaste(editor, {
    html: unsafeHtml,
    text: "Fallback <text> & more",
  });

  const doc = asJson(editor.getJSON());
  const allText = textOf(doc);
  assert.match(allText, /Fallback <text> & more/);
  assert.equal(
    collectNodes(doc, "paragraph").filter(
      (node) => textOf(node) === "Fallback <text> & more",
    ).length,
    1,
  );
  assert.equal(collectNodes(doc, "image").length, 0);
  assert.equal(collectNodes(doc, "script").length, 0);
});

test("internal inline and block slice markers are respected", (t) => {
  const inlineHarness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      },
    ],
  });
  t.after(() => inlineHarness.destroy());

  inlineHarness.editor.commands.setTextSelection(7);
  dispatchPaste(inlineHarness.editor, {
    html: '<p data-pm-slice="1 1 []">there </p>',
    text: "there ",
  });

  const inlineDoc = asJson(inlineHarness.editor.getJSON());
  assert.equal(collectNodes(inlineDoc, "paragraph").length, 1);
  assert.equal(textOf(inlineDoc), "Hello there world");

  const blockHarness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "First" }],
      },
    ],
  });
  t.after(() => blockHarness.destroy());

  blockHarness.editor.commands.setTextSelection(
    blockHarness.editor.state.doc.content.size - 1,
  );
  dispatchPaste(blockHarness.editor, {
    html: '<p data-pm-slice="0 0 []">Second</p>',
    text: "Second",
  });

  const blockDoc = asJson(blockHarness.editor.getJSON());
  const blockParagraphs = collectNodes(blockDoc, "paragraph");
  assert.equal(textOf(blockParagraphs[0]), "First");
  assert.equal(textOf(blockParagraphs[1]), "Second");
});

test("Notion class-based blocks and monospace inline code are preserved", (t) => {
  const harness = createTestEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Start" }],
      },
    ],
  });
  t.after(() => harness.destroy());

  const { editor } = harness;
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);

  dispatchPaste(editor, {
    html: `
      <div class="notion-selectable notion-header-block">
        <div placeholder="Heading 1">Notion heading</div>
      </div>
      <div class="notion-selectable notion-sub_header-block">
        <div placeholder="Heading 2">Notion subheading</div>
      </div>
      <div class="notion-selectable notion-quote-block">
        <div placeholder="Quote">Quoted <em>text</em></div>
      </div>
      <div class="notion-selectable notion-code-block">
        <div>const x = 1;</div>
        <div>const y = 2;</div>
      </div>
      <div class="notion-selectable notion-divider-block"></div>
      <div class="notion-selectable notion-image-block">
        <img src="https://example.com/photo.png" alt="Photo">
        <div class="notranslate">A caption</div>
      </div>
      <div class="notion-text-block">
        <span style="font-family: 'SFMono-Regular', Consolas, monospace">inline code</span>
      </div>
    `,
    text: "plain fallback",
  });

  const doc = asJson(editor.getJSON());
  const headings = collectNodes(doc, "heading");
  assert.deepEqual(
    headings.map((heading) => heading.attrs?.level),
    [1, 2],
  );
  assert.equal(textOf(headings[0]), "Notion heading");
  assert.equal(textOf(headings[1]), "Notion subheading");
  assert.equal(textOf(collectNodes(doc, "blockquote")[0]), "Quoted text");
  assert.equal(
    textOf(collectNodes(doc, "codeBlock")[0]),
    "const x = 1;\nconst y = 2;",
  );
  assert.equal(collectNodes(doc, "horizontalRule").length, 1);
  assert.equal(collectNodes(doc, "image")[0].attrs?.caption, "A caption");
  assert.equal(markFor(doc, "inline code", "code")?.type, "code");
});

test("editor-specific equation and video blocks survive copy/paste HTML", () => {
  const sanitized = clipboard.sanitizeClipboardHtml(`
    <div data-type="equation" data-latex="E = mc^2" data-display="true">$$ E = mc^2 $$</div>
    <span data-type="inline-equation" data-latex="a + b">\\(a + b\\)</span>
    <div data-type="video-embed" data-src="https://www.youtube.com/embed/abc" data-title="Video">[Video]</div>
    <div data-type="video-embed" data-src="javascript:alert(1)">[Bad video]</div>
  `);

  assert.match(
    sanitized,
    /<div data-type="equation" data-latex="E = mc\^2" data-display="true">/,
  );
  assert.match(
    sanitized,
    /<span data-type="inline-equation" data-latex="a \+ b">/,
  );
  assert.match(
    sanitized,
    /<div data-type="video-embed" data-src="https:\/\/www\.youtube\.com\/embed\/abc" data-title="Video">/,
  );
  assert.doesNotMatch(sanitized, /javascript:/);
});
