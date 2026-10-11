"use client";

import React, { useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Sigma,
  Terminal,
  Info,
  ChevronDownSquare,
  Table as TableIcon,
  ImageIcon,
  Video,
} from "lucide-react";

interface SlashMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMath: () => void;
  onOpenCallout: () => void;
  onOpenImage: () => void;
  onOpenVideo: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: (editor: Editor) => void;
}

export function SlashMenu({
  editor,
  isOpen,
  onClose,
  onOpenMath,
  onOpenCallout,
  onOpenImage,
  onOpenVideo,
}: SlashMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "math",
      title: "Math Equation (KaTeX)",
      description: "LaTeX formula with real-time math rendering",
      icon: Sigma,
      action: () => onOpenMath(),
    },
    {
      id: "code",
      title: "Code Block",
      description: "Syntax-highlighted code with language picker",
      icon: Terminal,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "callout",
      title: "Callout Box",
      description: "Information, important, tip, warning, or definition box",
      icon: Info,
      action: () => onOpenCallout(),
    },
    {
      id: "h1",
      title: "Heading 1",
      description: "Large major section heading",
      icon: Heading1,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium subsection heading",
      icon: Heading2,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small subsection heading",
      icon: Heading3,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bulletList",
      title: "Bulleted List",
      description: "Unordered bullet list",
      icon: List,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: "orderedList",
      title: "Numbered List",
      description: "Ordered numbered list",
      icon: ListOrdered,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "quote",
      title: "Blockquote",
      description: "Callout quote or citation",
      icon: Quote,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "table",
      title: "Table",
      description: "3x3 table with headers and resizable cells",
      icon: TableIcon,
      action: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: "details",
      title: "Details / Accordion",
      description: "Collapsible disclosure block for deep explanations",
      icon: ChevronDownSquare,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "details",
            attrs: { summary: "Expandable Concept" },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Elaborated detail..." }] }],
          })
          .run(),
    },
    {
      id: "image",
      title: "Image",
      description: "Upload an image or specify a URL with caption",
      icon: ImageIcon,
      action: () => onOpenImage(),
    },
    {
      id: "video",
      title: "Video Embed",
      description: "Embed YouTube, Vimeo, or Loom video",
      icon: Video,
      action: () => onOpenVideo(),
    },
    {
      id: "divider",
      title: "Divider",
      description: "Horizontal section break",
      icon: Minus,
      action: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex] && editor) {
          filtered[selectedIndex].action(editor);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, editor, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="journal-slash-menu"
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      <div className="journal-slash-search">
        <input
          type="text"
          placeholder="Filter blocks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          autoFocus
          className="journal-slash-input"
        />
      </div>

      <div className="journal-slash-items">
        {filtered.length === 0 ? (
          <div className="journal-slash-empty">No matching blocks</div>
        ) : (
          filtered.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={cmd.id}
                type="button"
                className={`journal-slash-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  if (editor) {
                    cmd.action(editor);
                    onClose();
                  }
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="journal-slash-item-icon">
                  <Icon size={16} />
                </div>
                <div className="journal-slash-item-info">
                  <span className="journal-slash-item-title">{cmd.title}</span>
                  <span className="journal-slash-item-desc">{cmd.description}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
