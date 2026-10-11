"use client";

import { useMemo, useState } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check, Copy, Image as ImageIcon, Sigma, Trash2 } from "lucide-react";
import { renderMath } from "../math";
import { MathModal } from "./math-modal";

const LANGUAGES = [
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["json", "JSON"],
  ["bash", "Bash"],
  ["sql", "SQL"],
  ["text", "Plain text"],
] as const;

function EquationNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const latex = String(node.attrs.latex || "");
  const displayMode = node.type.name === "equation";
  const { html, error } = useMemo(() => {
    try {
      return { html: renderMath(latex, displayMode), error: null };
    } catch (renderError) {
      return {
        html: "",
        error: renderError instanceof Error ? renderError.message : "Invalid LaTeX expression.",
      };
    }
  }, [latex, displayMode]);

  return (
    <NodeViewWrapper
      as={displayMode ? "div" : "span"}
      className={`journal-edit-equation ${displayMode ? "is-block" : "is-inline"}${selected ? " is-selected" : ""}`}
      contentEditable={false}
      data-drag-handle={displayMode ? "" : undefined}
    >
      <span
        className="journal-edit-equation-content"
        onClick={() => setIsEditing(true)}
        title="Click to edit equation"
      >
        {error ? (
          <span className="journal-edit-equation-error" role="status">
            Equation needs correction: {error}
          </span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </span>
      <span className="journal-edit-equation-actions">
        <button
          type="button"
          className="journal-edit-block-action"
          onClick={() => setIsEditing(true)}
          aria-label="Edit equation"
          title="Edit equation"
        >
          <Sigma size={14} />
          <span>Edit</span>
        </button>
        <button
          type="button"
          className="journal-edit-block-action is-danger"
          onClick={deleteNode}
          aria-label="Delete equation"
          title="Delete equation"
        >
          <Trash2 size={14} />
        </button>
      </span>
      {isEditing && (
        <MathModal
          key={`${node.type.name}:${latex}`}
          isOpen
          initialLatex={latex}
          initialDisplayMode={displayMode}
          allowDisplayModeChange={false}
          onClose={() => setIsEditing(false)}
          onInsert={(nextLatex) => updateAttributes({ latex: nextLatex })}
        />
      )}
    </NodeViewWrapper>
  );
}

export function BlockEquationNodeView(props: NodeViewProps) {
  return <EquationNodeView {...props} />;
}

export function InlineEquationNodeView(props: NodeViewProps) {
  return <EquationNodeView {...props} />;
}

export function EditableCodeBlockNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = String(node.attrs.language || "text");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <NodeViewWrapper className="journal-edit-code-block" data-language={language}>
      <div className="journal-edit-code-toolbar" contentEditable={false}>
        <label className="journal-edit-code-language-label">
          <span className="sr-only">Code language</span>
          <select
            value={language}
            onChange={(event) => updateAttributes({ language: event.target.value })}
            aria-label="Code language"
          >
            {LANGUAGES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <div className="journal-edit-code-actions">
          <button type="button" onClick={() => void copyCode()} title="Copy code" aria-label="Copy code">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button type="button" onClick={deleteNode} title="Delete code block" aria-label="Delete code block">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <NodeViewContent<"pre">
        as="pre"
        className={`journal-edit-code-content language-${language}`}
        style={{ whiteSpace: "pre" }}
      />
    </NodeViewWrapper>
  );
}

export function EditableImageNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  return (
    <NodeViewWrapper className="journal-edit-image-block">
      <figure contentEditable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={String(node.attrs.src || "")} alt={String(node.attrs.alt || "")} />
        <figcaption>
          <ImageIcon size={13} />
          <input
            value={String(node.attrs.caption || "")}
            onChange={(event) => updateAttributes({ caption: event.target.value })}
            placeholder="Add an image caption…"
            aria-label="Image caption"
          />
          <button type="button" onClick={deleteNode} title="Delete image" aria-label="Delete image">
            <Trash2 size={14} />
          </button>
        </figcaption>
      </figure>
    </NodeViewWrapper>
  );
}
