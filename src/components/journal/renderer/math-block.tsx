"use client";

import { useMemo, useState } from "react";
import katex from "katex";
import { Check, Copy, Sigma, AlertCircle } from "lucide-react";

interface MathBlockProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathBlock({ latex, displayMode = true, className = "" }: MathBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const { html, error } = useMemo(() => {
    if (!latex || !latex.trim()) {
      return { html: "", error: "Empty equation" };
    }
    try {
      const rendered = katex.renderToString(latex.trim(), {
        displayMode,
        throwOnError: false,
        errorColor: "var(--coral, #B85741)",
        strict: false,
      });
      return { html: rendered, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid LaTeX expression";
      return { html: "", error: msg };
    }
  }, [latex, displayMode]);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  if (error) {
    return (
      <div className={`journal-math-error ${displayMode ? "display" : "inline"}`}>
        <AlertCircle size={14} />
        <span>{error}</span>
        <code>{latex}</code>
      </div>
    );
  }

  if (!displayMode) {
    return (
      <span
        className={`journal-math-inline ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <figure className={`journal-math-block ${className}`} tabIndex={0}>
      <div className="journal-math-header">
        <span className="journal-math-badge">
          <Sigma size={12} /> KaTeX
        </span>
        <div className="journal-math-actions">
          <button
            type="button"
            className="journal-math-btn"
            onClick={() => setShowSource((v) => !v)}
            title="Toggle LaTeX source"
          >
            {showSource ? "Hide source" : "LaTeX"}
          </button>
          <button
            type="button"
            className="journal-math-btn"
            onClick={handleCopy}
            title="Copy LaTeX formula"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div
        className="journal-math-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {showSource && (
        <pre className="journal-math-source">
          <code>{latex}</code>
        </pre>
      )}
    </figure>
  );
}
