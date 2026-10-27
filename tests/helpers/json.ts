export interface JsonMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
  marks?: JsonMark[];
}

export function collectNodes(node: JsonNode, type: string): JsonNode[] {
  const result: JsonNode[] = [];
  if (node.type === type) result.push(node);
  for (const child of node.content ?? []) {
    result.push(...collectNodes(child, type));
  }
  return result;
}

export function textOf(node: JsonNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(textOf).join("");
}

export function findText(doc: JsonNode, value: string): JsonNode | undefined {
  return collectNodes(doc, "text").find((node) => node.text === value);
}

export function markFor(
  doc: JsonNode,
  text: string,
  markType: string,
): JsonMark | undefined {
  return findText(doc, text)?.marks?.find((mark) => mark.type === markType);
}
