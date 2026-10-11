import katex from "katex";

const OUTER_DELIMITERS = [
  { open: "$$", close: "$$" },
  { open: "\\[", close: "\\]" },
  { open: "\\(", close: "\\)" },
  { open: "$", close: "$" },
] as const;

function hasMathDelimiter(expression: string): boolean {
  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];

    if (character === "\\") {
      const next = expression[index + 1];
      if (next === "(" || next === ")" || next === "[" || next === "]") {
        return true;
      }
      if (next) index += 1;
      continue;
    }

    if (character === "$") return true;
  }

  return false;
}

export function normalizeMathInput(input: string): string {
  let expression = input.trim();
  if (!expression) throw new Error("Please enter a LaTeX expression.");

  const delimiter = OUTER_DELIMITERS.find(({ open }) => expression.startsWith(open));
  if (delimiter) {
    if (!expression.endsWith(delimiter.close) || expression.length <= delimiter.open.length + delimiter.close.length) {
      throw new Error("Math delimiters must be balanced around the whole expression.");
    }

    expression = expression
      .slice(delimiter.open.length, -delimiter.close.length)
      .trim();
  } else if (
    OUTER_DELIMITERS.some(({ close }) => expression.endsWith(close))
  ) {
    throw new Error("Math delimiters must be balanced around the whole expression.");
  }

  if (!expression) throw new Error("Please enter a LaTeX expression.");
  if (hasMathDelimiter(expression)) {
    throw new Error("Remove nested math delimiters; enter only one outer delimiter pair.");
  }

  return expression;
}

export function renderMath(input: string, displayMode: boolean): string {
  const expression = normalizeMathInput(input);
  return katex.renderToString(expression, {
    displayMode,
    throwOnError: true,
    errorColor: "var(--coral, #B85741)",
    strict: false,
  });
}
