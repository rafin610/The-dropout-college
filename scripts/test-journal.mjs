import assert from "node:assert/strict";
import katex from "katex";
import Prism from "prismjs";
import { slugify, extractTextFromDoc, calculateReadingTime, articleSchema } from "../src/server/journal/validation.js";
import { extractTocFromDoc } from "../src/components/journal/renderer/table-of-contents.js";

console.log("🧪 Running The DropOut Journal Test Suite...\n");

// 1. Slugify tests
console.log("1. Testing slugify...");
assert.equal(slugify("Hello World"), "hello-world");
assert.equal(slugify("How to become a Philomath?!"), "how-to-become-a-philomath");
assert.equal(slugify("AI for Beginners 2026"), "ai-for-beginners-2026");
assert.equal(slugify("   Leading & Trailing   "), "leading-trailing");
console.log("   ✅ slugify tests passed");

// 2. extractTextFromDoc and calculateReadingTime
console.log("2. Testing extractTextFromDoc and calculateReadingTime...");
const sampleDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Introduction to Artificial Intelligence" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Machine learning models optimize parameters using gradient descent." },
      ],
    },
    {
      type: "equation",
      attrs: { latex: "L(\\theta) = \\frac{1}{N} \\sum_{i=1}^N (y_i - \\hat{y}_i)^2" },
    },
    {
      type: "callout",
      attrs: { variant: "tip", title: "Key Insight" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Always normalize your training data." }] },
      ],
    },
  ],
};

const extracted = extractTextFromDoc(sampleDoc);
assert(extracted.includes("Introduction to Artificial Intelligence"));
assert(extracted.includes("Machine learning models optimize parameters"));
assert(extracted.includes("gradient descent"));
console.log("   Extracted text:", extracted.slice(0, 80) + "...");
const readingTime = calculateReadingTime(sampleDoc);
assert.equal(typeof readingTime, "number");
assert(readingTime >= 1);
console.log(`   Estimated reading time: ${readingTime} min`);
console.log("   ✅ Document text extraction & reading time tests passed");

// 3. Table of Contents Extraction
console.log("3. Testing Table of Contents extraction...");
const tocDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Foundations" }] },
    { type: "paragraph", content: [{ type: "text", text: "Body text" }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Mathematical Formulation" }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Proof of Convergence" }] },
  ],
};
const toc = extractTocFromDoc(tocDoc);
assert.equal(toc.length, 3);
assert.equal(toc[0].text, "Foundations");
assert.equal(toc[0].level, 1);
assert.equal(toc[1].text, "Mathematical Formulation");
assert.equal(toc[1].level, 2);
assert.equal(toc[2].text, "Proof of Convergence");
assert.equal(toc[2].level, 3);
console.log("   TOC items:", toc.map((t) => `${"#".repeat(t.level)} ${t.text}`).join(", "));
console.log("   ✅ Table of contents extraction passed");

// 4. KaTeX Math Verification
console.log("4. Testing KaTeX mathematical equation compilation...");
const equations = [
  "E = mc^2",
  "e^{i\\pi} + 1 = 0",
  "\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}",
  "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
  "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
  "\\sum_{k=1}^n k = \\frac{n(n+1)}{2}",
];

for (const eq of equations) {
  const renderedDisplay = katex.renderToString(eq, { displayMode: true, throwOnError: true });
  assert(renderedDisplay.includes("katex-display"));
  const renderedInline = katex.renderToString(eq, { displayMode: false, throwOnError: true });
  assert(renderedInline.includes("katex"));
}
console.log(`   Rendered ${equations.length} complex LaTeX formulas successfully`);
console.log("   ✅ KaTeX rendering passed");

// 5. Prism Syntax Highlighting
console.log("5. Testing Prism syntax highlighting...");
const jsCode = "const add = (a: number, b: number): number => a + b;";
const highlighted = Prism.highlight(jsCode, Prism.languages.javascript, "javascript");
assert(highlighted.includes("token"));
console.log("   ✅ Prism syntax highlighting passed");

// 6. Article Schema Validation
console.log("6. Testing Article schema validation...");
const validArticle = {
  title: "Building Modern Neural Networks",
  slug: "building-modern-neural-networks",
  excerpt: "An exploration of modern deep architectures.",
  content: { type: "doc", content: [] },
  status: "published",
  tags: ["AI", "DeepLearning"],
};
const parsedValid = articleSchema.safeParse(validArticle);
assert(parsedValid.success, "Valid article should pass schema validation");

// Invalid title (too short)
const invalidArticle = {
  title: "ab",
  content: { type: "doc" },
};
const parsedInvalid = articleSchema.safeParse(invalidArticle);
assert(!parsedInvalid.success, "Short title should fail validation");
console.log("   ✅ Schema validation passed");

console.log("\n🎉 All 6 DropOut Journal Test Suites Passed Successfully!\n");
