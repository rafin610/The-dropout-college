"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Calendar, Sparkles } from "lucide-react";
import type { JournalArticle } from "@/server/journal/types";

export function FeaturedArticleBanner({ article }: { article: JournalArticle }) {
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

  const initials = (article.author.displayName || "A")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="journal-featured-banner" aria-label="Featured Story">
      <div className="journal-featured-grid">
        <div className="journal-featured-media">
          <Link href={`/journal/${article.slug}`} className="journal-featured-img-wrap">
            {article.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.coverImageUrl}
                alt={article.title}
                className="journal-featured-img"
              />
            ) : (
              <div className="journal-featured-fallback">
                <span>The DropOut Journal</span>
              </div>
            )}
          </Link>
        </div>

        <div className="journal-featured-content">
          <div className="journal-featured-meta-row">
            <span className="journal-pill journal-pill-featured">
              <Sparkles size={12} /> Featured Publication
            </span>
            <span className="journal-pill journal-pill-category">
              {article.categoryName || "General"}
            </span>
            <span className="journal-card-readtime">
              <Clock size={12} /> {article.readingTimeMinutes} min read
            </span>
          </div>

          <h2 className="journal-featured-title">
            <Link href={`/journal/${article.slug}`}>{article.title}</Link>
          </h2>

          {article.excerpt && (
            <p className="journal-featured-excerpt">{article.excerpt}</p>
          )}

          <div className="journal-featured-footer">
            <div className="journal-card-author">
              <span className="journal-author-avatar">
                {article.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.author.avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </span>
              <div className="journal-author-info">
                <span className="journal-author-name">{article.author.displayName}</span>
                <span className="journal-card-date">
                  <Calendar size={11} /> {publishedDate}
                </span>
              </div>
            </div>

            <Link href={`/journal/${article.slug}`} className="button button-primary">
              <span>Read article</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
