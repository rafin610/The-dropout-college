"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Terminal,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table as TableIcon,
  Sigma,
  Info,
  ChevronDownSquare,
  Video,
  ImageIcon,
  Undo2,
  Redo2,
  Plus,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
  onOpenMath: () => void;
  onOpenCallout: () => void;
  onOpenImage: () => void;
  onOpenVideo: () => void;
  onOpenAddBlock?: () => void;
}

export function EditorToolbar({
  editor,
  onOpenMath,
  onOpenCallout,
  onOpenImage,
  onOpenVideo,
  onOpenAddBlock,
}: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="journal-editor-toolbar" role="toolbar" aria-label="Editor Formatting">
      {onOpenAddBlock && (
        <div className="journal-toolbar-group">
          <button
            type="button"
            onClick={onOpenAddBlock}
            className="journal-toolbar-btn"
            title="Add Block Menu (+)"
            aria-label="Add Block Menu"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      <div className="journal-toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`journal-toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`journal-toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`journal-toolbar-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 size={16} />
        </button>
      </div>

      <div className="journal-toolbar-divider" />

      <div className="journal-toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`journal-toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`journal-toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`journal-toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`journal-toolbar-btn ${editor.isActive("strike") ? "active" : ""}`}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`journal-toolbar-btn ${editor.isActive("code") ? "active" : ""}`}
          title="Inline Code"
          aria-label="Inline Code"
        >
          <Code size={15} />
        </button>
      </div>

      <div className="journal-toolbar-divider" />

      <div className="journal-toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`journal-toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
          title="Bulleted List"
          aria-label="Bulleted List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`journal-toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`journal-toolbar-btn ${editor.isActive("blockquote") ? "active" : ""}`}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="journal-toolbar-btn"
          title="Horizontal Rule"
          aria-label="Horizontal Rule"
        >
          <Minus size={15} />
        </button>
      </div>

      <div className="journal-toolbar-divider" />

      {/* Structured Knowledge Blocks */}
      <div className="journal-toolbar-group">
        <button
          type="button"
          onClick={onOpenMath}
          className="journal-toolbar-btn journal-btn-accent"
          title="Insert Math Equation (LaTeX)"
          aria-label="Insert Math Equation"
        >
          <Sigma size={15} />
          <span className="journal-btn-text">Math</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`journal-toolbar-btn ${editor.isActive("codeBlock") ? "active" : ""}`}
          title="Insert Code Block"
          aria-label="Insert Code Block"
        >
          <Terminal size={15} />
          <span className="journal-btn-text">Code</span>
        </button>
        <button
          type="button"
          onClick={onOpenCallout}
          className="journal-toolbar-btn"
          title="Insert Callout Box"
          aria-label="Insert Callout Box"
        >
          <Info size={15} />
          <span className="journal-btn-text">Callout</span>
        </button>
        <button
          type="button"
          onClick={() => {
            editor
              .chain()
              .focus()
              .insertContent({
                type: "details",
                attrs: { summary: "Expandable Concept" },
                content: [{ type: "paragraph", content: [{ type: "text", text: "Elaborated detail..." }] }],
              })
              .run();
          }}
          className="journal-toolbar-btn"
          title="Insert Details / Accordion"
          aria-label="Insert Details"
        >
          <ChevronDownSquare size={15} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive("table")) {
              editor.chain().focus().deleteTable().run();
            } else {
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            }
          }}
          className={`journal-toolbar-btn ${editor.isActive("table") ? "active" : ""}`}
          title="Insert or delete Table"
          aria-label="Table"
        >
          <TableIcon size={15} />
        </button>
        <button
          type="button"
          onClick={onOpenImage}
          className="journal-toolbar-btn"
          title="Insert Image"
          aria-label="Insert Image"
        >
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          onClick={onOpenVideo}
          className="journal-toolbar-btn"
          title="Embed Video"
          aria-label="Embed Video"
        >
          <Video size={15} />
        </button>
      </div>

      <div className="journal-toolbar-spacer" />

      {/* History */}
      <div className="journal-toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="journal-toolbar-btn"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="journal-toolbar-btn"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>
      </div>
    </div>
  );
}
