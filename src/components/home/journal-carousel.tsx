"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Calendar, Clock, Pause, Play, Sparkles } from "lucide-react";
import type { JournalArticle } from "@/server/journal/types";

export function JournalCarousel({
  articles,
  title = "The DropOut Journal",
  eyebrow = "Curated Knowledge",
  intervalMs = 5500,
}: {
  articles: JournalArticle[];
  title?: string;
  eyebrow?: string;
  intervalMs?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = articles.length;
  const current = articles[currentIndex];
  const nextIndex = total > 0 ? (currentIndex + 1) % total : 0;
  const nextArticle = articles[nextIndex];

  const handleNext = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleSelect = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || isHovered || total <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    timerRef.current = setInterval(handleNext, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isHovered, total, intervalMs, handleNext]);

  // Touch swipe support for mobile
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 50) {
      handleNext();
      setTouchStart(null);
    } else if (diff < -50) {
      handlePrev();
      setTouchStart(null);
    }
  };

  const onTouchEnd = () => {
    setTouchStart(null);
  };

  if (!articles || articles.length === 0) {
    return (
      <section className="section journal-carousel-section" aria-label="Journal Publications">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2>{title}</h2>
          </div>
          <Link href="/journal" className="section-link">
            <span>Visit Studio</span> <ArrowRight size={13} />
          </Link>
        </div>
        <div className="journal-empty-card">
          <BookOpen size={28} style={{ color: "var(--accent)" }} />
          <h3>No published articles yet</h3>
          <p>The DropOut Journal publishes deep-dives, learning logs, and community essays.</p>
          <Link href="/journal/studio" className="button button-ghost" style={{ marginTop: 12 }}>
            Write the First Article
          </Link>
        </div>
      </section>
    );
  }

  const publishedDate = current.publishedAt
    ? new Date(current.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date(current.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const authorInitials = (current.author.displayName || "Author")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section
      className="section journal-carousel-section"
      aria-roledescription="carousel"
      aria-label="Featured DropOut Journal Articles"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <div className="journal-carousel-header">
        <div>
          <div className="eyebrow journal-carousel-eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
          </div>
          <h2 className="journal-carousel-title">{title}</h2>
        </div>

        <div className="journal-carousel-controls">
          <div className="journal-carousel-counter" aria-live="polite">
            <span className="current-num">{String(currentIndex + 1).padStart(2, "0")}</span>
            <span className="separator">/</span>
            <span className="total-num">{String(total).padStart(2, "0")}</span>
          </div>

          <div className="journal-carousel-btn-group">
            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={handlePrev}
              aria-label="Previous article"
            >
              <ArrowLeft size={15} />
            </button>

            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={() => setIsPlaying((prev) => !prev)}
              aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={handleNext}
              aria-label="Next article"
            >
              <ArrowRight size={15} />
            </button>
          </div>

          <Link href="/journal" className="section-link journal-view-all-link">
            <span>All Articles</span> <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div
        className="journal-carousel-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Main Featured Slide */}
        <article className="journal-slide-main" aria-current="true">
          <Link href={`/journal/${current.slug}`} className="journal-slide-cover-link">
            <div className="journal-slide-cover-wrap">
              {current.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.coverImageUrl}
                  alt={current.title}
                  className="journal-slide-img"
                  loading="eager"
                />
              ) : (
                <div className="journal-slide-fallback">
                  <span>The DropOut Journal</span>
                </div>
              )}
              <div className="journal-slide-badge-row">
                <span className="journal-badge category">{current.categoryName || "General"}</span>
                {current.featured && <span className="journal-badge featured">★ Featured</span>}
              </div>
            </div>
          </Link>

          <div className="journal-slide-body">
            <div className="journal-slide-meta-top">
              <span className="journal-slide-readtime">
                <Clock size={12} /> {current.readingTimeMinutes || 2} min read
              </span>
              <span className="journal-slide-date">
                <Calendar size={12} /> {publishedDate}
              </span>
            </div>

            <h3 className="journal-slide-heading">
              <Link href={`/journal/${current.slug}`}>{current.title}</Link>
            </h3>

            {current.excerpt && (
              <p className="journal-slide-excerpt">{current.excerpt}</p>
            )}

            <div className="journal-slide-footer">
              <div className="journal-slide-author">
                <span className="journal-author-pic">
                  {current.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.author.avatarUrl} alt="" />
                  ) : (
                    authorInitials
                  )}
                </span>
                <div className="journal-author-text">
                  <span className="author-name">{current.author.displayName}</span>
                  <span className="author-role">{current.author.role || "Writer"}</span>
                </div>
              </div>

              <Link href={`/journal/${current.slug}`} className="button button-primary journal-read-cta">
                <span>Read Journal</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </article>

        {/* Adjacent Preview Card (Desktop) */}
        {nextArticle && (
          <aside
            className="journal-slide-preview-card"
            onClick={handleNext}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleNext();
            }}
            aria-label={`Next article preview: ${nextArticle.title}`}
          >
            <div className="preview-label">
              <span>Up Next</span>
              <ArrowRight size={12} />
            </div>

            <div className="preview-thumbnail">
              {nextArticle.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nextArticle.coverImageUrl} alt="" />
              ) : (
                <div className="preview-thumbnail-fallback">
                  <BookOpen size={18} />
                </div>
              )}
            </div>

            <div className="preview-info">
              <span className="preview-category">{nextArticle.categoryName || "General"}</span>
              <h4 className="preview-title">{nextArticle.title}</h4>
              <span className="preview-readtime">
                <Clock size={11} /> {nextArticle.readingTimeMinutes || 2} min read
              </span>
            </div>
          </aside>
        )}
      </div>

      {/* Pagination Indicators */}
      <div className="journal-carousel-dots" role="tablist" aria-label="Slide indicators">
        {articles.map((art, idx) => (
          <button
            key={art.id}
            type="button"
            role="tab"
            aria-selected={idx === currentIndex}
            aria-label={`Go to slide ${idx + 1}: ${art.title}`}
            className={`journal-dot ${idx === currentIndex ? "active" : ""}`}
            onClick={() => handleSelect(idx)}
          />
        ))}
      </div>
    </section>
  );
}
