"use client";

import { useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import { Check, Copy, Terminal } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  filename?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  showLineNumbers = true,
  filename,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || "text").toLowerCase().replace(/[^a-z0-9]/g, "");

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[cleanLang] || Prism.languages.javascript || Prism.languages.markup;
    try {
      return Prism.highlight(code || "", grammar, cleanLang);
    } catch {
      return code || "";
    }
  }, [code, cleanLang]);

  const lines = useMemo(() => {
    return (code || "").split("\n");
  }, [code]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="journal-code-wrapper">
      <div className="journal-code-header">
        <div className="journal-code-meta">
          <Terminal size={13} className="journal-code-icon" />
          <span className="journal-code-lang">{filename || cleanLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="journal-code-copy-btn"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check size={13} className="text-lime" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="journal-code-body">
        {showLineNumbers && lines.length > 1 && (
          <div className="journal-code-linenums" aria-hidden="true">
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}
        <pre className="journal-code-pre">
          <code
            className={`language-${cleanLang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}
