"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Sigma, AlertCircle } from "lucide-react";
import { normalizeMathInput, renderMath } from "../math";

interface MathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string, displayMode: boolean) => void;
  initialLatex?: string;
  initialDisplayMode?: boolean;
  allowDisplayModeChange?: boolean;
}

const MATH_SNIPPETS = [
  { label: "Fraction", latex: "\\frac{a}{b}" },
  { label: "Power", latex: "x^{2}" },
  { label: "Subscript", latex: "x_{i}" },
  { label: "Square Root", latex: "\\sqrt{x}" },
  { label: "N-th Root", latex: "\\sqrt[n]{x}" },
  { label: "Summation", latex: "\\sum_{i=1}^{n} x_i" },
  { label: "Integral", latex: "\\int_{a}^{b} f(x) \\, dx" },
  { label: "Limit", latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1" },
  { label: "Greek: α β π θ", latex: "\\alpha, \\beta, \\pi, \\theta, \\lambda" },
  { label: "Matrix 2x2", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Piecewise", latex: "f(x) = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}" },
  { label: "Einstein Energy", latex: "E = mc^2" },
  { label: "Euler's Identity", latex: "e^{i\\pi} + 1 = 0" },
  { label: "Gaussian Integral", latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}" },
];

export function MathModal({
  isOpen,
  onClose,
  onInsert,
  initialLatex = "E = mc^2",
  initialDisplayMode = true,
  allowDisplayModeChange = true,
}: MathModalProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [displayMode, setDisplayMode] = useState(initialDisplayMode);

  const { html, error } = useMemo(() => {
    try {
      return { html: renderMath(latex, displayMode), error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid LaTeX syntax";
      return { html: "", error: msg };
    }
  }, [latex, displayMode]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  function handleInsert() {
    if (!latex.trim() || error) return;
    onInsert(normalizeMathInput(latex), displayMode);
    onClose();
  }

  function handleSnippetClick(snippet: string) {
    setLatex(snippet);
  }

  return createPortal(
    <div className="journal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="journal-modal-card journal-math-modal" onClick={(e) => e.stopPropagation()}>
        <div className="journal-modal-header">
          <div className="journal-modal-title">
            <Sigma size={18} className="text-accent" />
            <span>Mathematical Equation (KaTeX)</span>
          </div>
          <button type="button" className="journal-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="journal-modal-body">
          <div className="journal-form-group">
            <label className="journal-form-label">LaTeX Formula</label>
            <textarea
              className="journal-latex-input"
              aria-label="LaTeX formula"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="e.g. \\int_{0}^{\\infty} e^{-x} \\, dx = 1"
              rows={3}
              autoFocus
            />
          </div>

          <div className="journal-math-snippets">
            <span className="journal-snippets-label">Templates:</span>
            <div className="journal-snippets-list">
              {MATH_SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="journal-snippet-chip"
                  onClick={() => handleSnippetClick(s.latex)}
                  title={s.latex}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="journal-math-preview-box">
            <div className="journal-preview-label">Live Equation Preview</div>
            <div className={`journal-preview-canvas ${displayMode ? "is-display" : "is-inline"}`}>
              {error ? (
                <div className="journal-preview-error" role="status" aria-live="polite">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          </div>

          <div className="journal-form-row">
            <label className="journal-checkbox-label">
              <input
                type="checkbox"
                checked={displayMode}
                onChange={(e) => setDisplayMode(e.target.checked)}
                disabled={!allowDisplayModeChange}
              />
              <span>Display block equation (centered on its own line)</span>
            </label>
          </div>
        </div>

        <div className="journal-modal-footer">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleInsert}
            disabled={Boolean(error) || !latex.trim()}
          >
            Insert Equation
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
