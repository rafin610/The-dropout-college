import "./dom";

import { createRequire } from "node:module";
import { domWindow, testDocument } from "./dom";
import type { Editor, JSONContent } from "@tiptap/core";

const require = createRequire(import.meta.url);

const tiptap = require("@tiptap/core") as typeof import("@tiptap/core");
const extensionsModule = require(
  "../../src/components/journal/editor/extensions.ts",
) as typeof import("../../src/components/journal/editor/extensions");
const clipboardModule = require(
  "../../src/components/journal/editor/clipboard.ts",
) as typeof import("../../src/components/journal/editor/clipboard");

export interface TestEditor {
  editor: Editor;
  element: HTMLDivElement;
  destroy(): void;
}

export function createTestEditor(content?: JSONContent): TestEditor {
  const element = testDocument.createElement("div");
  testDocument.body.appendChild(element);

  const editor = new tiptap.Editor({
    element,
    extensions: extensionsModule.getEditorExtensions(),
    editorProps: clipboardModule.journalClipboardEditorProps,
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
  });

  return {
    editor,
    element,
    destroy() {
      editor.destroy();
      element.remove();
    },
  };
}

export interface PastePayload {
  html?: string;
  text?: string;
}

/**
 * Dispatches a real paste event through ProseMirror's DOM handler. jsdom's
 * ClipboardEvent does not expose a constructible clipboardData object, so the
 * payload is installed on the event before dispatch.
 */
export function dispatchPaste(editor: Editor, payload: PastePayload): Event {
  const html = payload.html ?? "";
  const text = payload.text ?? "";
  const event = new domWindow.Event("paste", {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: {
      getData: (type: string) => {
        if (type === "text/html") return html;
        if (type === "text/plain" || type === "Text") return text;
        return "";
      },
      types: [
        ...(html ? ["text/html"] : []),
        ...(text ? ["text/plain"] : []),
      ],
    },
  });

  editor.view.dom.dispatchEvent(event);
  return event as unknown as Event;
}
