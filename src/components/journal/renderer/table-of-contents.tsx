"use client";

import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
import { slugify, extractTextFromDoc } from "@/server/journal/validation";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractTocFromDoc(doc: unknown): TocItem[] {
  if (!doc || typeof doc !== "object") return [];
  const items: TocItem[] = [];
  const root = doc as { content?: Array<{ type?: string; attrs?: { level?: number }; content?: unknown }> };

  if (!Array.isArray(root.content)) return [];

  root.content.forEach((node, index) => {
    if (node.type === "heading" && node.attrs?.level) {
      const text = extractTextFromDoc(node).trim();
      if (text) {
        const id = `${slugify(text) || "section"}-${index}`;
        items.push({
          id,
          text,
          level: node.attrs.level,
        });
      }
    }
  });

  return items;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="journal-toc" aria-label="Table of contents">
      <div className="journal-toc-header">
        <ListTree size={14} className="journal-toc-icon" />
        <span>Contents</span>
      </div>
      <ul className="journal-toc-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`journal-toc-item level-${item.level} ${
              activeId === item.id ? "active" : ""
            }`}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                  history.pushState(null, "", `#${item.id}`);
                  setActiveId(item.id);
                }
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
