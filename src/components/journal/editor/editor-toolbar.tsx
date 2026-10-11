"use client";

import React from "react";
import { useEditorState, type Editor } from "@tiptap/react";
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
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor
      ? {
          heading1: currentEditor.isActive("heading", { level: 1 }),
          heading2: currentEditor.isActive("heading", { level: 2 }),
          heading3: currentEditor.isActive("heading", { level: 3 }),
          bold: currentEditor.isActive("bold"),
          italic: currentEditor.isActive("italic"),
          underline: currentEditor.isActive("underline"),
          strike: currentEditor.isActive("strike"),
          code: currentEditor.isActive("code"),
          bulletList: currentEditor.isActive("bulletList"),
          orderedList: currentEditor.isActive("orderedList"),
          blockquote: currentEditor.isActive("blockquote"),
          codeBlock: currentEditor.isActive("codeBlock"),
          table: currentEditor.isActive("table"),
        }
      : null,
  });
  if (!editor || !toolbarState) return null;

  return (
    <div
      className="journal-editor-toolbar"
      role="toolbar"
      aria-label="Editor Formatting"
      onMouseDown={(event) => event.preventDefault()}
    >
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
          className={`journal-toolbar-btn ${toolbarState.heading1 ? "active" : ""}`}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`journal-toolbar-btn ${toolbarState.heading2 ? "active" : ""}`}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`journal-toolbar-btn ${toolbarState.heading3 ? "active" : ""}`}
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
          className={`journal-toolbar-btn ${toolbarState.bold ? "active" : ""}`}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`journal-toolbar-btn ${toolbarState.italic ? "active" : ""}`}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`journal-toolbar-btn ${toolbarState.underline ? "active" : ""}`}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`journal-toolbar-btn ${toolbarState.strike ? "active" : ""}`}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`journal-toolbar-btn ${toolbarState.code ? "active" : ""}`}
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
          className={`journal-toolbar-btn ${toolbarState.bulletList ? "active" : ""}`}
          title="Bulleted List"
          aria-label="Bulleted List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`journal-toolbar-btn ${toolbarState.orderedList ? "active" : ""}`}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`journal-toolbar-btn ${toolbarState.blockquote ? "active" : ""}`}
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
          className={`journal-toolbar-btn ${toolbarState.codeBlock ? "active" : ""}`}
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
            if (toolbarState.table) {
              editor.chain().focus().deleteTable().run();
            } else {
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            }
          }}
          className={`journal-toolbar-btn ${toolbarState.table ? "active" : ""}`}
          title="Insert or delete Table"
          aria-label="Table"
        >
          <TableIcon size={15} />
        </button>
        {toolbarState.table && (
          <div className="journal-table-edit-actions" role="group" aria-label="Table editing">
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below" aria-label="Add row below">+ Row</button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column right" aria-label="Add column right">+ Column</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} title="Delete current row" aria-label="Delete current row">− Row</button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete current column" aria-label="Delete current column">− Column</button>
          </div>
        )}
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
