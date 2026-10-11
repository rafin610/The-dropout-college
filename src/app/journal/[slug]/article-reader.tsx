"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Check,
  Edit3,
} from "lucide-react";
import { ArticleRenderer } from "@/components/journal/renderer/article-renderer";
import { TableOfContents, extractTocFromDoc } from "@/components/journal/renderer/table-of-contents";
import { JournalCard } from "@/components/journal/journal-card";
import type { JournalArticle } from "@/server/journal/types";

interface ArticleReaderProps {
  article: JournalArticle;
  relatedArticles: JournalArticle[];
  canEdit?: boolean;
}

export function ArticleReaderClient({
  article,
  relatedArticles,
  canEdit = false,
}: ArticleReaderProps) {
  const [copied, setCopied] = useState(false);

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date(article.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const updatedDate = article.updatedAt
    ? new Date(article.updatedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const initials = (article.author.displayName || "A")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tocItems = extractTocFromDoc(article.content);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User cancelled or clipboard fallback
    }
  }

  return (
    <div className="journal-reader-page">
      {/* Navigation Breadcrumb Bar */}
      <nav className="journal-reader-nav" aria-label="Breadcrumb">
        <div className="journal-reader-nav-inner">
          <Link href="/journal" className="journal-reader-back-link">
            <ArrowLeft size={16} />
            <span>Back to Journal</span>
          </Link>

          <div className="journal-reader-nav-actions">
            {canEdit && (
              <Link
                href={`/journal/studio/${article.id}`}
                className="button button-ghost button-sm"
              >
                <Edit3 size={14} />
                <span>Edit in Studio</span>
              </Link>
            )}
            <button
              type="button"
              className="button button-ghost button-sm"
              onClick={handleShare}
              title="Share article link"
            >
              {copied ? <Check size={14} className="text-lime" /> : <Share2 size={14} />}
              <span>{copied ? "Link Copied" : "Share"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Article Header */}
      <header className="journal-reader-hero">
        <div className="journal-reader-hero-inner">
          <div className="journal-reader-meta-pills">
            {article.categoryName && (
              <span className="journal-pill journal-pill-category">
                {article.categoryName}
              </span>
            )}
            <span className="journal-reader-time-pill">
              <Clock size={12} /> {article.readingTimeMinutes} min read
            </span>
            {article.status !== "published" && (
              <span className="journal-pill status-draft">Draft Preview</span>
            )}
          </div>

          <h1 className="journal-reader-headline">{article.title}</h1>

          {article.excerpt && (
            <p className="journal-reader-deck">{article.excerpt}</p>
          )}

          {/* Author Attribution Card */}
          <div className="journal-reader-byline">
            <div className="journal-reader-author-avatar">
              {article.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.author.avatarUrl} alt={article.author.displayName} />
              ) : (
                initials
              )}
            </div>
            <div className="journal-reader-byline-text">
              <div className="journal-reader-byline-name">
                <span className="font-semibold">{article.author.displayName}</span>
                <span className="journal-byline-role">{article.author.role}</span>
              </div>
              <div className="journal-reader-byline-date">
                <Calendar size={12} />
                <span>Published on {publishedDate}</span>
                {updatedDate && updatedDate !== publishedDate && (
                  <span> · Updated {updatedDate}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Cover Image */}
      {article.coverImageUrl && (
        <div className="journal-reader-cover-container">
          <figure className="journal-reader-cover-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="journal-reader-cover-image"
            />
          </figure>
        </div>
      )}

      {/* Main Content Layout with Table of Contents */}
      <div className="journal-reader-body-layout">
        <div className={`journal-reader-body-container${tocItems.length > 0 ? " has-toc" : ""}`}>
          {tocItems.length > 0 && (
            <aside className="journal-reader-toc-col" aria-label="Table of Contents">
              <div className="journal-reader-toc-sticky">
                <TableOfContents items={tocItems} />
              </div>
            </aside>
          )}

          <main className="journal-reader-content-col">
            <ArticleRenderer content={article.content} />

            {/* Tags footer */}
            {article.tags.length > 0 && (
              <footer className="journal-reader-tags-footer">
                <div className="journal-reader-tags-label">Tagged in:</div>
                <div className="journal-reader-tags-list">
                  {article.tags.map((tag) => (
                    <span key={tag} className="journal-tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>
              </footer>
            )}

            {/* Author Bio Box */}
            <section className="journal-reader-author-box">
              <div className="journal-author-box-avatar">
                {article.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.author.avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </div>
              <div className="journal-author-box-body">
                <h4>Written by {article.author.displayName}</h4>
                <p>
                  {article.author.bio ||
                    "Contributor at The DropOut College. Passionate about self-directed learning, technology, and building with clarity."}
                </p>
                <Link
                  href={`/profile?member=${encodeURIComponent(article.author.id)}`}
                  className="journal-link"
                >
                  View profile & discussions →
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="journal-related-section" aria-label="Related Articles">
          <div className="journal-related-container">
            <div className="journal-related-header">
              <div className="eyebrow">Continue reading</div>
              <h3>More from The DropOut Journal</h3>
            </div>
            <div className="journal-grid">
              {relatedArticles.map((rel) => (
                <JournalCard key={rel.id} article={rel} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
