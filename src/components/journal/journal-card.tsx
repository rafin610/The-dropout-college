"use client";

import Link from "next/link";
import { Clock, Calendar, ArrowUpRight } from "lucide-react";
import type { JournalArticle } from "@/server/journal/types";

interface JournalCardProps {
  article: JournalArticle;
}

export function JournalCard({ article }: JournalCardProps) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date(article.createdAt).toLocaleDateString("en-US", {
        month: "short",
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
    <article className="journal-card" aria-label={article.title}>
      <Link href={`/journal/${article.slug}`} className="journal-card-cover-link">
        <div className="journal-card-cover-wrapper">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImageUrl}
              alt={article.title}
              loading="lazy"
              className="journal-card-cover-img"
            />
          ) : (
            <div className="journal-card-cover-fallback">
              <span className="journal-fallback-monogram">D/JOURNAL</span>
            </div>
          )}
          {article.featured && (
            <span className="journal-featured-chip">Featured</span>
          )}
        </div>
      </Link>

      <div className="journal-card-content">
        <div className="journal-card-meta-top">
          <span className="journal-pill journal-pill-category">
            {article.categoryName || "General"}
          </span>
          <span className="journal-card-readtime">
            <Clock size={12} />
            <span>{article.readingTimeMinutes} min read</span>
          </span>
        </div>

        <h3 className="journal-card-title">
          <Link href={`/journal/${article.slug}`}>
            {article.title}
          </Link>
        </h3>

        {article.excerpt && (
          <p className="journal-card-excerpt">
            {article.excerpt}
          </p>
        )}

        <div className="journal-card-footer">
          <div className="journal-card-author">
            <span className="journal-author-avatar" aria-hidden="true">
              {article.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.author.avatarUrl} alt="" loading="lazy" />
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

          <Link href={`/journal/${article.slug}`} className="journal-read-link" aria-label={`Read ${article.title}`}>
            <span>Read</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
