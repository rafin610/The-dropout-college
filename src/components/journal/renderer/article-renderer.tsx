"use client";

import React from "react";
import { MathBlock } from "./math-block";
import { CodeBlock } from "./code-block";
import { CalloutBlock, CalloutVariant } from "./callout-block";
import { DetailsBlock } from "./details-block";
import { VideoBlock } from "./video-block";
import { slugify, extractTextFromDoc } from "@/server/journal/validation";
import { isSafeTextAlign, sanitizeHref, sanitizeMediaUrl } from "@/lib/journal/urls";

interface ArticleRendererProps {
  content: Record<string, unknown> | null;
  className?: string;
}

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  text?: string;
  marks?: Mark[];
}

function alignmentStyle(node: Node): React.CSSProperties | undefined {
  const value = node.attrs?.textAlign;
  return isSafeTextAlign(value) ? { textAlign: value } : undefined;
}

function renderInline(node: Node, index: number): React.ReactNode {
  if (node.type === "text") {
    let result: React.ReactNode = node.text || "";

    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") {
          result = <strong>{result}</strong>;
        } else if (mark.type === "italic") {
          result = <em>{result}</em>;
        } else if (mark.type === "underline") {
          result = <u>{result}</u>;
        } else if (mark.type === "strike") {
          result = <del>{result}</del>;
        } else if (mark.type === "code") {
          result = <code className="journal-inline-code">{result}</code>;
        } else if (mark.type === "link") {
          const href = sanitizeHref(mark.attrs?.href);
          if (!href) continue;
          const isExternal = href.startsWith("http://") || href.startsWith("https://");
          result = (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="journal-link"
            >
              {result}
            </a>
          );
        }
      }
    }
    return <React.Fragment key={index}>{result}</React.Fragment>;
  }

  if (node.type === "hardBreak") {
    return <br key={index} />;
  }

  if (node.type === "inlineEquation" && node.attrs?.latex) {
    return (
      <MathBlock
        key={index}
        latex={String(node.attrs.latex)}
        displayMode={false}
      />
    );
  }

  return null;
}

function renderNode(node: Node, index: number): React.ReactNode {
  if (node.type === "text" || node.type === "hardBreak" || node.type === "inlineEquation") {
    return renderInline(node, index);
  }

  const children = node.content?.map((child, i) => renderNode(child, i));
  const inlineChildren = node.content?.map((child, i) => renderInline(child, i));

  switch (node.type) {
    case "paragraph":
      return <p key={index} className="journal-paragraph" style={alignmentStyle(node)}>{inlineChildren}</p>;

    case "heading": {
      const level = Number(node.attrs?.level || 1);
      const text = extractTextFromDoc(node).trim();
      const anchorId = `${slugify(text) || "section"}-${index}`;
      const style = alignmentStyle(node);

      if (level === 1) {
        return (
          <h1 key={index} id={anchorId} className="journal-h1" style={style}>
            <a href={`#${anchorId}`} className="journal-heading-anchor">{inlineChildren}</a>
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2 key={index} id={anchorId} className="journal-h2" style={style}>
            <a href={`#${anchorId}`} className="journal-heading-anchor">{inlineChildren}</a>
          </h2>
        );
      }
      return (
        <h3 key={index} id={anchorId} className="journal-h3" style={style}>
          <a href={`#${anchorId}`} className="journal-heading-anchor">{inlineChildren}</a>
        </h3>
      );
    }

    case "blockquote":
      return <blockquote key={index} className="journal-blockquote">{children}</blockquote>;

    case "bulletList":
      return <ul key={index} className="journal-ul">{children}</ul>;

    case "orderedList":
      return <ol key={index} className="journal-ol">{children}</ol>;

    case "listItem":
      return <li key={index} className="journal-li">{children}</li>;

    case "horizontalRule":
      return <hr key={index} className="journal-divider" />;

    case "equation": {
      const latex = String(node.attrs?.latex || "");
      const display = node.attrs?.displayMode !== false;
      return <MathBlock key={index} latex={latex} displayMode={display} />;
    }

    case "codeBlock": {
      const code = node.content?.map((c) => c.text || "").join("") || "";
      const lang = String(node.attrs?.language || "typescript");
      return (
        <CodeBlock
          key={index}
          code={code}
          language={lang}
          showLineNumbers={node.attrs?.lineNumbers !== false}
        />
      );
    }

    case "callout": {
      const variant = (node.attrs?.variant || "info") as CalloutVariant;
      const title = node.attrs?.title ? String(node.attrs.title) : undefined;
      return (
        <CalloutBlock key={index} variant={variant} title={title}>
          {children}
        </CalloutBlock>
      );
    }

    case "details": {
      const summary = String(node.attrs?.summary || "Details");
      return (
        <DetailsBlock key={index} summary={summary}>
          {children}
        </DetailsBlock>
      );
    }

    case "videoEmbed": {
      const src = sanitizeMediaUrl(node.attrs?.src);
      if (!src) return null;
      const title = node.attrs?.title ? String(node.attrs.title) : undefined;
      const caption = node.attrs?.caption ? String(node.attrs.caption) : undefined;
      return <VideoBlock key={index} src={src} title={title} caption={caption} />;
    }

    case "image":
    case "imageBlock": {
      const src = sanitizeMediaUrl(node.attrs?.src);
      const alt = String(node.attrs?.alt || "");
      const caption = node.attrs?.caption ? String(node.attrs.caption) : undefined;

      if (!src) return null;

      return (
        <figure key={index} className="journal-media-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" className="journal-media-img" />
          {caption && <figcaption className="journal-media-caption">{caption}</figcaption>}
        </figure>
      );
    }

    case "table":
      return (
        <div key={index} className="journal-table-wrap">
          <table className="journal-table">
            <tbody>{children}</tbody>
          </table>
        </div>
      );

    case "tableRow":
      return <tr key={index}>{children}</tr>;

    case "tableHeader":
      return <th key={index}>{children}</th>;

    case "tableCell":
      return <td key={index}>{children}</td>;

    default:
      if (children && children.length > 0) {
        return <div key={index}>{children}</div>;
      }
      return null;
  }
}

export function ArticleRenderer({ content, className = "" }: ArticleRendererProps) {
  if (!content) {
    return <div className="journal-prose text-muted">No content available.</div>;
  }

  const doc = content as { type?: string; content?: Node[] };

  if (doc.type !== "doc" || !Array.isArray(doc.content)) {
    // If somehow legacy or raw text was passed
    return (
      <div className={`journal-prose ${className}`}>
        <p>{JSON.stringify(content)}</p>
      </div>
    );
  }

  return (
    <article className={`journal-prose ${className}`}>
      {doc.content.map((node, index) => renderNode(node, index))}
    </article>
  );
}
