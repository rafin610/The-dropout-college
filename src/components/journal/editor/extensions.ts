import { Node, mergeAttributes } from "@tiptap/core";
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
});

export const InlineEquationExtension = Node.create({
  name: "inlineEquation",
  group: "inline",
  inline: true,
  atom: true,

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
        class: `journal-editor-callout-node journal-callout-${HTMLAttributes.variant}`,
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
      codeBlock: {
        HTMLAttributes: {
          class: "journal-editor-code-node",
        },
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "journal-link",
      },
    }),
    Image.configure({
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
    EquationExtension,
    InlineEquationExtension,
    CalloutExtension,
    DetailsExtension,
    VideoEmbedExtension,
  ];
}
