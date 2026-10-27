import { JSDOM } from "jsdom";

const dom = new JSDOM(
  '<!doctype html><html><body><div id="editor"></div></body></html>',
  { url: "http://localhost" },
);

function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

defineGlobal("window", dom.window);
defineGlobal("document", dom.window.document);
defineGlobal("navigator", dom.window.navigator);
defineGlobal("DOMParser", dom.window.DOMParser);
defineGlobal("Node", dom.window.Node);
defineGlobal("Element", dom.window.Element);
defineGlobal("HTMLElement", dom.window.HTMLElement);
defineGlobal("HTMLDocument", dom.window.HTMLDocument);
defineGlobal("HTMLCollection", dom.window.HTMLCollection);
defineGlobal("NodeList", dom.window.NodeList);
defineGlobal("DocumentFragment", dom.window.DocumentFragment);
defineGlobal("Text", dom.window.Text);
defineGlobal("Comment", dom.window.Comment);
defineGlobal("Event", dom.window.Event);
defineGlobal("ClipboardEvent", dom.window.ClipboardEvent);
defineGlobal("KeyboardEvent", dom.window.KeyboardEvent);
defineGlobal("MouseEvent", dom.window.MouseEvent);
defineGlobal("MutationObserver", dom.window.MutationObserver);
defineGlobal("DOMRect", dom.window.DOMRect);
defineGlobal(
  "getSelection",
  dom.window.getSelection.bind(dom.window) as typeof getSelection,
);
defineGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) =>
  setTimeout(callback, 0)) as typeof requestAnimationFrame);
defineGlobal("cancelAnimationFrame", ((handle: number) =>
  clearTimeout(handle)) as typeof cancelAnimationFrame);

export const domWindow = dom.window;
export const testDocument = dom.window.document;
