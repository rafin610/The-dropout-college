import type { EditorProps } from "@tiptap/pm/view";
import { isSafeTextAlign, sanitizeHref, sanitizeMediaUrl } from "@/lib/journal/urls";

const MAX_CLIPBOARD_HTML_LENGTH = 5_000_000;

const DROP_WITH_CONTENT = new Set([
  "audio",
  "base",
  "button",
  "canvas",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "map",
  "math",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "source",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
  "track",
  "video",
]);

const INLINE_SOURCE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "cite",
  "code",
  "del",
  "em",
  "font",
  "i",
  "img",
  "ins",
  "kbd",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "time",
  "tt",
  "u",
]);

const SANITIZED_BLOCK_TAGS = new Set([
  "aside",
  "blockquote",
  "details",
  "h1",
  "h2",
  "h3",
  "hr",
  "img",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

const TOP_LEVEL_BLOCK_TAGS = new Set([
  "aside",
  "blockquote",
  "details",
  "div",
  "figure",
  "h1",
  "h2",
  "h3",
  "hr",
  "img",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

const CALLOUT_VARIANTS = [
  "important",
  "warning",
  "success",
  "definition",
  "example",
  "info",
  "tip",
] as const;

interface WalkContext {
  dropWhitespace: boolean;
  allowBlocks: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tagNameOf(node: Node): string {
  return node.nodeType === 1 ? (node as Element).tagName.toLowerCase() : "";
}

function hasClassToken(element: Element, token: string): boolean {
  return (element.getAttribute("class") || "")
    .split(/\s+/)
    .some((className) => className === token);
}

function notionContentRoot(element: Element): Element {
  return element.querySelector("[placeholder]") || element;
}

function getStyleValue(element: Element, property: string): string {
  const inlineStyle = (element as HTMLElement).style;
  if (inlineStyle && typeof inlineStyle.getPropertyValue === "function") {
    const value = inlineStyle.getPropertyValue(property);
    if (value) return value;
  }
  const raw = element.getAttribute("style") || "";
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i").exec(raw);
  return match ? match[1].trim() : "";
}

function getAlignment(element: Element): string | null {
  const value = (
    getStyleValue(element, "text-align") ||
    element.getAttribute("align") ||
    element.getAttribute("data-text-align") ||
    ""
  ).toLowerCase();
  return isSafeTextAlign(value) ? value : null;
}

function hasBlockChild(element: Element): boolean {
  return Array.from(element.children).some((child) => {
    const tag = child.tagName.toLowerCase();
    return !INLINE_SOURCE_TAGS.has(tag) && !DROP_WITH_CONTENT.has(tag);
  });
}

function getInlineMarks(element: Element): string[] {
  const tag = element.tagName.toLowerCase();
  const marks: string[] = [];
  const add = (mark: string) => {
    if (!marks.includes(mark)) marks.push(mark);
  };

  if (tag === "strong" || tag === "b") add("strong");
  if (tag === "em" || tag === "i") add("em");
  if (tag === "u" || tag === "ins") add("u");
  if (tag === "s" || tag === "del" || tag === "strike") add("s");
  if (tag === "code" || tag === "kbd" || tag === "samp" || tag === "tt") add("code");

  const weight = getStyleValue(element, "font-weight").toLowerCase();
  if (weight === "bold" || weight === "bolder") add("strong");
  if (/^\d+$/.test(weight) && Number(weight) >= 600) add("strong");

  const fontStyle = getStyleValue(element, "font-style").toLowerCase();
  if (fontStyle === "italic" || fontStyle === "oblique") add("em");

  const fontFamily = getStyleValue(element, "font-family").toLowerCase();
  if (
    /(monospace|mono|consolas|menlo|courier|sfmono)/.test(fontFamily)
  ) {
    add("code");
  }

  const decoration = `${getStyleValue(element, "text-decoration")} ${getStyleValue(element, "text-decoration-line")}`.toLowerCase();
  if (decoration.includes("underline")) add("u");
  if (decoration.includes("line-through")) add("s");

  return marks;
}

function wrapWithMarks(nodes: Node[], marks: string[], doc: Document): Node[] {
  let wrapped = nodes;
  for (const mark of marks) {
    const element = doc.createElement(mark);
    for (const node of wrapped) element.appendChild(node);
    wrapped = [element];
  }
  return wrapped;
}

function appendTextNode(source: Node, target: Node, doc: Document, context: WalkContext): void {
  const text = source.nodeValue || "";
  if (!text) return;

  if (/^\s+$/.test(text)) {
    if (context.dropWhitespace) return;
    target.appendChild(doc.createTextNode(" "));
    return;
  }

  target.appendChild(doc.createTextNode(text));
}

function createParagraph(doc: Document, source?: Element): HTMLParagraphElement {
  const paragraph = doc.createElement("p");
  const alignment = source ? getAlignment(source) : null;
  if (alignment) paragraph.setAttribute("style", `text-align: ${alignment}`);
  return paragraph;
}

function ensureBlockContent(container: Element, doc: Document): void {
  const hasBlock = Array.from(container.children).some((child) =>
    SANITIZED_BLOCK_TAGS.has(child.tagName.toLowerCase()),
  );
  if (hasBlock) return;

  if (!container.hasChildNodes()) {
    container.appendChild(doc.createElement("p"));
    return;
  }

  const paragraph = doc.createElement("p");
  while (container.firstChild) paragraph.appendChild(container.firstChild);
  container.appendChild(paragraph);
}

function ensureListItemContent(listItem: Element, doc: Document): void {
  const firstChild = listItem.firstElementChild;
  if (firstChild && firstChild.tagName.toLowerCase() === "p") return;

  const paragraph = doc.createElement("p");
  while (listItem.firstChild && !SANITIZED_BLOCK_TAGS.has(tagNameOf(listItem.firstChild))) {
    paragraph.appendChild(listItem.firstChild);
  }
  if (paragraph.hasChildNodes() || !listItem.hasChildNodes()) {
    listItem.insertBefore(paragraph, listItem.firstChild);
  } else {
    listItem.insertBefore(doc.createElement("p"), listItem.firstChild);
  }
}

function appendSanitizedChildren(
  sourceParent: Node,
  targetParent: Node,
  doc: Document,
  context: WalkContext,
): void {
  for (const child of Array.from(sourceParent.childNodes)) {
    if (child.nodeType === 3) {
      appendTextNode(child, targetParent, doc, context);
      continue;
    }
    if (child.nodeType !== 1) continue;

    const element = child as Element;
    const tag = element.tagName.toLowerCase();

    if (!context.allowBlocks && !INLINE_SOURCE_TAGS.has(tag) && !DROP_WITH_CONTENT.has(tag)) {
      appendSanitizedChildren(element, targetParent, doc, {
        dropWhitespace: false,
        allowBlocks: false,
      });
      continue;
    }

    appendElement(element, targetParent, doc, context);
  }
}

function appendImage(
  source: Element,
  target: Node,
  doc: Document,
  caption: string | null,
): void {
  const src = sanitizeMediaUrl(source.getAttribute("src"));
  if (!src) return;

  const image = doc.createElement("img");
  image.setAttribute("src", src);

  const alt = source.getAttribute("alt");
  if (alt) image.setAttribute("alt", alt);
  if (caption) image.setAttribute("data-caption", caption);

  target.appendChild(image);
}

function appendFigure(source: Element, target: Node, doc: Document): void {
  const image = source.querySelector("img");
  if (image) {
    const captionElement = Array.from(source.children).find(
      (child) => child.tagName.toLowerCase() === "figcaption",
    );
    const caption = captionElement?.textContent?.trim() || null;
    appendImage(image, target, doc, caption);
    return;
  }

  appendSanitizedChildren(source, target, doc, { dropWhitespace: true, allowBlocks: true });
}

function codeBlockText(source: Element, codeElement: Element | null): string {
  if (codeElement) {
    return (codeElement.textContent || "").replace(/\r\n?/g, "\n");
  }

  const collect = (node: Node): string => {
    if (node.nodeType === 3) {
      const value = node.nodeValue || "";
      // Pretty-printed HTML around Notion line blocks adds indented text nodes
      // between lines. Drop those without touching indentation inside a line.
      if (/^[\t \r\n]+$/.test(value) && /[\r\n]/.test(value)) return "";
      return value;
    }
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (tag === "br") return "\n";

    const text = Array.from(element.childNodes).map(collect).join("");
    if ((tag === "div" || tag === "p") && text && !text.endsWith("\n")) {
      return `${text}\n`;
    }
    return text;
  };

  return collect(source).replace(/\r\n?/g, "\n").replace(/\n$/, "");
}

function appendCodeBlock(source: Element, target: Node, doc: Document): void {
  const codeElement = source.querySelector("code");
  const languageSource = codeElement || source;
  const languageClass = Array.from(languageSource.classList)
    .find((className) => className.startsWith("language-"))
    ?.slice("language-".length);
  const language =
    (languageClass || source.getAttribute("data-language") || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9+#._-]/g, "")
      .slice(0, 40);

  const pre = doc.createElement("pre");
  const code = doc.createElement("code");
  if (language) code.className = `language-${language}`;
  code.textContent = codeBlockText(source, codeElement);
  pre.appendChild(code);
  target.appendChild(pre);
}

function appendTableRow(source: Element, target: Element, doc: Document): void {
  const row = doc.createElement("tr");

  for (const child of Array.from(source.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag !== "td" && tag !== "th") continue;

    const cell = doc.createElement(tag);
    const alignment = getAlignment(child);
    if (alignment) cell.setAttribute("style", `text-align: ${alignment}`);
    appendSanitizedChildren(child, cell, doc, {
      dropWhitespace: hasBlockChild(child),
      allowBlocks: true,
    });
    ensureBlockContent(cell, doc);
    row.appendChild(cell);
  }

  if (row.children.length > 0) target.appendChild(row);
}

function appendTable(source: Element, target: Node, doc: Document): void {
  const table = doc.createElement("table");

  for (const child of Array.from(source.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "tr") {
      appendTableRow(child, table, doc);
      continue;
    }
    if (tag !== "thead" && tag !== "tbody" && tag !== "tfoot") continue;

    const section = doc.createElement(tag);
    for (const row of Array.from(child.children)) {
      if (row.tagName.toLowerCase() === "tr") appendTableRow(row, section, doc);
    }
    if (section.children.length > 0) table.appendChild(section);
  }

  if (table.querySelector("tr")) target.appendChild(table);
}

function createListItem(source: Element, doc: Document): Element {
  const listItem = doc.createElement("li");
  appendSanitizedChildren(source, listItem, doc, {
    dropWhitespace: hasBlockChild(source),
    allowBlocks: true,
  });
  ensureListItemContent(listItem, doc);
  return listItem;
}

function appendList(source: Element, target: Node, doc: Document): void {
  const tag = source.tagName.toLowerCase();
  const list = doc.createElement(tag === "ol" ? "ol" : "ul");

  if (tag === "ol") {
    const start = Number(source.getAttribute("start"));
    if (Number.isFinite(start) && start > 0) list.setAttribute("start", String(Math.round(start)));
  }

  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === 3) continue;
    if (child.nodeType !== 1) continue;

    const element = child as Element;
    if (element.tagName.toLowerCase() === "li") {
      list.appendChild(createListItem(element, doc));
      continue;
    }

    const nestedItems = Array.from(element.children).filter(
      (nested) => nested.tagName.toLowerCase() === "li",
    );
    if (nestedItems.length > 0) {
      for (const nested of nestedItems) list.appendChild(createListItem(nested, doc));
      continue;
    }

    const listItem = doc.createElement("li");
    appendSanitizedChildren(element, listItem, doc, {
      dropWhitespace: false,
      allowBlocks: true,
    });
    ensureListItemContent(listItem, doc);
    list.appendChild(listItem);
  }

  if (list.children.length > 0) target.appendChild(list);
}

function detectCalloutVariant(source: Element): (typeof CALLOUT_VARIANTS)[number] {
  const explicit = (source.getAttribute("data-variant") || "").toLowerCase();
  if (CALLOUT_VARIANTS.includes(explicit as (typeof CALLOUT_VARIANTS)[number])) {
    return explicit as (typeof CALLOUT_VARIANTS)[number];
  }

  const className = typeof source.className === "string" ? source.className.toLowerCase() : "";
  for (const variant of CALLOUT_VARIANTS) {
    if (className.includes(`callout-${variant}`) || className.includes(`callout_${variant}`)) {
      return variant;
    }
  }

  return "info";
}

function appendCallout(source: Element, target: Node, doc: Document): void {
  const callout = doc.createElement("aside");
  callout.setAttribute("data-type", "callout");
  callout.setAttribute("data-variant", detectCalloutVariant(source));
  callout.setAttribute("data-title", source.getAttribute("data-title") || "");

  appendSanitizedChildren(source, callout, doc, {
    dropWhitespace: hasBlockChild(source),
    allowBlocks: true,
  });
  ensureBlockContent(callout, doc);
  target.appendChild(callout);
}

function appendDetails(source: Element, target: Node, doc: Document): void {
  const summaryElement = Array.from(source.children).find(
    (child) => child.tagName.toLowerCase() === "summary",
  );
  const summary =
    source.getAttribute("data-summary") ||
    summaryElement?.textContent?.trim() ||
    "Click to expand details";

  const details = doc.createElement("details");
  details.setAttribute("data-type", "details");
  details.setAttribute("data-summary", summary);

  const body = doc.createElement("div");
  const bodyContext: WalkContext = {
    dropWhitespace: true,
    allowBlocks: true,
  };

  for (const child of Array.from(source.childNodes)) {
    if (child === summaryElement) continue;
    if (child.nodeType === 3 && !child.nodeValue?.trim()) continue;
    if (child.nodeType === 1) {
      appendElement(child as Element, body, doc, bodyContext);
    } else if (child.nodeType === 3) {
      appendTextNode(child, body, doc, bodyContext);
    }
  }

  ensureBlockContent(body, doc);
  while (body.firstChild) details.appendChild(body.firstChild);
  target.appendChild(details);
}

function appendHeading(
  source: Element,
  target: Node,
  doc: Document,
  level: number,
): void {
  const heading = doc.createElement(`h${Math.min(3, Math.max(1, level))}`);
  appendSanitizedChildren(notionContentRoot(source), heading, doc, {
    dropWhitespace: false,
    allowBlocks: false,
  });
  target.appendChild(heading);
}

function appendQuoteBlock(source: Element, target: Node, doc: Document): void {
  const blockquote = doc.createElement("blockquote");
  appendSanitizedChildren(notionContentRoot(source), blockquote, doc, {
    dropWhitespace: true,
    allowBlocks: true,
  });
  ensureBlockContent(blockquote, doc);
  target.appendChild(blockquote);
}

function appendNotionImageBlock(source: Element, target: Node, doc: Document): void {
  const image = source.querySelector("img");
  if (!image) {
    appendSanitizedChildren(source, target, doc, {
      dropWhitespace: true,
      allowBlocks: true,
    });
    return;
  }

  const captionElement = source.querySelector("[data-caption], .notranslate");
  const caption =
    source.getAttribute("data-caption") ||
    captionElement?.textContent?.trim() ||
    null;
  appendImage(image, target, doc, caption);
}

function appendInlineElement(
  source: Element,
  target: Node,
  doc: Document,
  marks: string[],
): void {
  const container = doc.createElement("span");
  appendSanitizedChildren(source, container, doc, {
    dropWhitespace: false,
    allowBlocks: false,
  });

  const nodes = Array.from(container.childNodes);
  for (const node of wrapWithMarks(nodes, marks, doc)) target.appendChild(node);
}

function equationLatex(source: Element): string {
  const attribute = (source.getAttribute("data-latex") || "").trim();
  if (attribute) return attribute;

  return (source.textContent || "")
    .replace(/^\s*\\?\(?\$?\$?\s*/, "")
    .replace(/\s*\\?\)?\$?\$?\s*$/, "")
    .trim();
}

function appendEquation(source: Element, target: Node, doc: Document): void {
  const latex = equationLatex(source);
  if (!latex) return;

  const equation = doc.createElement("div");
  equation.setAttribute("data-type", "equation");
  equation.setAttribute("data-latex", latex);
  equation.setAttribute(
    "data-display",
    source.getAttribute("data-display") === "false" ? "false" : "true",
  );
  equation.textContent = `$$ ${latex} $$`;
  target.appendChild(equation);
}

function appendInlineEquation(source: Element, target: Node, doc: Document): void {
  const latex = equationLatex(source);
  if (!latex) return;

  const equation = doc.createElement("span");
  equation.setAttribute("data-type", "inline-equation");
  equation.setAttribute("data-latex", latex);
  equation.textContent = `\\(${latex}\\)`;
  target.appendChild(equation);
}

function appendVideoEmbed(source: Element, target: Node, doc: Document): void {
  const src = sanitizeMediaUrl(source.getAttribute("data-src"));
  if (!src) return;

  const video = doc.createElement("div");
  video.setAttribute("data-type", "video-embed");
  video.setAttribute("data-src", src);

  const title = source.getAttribute("data-title");
  if (title) video.setAttribute("data-title", title);

  const caption = source.getAttribute("data-caption");
  if (caption) video.setAttribute("data-caption", caption);

  video.textContent = `[Video: ${src}]`;
  target.appendChild(video);
}

function appendElement(
  source: Element,
  target: Node,
  doc: Document,
  context: WalkContext,
): void {
  const tag = source.tagName.toLowerCase();

  if (DROP_WITH_CONTENT.has(tag)) return;

  if (tag === "br") {
    target.appendChild(doc.createElement("br"));
    return;
  }

  if (tag === "hr") {
    target.appendChild(doc.createElement("hr"));
    return;
  }

  if (tag === "div" && source.getAttribute("data-type") === "equation") {
    appendEquation(source, target, doc);
    return;
  }

  if (tag === "div" && source.getAttribute("data-type") === "video-embed") {
    appendVideoEmbed(source, target, doc);
    return;
  }

  if (tag === "span" && source.getAttribute("data-type") === "inline-equation") {
    appendInlineEquation(source, target, doc);
    return;
  }

  if (tag === "img") {
    appendImage(source, target, doc, source.getAttribute("data-caption"));
    return;
  }

  if (tag === "pre") {
    appendCodeBlock(source, target, doc);
    return;
  }

  if (tag === "figure") {
    appendFigure(source, target, doc);
    return;
  }

  if (tag === "table") {
    appendTable(source, target, doc);
    return;
  }

  if (tag === "ul" || tag === "ol") {
    appendList(source, target, doc);
    return;
  }

  if (tag === "li") {
    target.appendChild(createListItem(source, doc));
    return;
  }

  if (tag === "details") {
    appendDetails(source, target, doc);
    return;
  }

  if (tag === "aside" || source.getAttribute("role") === "note") {
    appendCallout(source, target, doc);
    return;
  }

  if (tag === "summary") {
    const paragraph = createParagraph(doc);
    appendSanitizedChildren(source, paragraph, doc, {
      dropWhitespace: false,
      allowBlocks: false,
    });
    target.appendChild(paragraph);
    return;
  }

  if (tag === "p" || /^h[1-6]$/.test(tag)) {
    const targetTag = /^h[4-6]$/.test(tag) ? "h3" : tag;
    const element = doc.createElement(targetTag);
    const alignment = getAlignment(source);
    if (alignment) element.setAttribute("style", `text-align: ${alignment}`);
    appendSanitizedChildren(source, element, doc, {
      dropWhitespace: false,
      allowBlocks: false,
    });
    target.appendChild(element);
    return;
  }

  if (tag === "blockquote") {
    const blockquote = doc.createElement("blockquote");
    appendSanitizedChildren(source, blockquote, doc, {
      dropWhitespace: hasBlockChild(source),
      allowBlocks: true,
    });
    ensureBlockContent(blockquote, doc);
    target.appendChild(blockquote);
    return;
  }

  if (tag === "th" || tag === "td") {
    const cell = doc.createElement(tag);
    appendSanitizedChildren(source, cell, doc, {
      dropWhitespace: hasBlockChild(source),
      allowBlocks: true,
    });
    ensureBlockContent(cell, doc);
    target.appendChild(cell);
    return;
  }

  if (tag === "a") {
    const href = sanitizeHref(source.getAttribute("href"));
    if (!href) {
      appendSanitizedChildren(source, target, doc, {
        dropWhitespace: false,
        allowBlocks: false,
      });
      return;
    }

    const anchor = doc.createElement("a");
    anchor.setAttribute("href", href);
    const container = doc.createElement("span");
    appendSanitizedChildren(source, container, doc, {
      dropWhitespace: false,
      allowBlocks: false,
    });
    const marks = getInlineMarks(source);
    const nodes = marks.length > 0
      ? wrapWithMarks(Array.from(container.childNodes), marks, doc)
      : Array.from(container.childNodes);
    for (const node of nodes) anchor.appendChild(node);
    target.appendChild(anchor);
    return;
  }

  if (INLINE_SOURCE_TAGS.has(tag)) {
    const marks = getInlineMarks(source);
    if (marks.length === 0) {
      appendSanitizedChildren(source, target, doc, {
        dropWhitespace: false,
        allowBlocks: false,
      });
      return;
    }
    appendInlineElement(source, target, doc, marks);
    return;
  }

  if (tag === "div" || tag === "section" || tag === "article" || tag === "header" || tag === "footer" || tag === "main" || tag === "center" || tag === "address") {
    if (hasClassToken(source, "notion-code-block")) {
      appendCodeBlock(source, target, doc);
      return;
    }

    if (hasClassToken(source, "notion-quote-block")) {
      appendQuoteBlock(source, target, doc);
      return;
    }

    if (hasClassToken(source, "notion-header-block")) {
      appendHeading(source, target, doc, 1);
      return;
    }

    if (hasClassToken(source, "notion-sub_header-block")) {
      appendHeading(source, target, doc, 2);
      return;
    }

    if (hasClassToken(source, "notion-sub_sub_header-block")) {
      appendHeading(source, target, doc, 3);
      return;
    }

    if (hasClassToken(source, "notion-divider-block")) {
      target.appendChild(doc.createElement("hr"));
      return;
    }

    if (hasClassToken(source, "notion-image-block")) {
      appendNotionImageBlock(source, target, doc);
      return;
    }

    if (hasClassToken(source, "notion-callout-block")) {
      appendCallout(source, target, doc);
      return;
    }

    if (hasBlockChild(source)) {
      appendSanitizedChildren(source, target, doc, {
        dropWhitespace: true,
        allowBlocks: context.allowBlocks,
      });
      return;
    }

    const paragraph = createParagraph(doc, source);
    appendSanitizedChildren(source, paragraph, doc, {
      dropWhitespace: false,
      allowBlocks: false,
    });
    target.appendChild(paragraph);
    return;
  }

  if (tag === "figcaption") {
    const paragraph = createParagraph(doc, source);
    appendSanitizedChildren(source, paragraph, doc, {
      dropWhitespace: false,
      allowBlocks: false,
    });
    target.appendChild(paragraph);
    return;
  }

  // Unknown elements are unwrapped rather than reproduced. This keeps
  // arbitrary Notion wrappers from injecting unsupported markup.
  appendSanitizedChildren(source, target, doc, {
    dropWhitespace: hasBlockChild(source),
    allowBlocks: context.allowBlocks,
  });
}

function normalizeHtmlWhitespace(html: string): string {
  return html.trim();
}

/**
 * Sanitizes clipboard HTML into a small allowlisted subset that the journal
 * editor schema understands. The DOM is rebuilt from scratch, so unknown
 * elements, event handlers, scripts, and dangerous URLs cannot survive.
 */
export function sanitizeClipboardHtml(html: string): string {
  if (typeof html !== "string" || !html.trim()) return "";
  if (html.length > MAX_CLIPBOARD_HTML_LENGTH) return "";
  if (typeof document === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = html;

  const targetDocument = document.implementation.createHTMLDocument("");
  const root = targetDocument.createElement("div");

  appendSanitizedChildren(template.content, root, targetDocument, {
    dropWhitespace: true,
    allowBlocks: true,
  });

  return normalizeHtmlWhitespace(root.innerHTML);
}

/**
 * Converts `text/plain` clipboard data into structured HTML. This is used by
 * ProseMirror's native clipboard parser when no usable HTML is available.
 */
export function plainTextToClipboardHtml(text: string): string {
  if (typeof text !== "string" || !text.trim()) return "";

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(`<blockquote><p>${quote.map(escapeHtml).join("<br>")}</p></blockquote>`);
    quote = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push(
      `<${list.type}>${list.items
        .map((item) => `<li><p>${escapeHtml(item)}</p></li>`)
        .join("")}</${list.type}>`,
    );
    list = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const fence = /^\s*```([a-z0-9+#._-]*)\s*$/i.exec(line);
    if (fence) {
      flushAll();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      const language = fence[1].toLowerCase().replace(/[^a-z0-9+#._-]/g, "").slice(0, 40);
      blocks.push(
        `<pre><code${language ? ` class="language-${language}"` : ""}>${escapeHtml(
          codeLines.join("\n"),
        )}</code></pre>`,
      );
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^\s*(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      blocks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = /^\s*>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }

    const bullet = /^\s*(?:[-*•◦▪]|[☐☑])\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      flushQuote();
      const listType = bullet ? "ul" : "ol";
      if (list && list.type !== listType) flushList();
      if (!list) list = { type: listType, items: [] };
      list.items.push((bullet || ordered)?.[1] || "");
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushAll();
  return blocks.join("");
}

interface PasteSliceMarker {
  openStart: number;
  openEnd: number;
}

function readPasteSliceMarker(html: string): PasteSliceMarker | null {
  if (typeof document === "undefined") return null;

  const template = document.createElement("template");
  template.innerHTML = html;
  const marker = template.content.querySelector("[data-pm-slice]");
  if (!marker) return null;

  // ProseMirror writes `openStart openEnd [-wrappers] contextJSON`. Only the
  // open depths are useful after the DOM has been rebuilt by the sanitizer.
  const match = /^(\d{1,3}) (\d{1,3})(?:\s|$)/.exec(
    marker.getAttribute("data-pm-slice") || "",
  );
  if (!match) return null;

  return {
    openStart: Math.min(50, Number(match[1])),
    openEnd: Math.min(50, Number(match[2])),
  };
}

function firstTopLevelElement(html: string): Element | null {
  if (!html || typeof document === "undefined") return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild;
}

/**
 * ProseMirror treats a pasted leading textblock as "open", which makes the
 * first pasted paragraph merge into the paragraph at the cursor. Adding a
 * slice marker forces the block edges closed. The marker needs a trailing
 * context value because ProseMirror's parser requires one.
 */
function applyPasteSliceMarker(html: string, marker: PasteSliceMarker): string {
  if (!html || typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  const first = template.content.firstElementChild;
  if (!first) return html;

  first.setAttribute(
    "data-pm-slice",
    `${marker.openStart} ${marker.openEnd} []`,
  );
  return template.innerHTML;
}

/**
 * Shared editor props. Using ProseMirror's native clipboard pipeline means
 * pastes insert at the current selection and participate in undo/redo. There
 * is no competing `onPaste` command that could insert content twice.
 */
export const journalClipboardEditorProps: EditorProps = {
  transformPastedHTML(html) {
    const marker = readPasteSliceMarker(html);
    const sanitized = sanitizeClipboardHtml(html);
    if (!sanitized) return "";

    const first = firstTopLevelElement(sanitized);
    if (!first || !TOP_LEVEL_BLOCK_TAGS.has(first.tagName.toLowerCase())) {
      // Inline-only clipboard content should keep ProseMirror's natural inline
      // paste behavior instead of being turned into a new block.
      return sanitized;
    }

    return applyPasteSliceMarker(sanitized, marker ?? { openStart: 0, openEnd: 0 });
  },

  handlePaste(view, event, slice) {
    const clipboard = event.clipboardData;
    if (!clipboard) return false;

    const html = clipboard.getData("text/html");
    const text =
      clipboard.getData("text/plain") || clipboard.getData("Text") || "";
    if (!text.trim()) return false;

    // Let the native HTML pipeline handle usable HTML. Otherwise (plain-text
    // only, or HTML that sanitized down to nothing) rebuild a structured
    // document and paste it through the same native pipeline exactly once.
    if (html && slice.content.size > 0) return false;

    const fallbackHtml = plainTextToClipboardHtml(text);
    if (!fallbackHtml) return false;

    // Pass a synthetic paste event without clipboardData. ProseMirror re-runs
    // the paste handlers for this insertion, and a fresh event prevents this
    // handler from recursively taking over its own fallback.
    return view.pasteHTML(fallbackHtml, new Event("paste") as ClipboardEvent);
  },
};
