import { Extension, Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import {
  BlockEquationNodeView,
  EditableCodeBlockNodeView,
  EditableImageNodeView,
  InlineEquationNodeView,
} from "./block-node-views";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

export const EquationExtension = Node.create({
  name: "equation",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: "E = mc^2",
      },
      displayMode: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="equation"]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            latex: el.getAttribute("data-latex") || "",
            displayMode: el.getAttribute("data-display") !== "false",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "equation",
        "data-latex": HTMLAttributes.latex,
        "data-display": String(HTMLAttributes.displayMode),
        class: "journal-editor-equation-node",
      }),
      `$$ ${HTMLAttributes.latex} $$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockEquationNodeView);
  },
});

export const InlineEquationExtension = Node.create({
  name: "inlineEquation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "E = mc^2",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-equation"]',
        getAttrs: (element) => ({
          latex: (element as HTMLElement).getAttribute("data-latex") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-equation",
        "data-latex": HTMLAttributes.latex,
        class: "journal-editor-equation-node journal-editor-inline-equation-node",
      }),
      `\\(${HTMLAttributes.latex}\\)`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineEquationNodeView);
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\\\(([\s\S]+)\\\)$/,
        type: this.type,
        getAttributes: (match) => ({ latex: match[1] }),
      }),
    ];
  },
});

const PRISM_LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  css: "css",
  html: "markup",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  markup: "markup",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  ts: "typescript",
  typescript: "typescript",
};

function codeLanguage(language: unknown): string {
  return PRISM_LANGUAGE_ALIASES[String(language || "").toLowerCase()] || "plain";
}

function addTokenDecorations(
  tokens: Array<string | Prism.Token>,
  position: number,
  decorations: Decoration[],
  parents: string[] = [],
): number {
  let offset = position;

  for (const token of tokens) {
    if (typeof token === "string") {
      offset += token.length;
      continue;
    }

    if (typeof token.content === "string") {
      const end = offset + token.content.length;
      if (end > offset) {
        decorations.push(
          Decoration.inline(offset, end, {
            class: `token ${[...parents, token.type].join(" ")}`,
          }),
        );
      }
      offset = end;
      continue;
    }

    if (Array.isArray(token.content)) {
      offset = addTokenDecorations(token.content, offset, decorations, [...parents, token.type]);
    }
  }

  return offset;
}

const CodeHighlighting = Extension.create({
  name: "codeHighlighting",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, position) => {
              if (node.type.name !== "codeBlock") return;
              const language = codeLanguage(node.attrs.language);
              const grammar = Prism.languages[language];
              if (!grammar) return;

              addTokenDecorations(
                Prism.tokenize(node.textContent, grammar),
                position + 1,
                decorations,
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

const EditableCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EditableCodeBlockNodeView);
  },
});

const EditableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: ({ caption }) => caption ? { "data-caption": caption } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditableImageNodeView);
  },
});

const TEXT_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

function parseTextAlign(element: HTMLElement): string | null {
  const styleAlign = element.style.textAlign?.toLowerCase();
  const attributeAlign = (
    element.getAttribute("data-text-align") ||
    element.getAttribute("align") ||
    ""
  ).toLowerCase();
  const value = styleAlign || attributeAlign;
  return TEXT_ALIGNMENTS.has(value) ? value : null;
}

export const TextAlignExtension = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => parseTextAlign(element as HTMLElement),
            renderHTML: (attributes) =>
              attributes.textAlign ? { style: `text-align: ${attributes.textAlign}` } : {},
          },
        },
      },
    ];
  },
});

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
      },
      title: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-type="callout"]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            variant: el.getAttribute("data-variant") || "info",
            title: el.getAttribute("data-title") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        "data-variant": HTMLAttributes.variant,
        "data-title": HTMLAttributes.title || "",
        class: `journal-editor-callout-node journal-callout journal-callout-${HTMLAttributes.variant}`,
      }),
      0,
    ];
  },
});

export const DetailsExtension = Node.create({
  name: "details",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: "Click to expand details",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'details[data-type="details"]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            summary: el.getAttribute("data-summary") || "Click to expand details",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-type": "details",
        "data-summary": HTMLAttributes.summary,
        class: "journal-editor-details-node",
      }),
      ["summary", {}, HTMLAttributes.summary],
      ["div", { class: "journal-details-body" }, 0],
    ];
  },
});

export const VideoEmbedExtension = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: "",
      },
      title: {
        default: "Video Embed",
      },
      caption: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-embed"]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            src: el.getAttribute("data-src") || "",
            title: el.getAttribute("data-title") || "",
            caption: el.getAttribute("data-caption") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "video-embed",
        "data-src": HTMLAttributes.src,
        "data-title": HTMLAttributes.title,
        "data-caption": HTMLAttributes.caption,
        class: "journal-editor-video-node",
      }),
      `[Video: ${HTMLAttributes.src}]`,
    ];
  },
});

export function getEditorExtensions(placeholder = "Write your story or press '/' for commands...") {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      codeBlock: false,
      link: false,
      underline: false,
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
    Underline,
    TextAlignExtension,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "journal-link",
      },
    }),
    EditableImage.configure({
      HTMLAttributes: {
        class: "journal-media-img",
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "journal-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    EditableCodeBlock.configure({
      defaultLanguage: "javascript",
      HTMLAttributes: { class: "journal-editor-code-node" },
    }),
    CodeHighlighting,
    EquationExtension,
    InlineEquationExtension,
    CalloutExtension,
    DetailsExtension,
    VideoEmbedExtension,
  ];
}
