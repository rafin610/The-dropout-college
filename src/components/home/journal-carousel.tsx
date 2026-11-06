"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import type { JournalArticle } from "@/server/journal/types";

const AUTOPLAY_DELAY_MS = 5000;

function formatDate(article: JournalArticle): string | null {
  const raw = article.publishedAt || article.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function authorInitials(article: JournalArticle): string {
  return (article.author.displayName || "Author")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function JournalCarousel({
  articles,
  title = "The DropOut Journal",
  eyebrow = "Curated Knowledge",
}: {
  articles: JournalArticle[];
  title?: string;
  eyebrow?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const currentIndexRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const programmaticTargetRef = useRef<number | null>(null);
  const programmaticTimerRef = useRef<number | null>(null);

  const total = articles.length;
  const activeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;

  useEffect(() => {
    currentIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  const cancelProgrammaticScroll = useCallback(() => {
    programmaticTargetRef.current = null;
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = null;
    }
  }, []);

  const scrollToSlide = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      const slide = slideRefs.current[index];
      if (!track || !slide) return;

      if (behavior === "smooth") {
        // Keep the clicked slide marked active while the native smooth scroll
        // passes over the slides in between. Manual scrolling cancels this.
        programmaticTargetRef.current = index;
        if (programmaticTimerRef.current !== null) {
          window.clearTimeout(programmaticTimerRef.current);
        }
        const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
        programmaticTimerRef.current = window.setTimeout(
          cancelProgrammaticScroll,
          Math.min(3000, Math.max(900, distance * 0.35))
        );
        track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
      } else {
        // The track has CSS scroll-behavior: smooth, so assigning scrollLeft
        // is the reliable way to jump without animating (resize, reduced motion).
        cancelProgrammaticScroll();
        track.scrollLeft = slide.offsetLeft;
      }
    },
    [cancelProgrammaticScroll]
  );

  const goToSlide = useCallback(
    (index: number, behavior?: ScrollBehavior) => {
      if (total === 0) return;
      const wrapped = ((index % total) + total) % total;
      setCurrentIndex(wrapped);
      scrollToSlide(wrapped, behavior ?? (reduceMotion ? "auto" : "smooth"));
    },
    [reduceMotion, scrollToSlide, total]
  );

  // Autoplay: use a timeout that resets whenever the active slide changes, so
  // manual navigation never fights with the timer.
  useEffect(() => {
    if (!isPlaying || isPaused || reduceMotion || total <= 1) return;
    const timer = window.setTimeout(() => {
      goToSlide(activeIndex + 1);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, goToSlide, isPaused, isPlaying, reduceMotion, total]);

  // Keep the scroll position pinned to the active slide when the viewport
  // changes, without animating.
  useEffect(() => {
    const handleResize = () => {
      scrollToSlide(currentIndexRef.current, "auto");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scrollToSlide]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const finish = () => cancelProgrammaticScroll();
    track.addEventListener("scrollend", finish);
    return () => {
      track.removeEventListener("scrollend", finish);
      cancelProgrammaticScroll();
    };
  }, [cancelProgrammaticScroll, total]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (programmaticTimerRef.current !== null) {
        window.clearTimeout(programmaticTimerRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (programmaticTargetRef.current !== null) return;
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      let closest = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      slideRefs.current.forEach((slide, index) => {
        if (!slide) return;
        const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
        if (distance < closestDistance) {
          closest = index;
          closestDistance = distance;
        }
      });
      setCurrentIndex((index) => (index === closest ? index : closest));
    });
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("a, button")) {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToSlide(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToSlide(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToSlide(total - 1);
    }
  };

  const compactTitle = (value: string) =>
    value.length > 90 ? `${value.slice(0, 87).trimEnd()}…` : value;

  if (total === 0) {
    return (
      <section className="section journal-carousel-section" aria-label="Journal publications">
        <div className="journal-carousel-header">
          <div className="journal-carousel-heading">
            <div className="eyebrow journal-carousel-eyebrow">
              <Sparkles size={11} aria-hidden="true" /> {eyebrow}
            </div>
            <h2 className="journal-carousel-title">{title}</h2>
          </div>
          <Link href="/journal" className="section-link journal-view-all-link">
            <span>Visit the Journal</span> <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="journal-empty-card">
          <span className="journal-empty-icon" aria-hidden="true">
            <BookOpen size={26} />
          </span>
          <h3>No published articles yet</h3>
          <p>
            The DropOut Journal publishes deep-dives, learning logs, and community
            essays. The first issue is being written now.
          </p>
          <Link href="/journal/studio" className="button button-ghost">
            Write the first article <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section journal-carousel-section"
      aria-roledescription="carousel"
      aria-label="Featured DropOut Journal articles"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerCancel={() => setIsPaused(false)}
    >
      <div className="journal-carousel-header">
        <div className="journal-carousel-heading">
          <div className="eyebrow journal-carousel-eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" aria-hidden="true" />{" "}
            {eyebrow}
          </div>
          <h2 className="journal-carousel-title">{title}</h2>
          <p className="journal-carousel-hint">
            Published work from the community. Swipe, scroll, or use the controls to
            browse.
          </p>
        </div>

        <div className="journal-carousel-controls">
          <div className="journal-carousel-counter" aria-live="polite">
            <span className="current-num">
              {String(activeIndex + 1).padStart(2, "0")}
            </span>
            <span className="separator" aria-hidden="true">
              /
            </span>
            <span className="total-num">{String(total).padStart(2, "0")}</span>
          </div>

          <div className="journal-carousel-btn-group">
            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={() => goToSlide(activeIndex - 1)}
              aria-label="Previous article"
              disabled={total <= 1}
            >
              <ArrowLeft size={15} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={() => setIsPlaying((playing) => !playing)}
              aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
              aria-pressed={!isPlaying}
              disabled={total <= 1}
            >
              {isPlaying ? (
                <Pause size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="journal-ctrl-btn"
              onClick={() => goToSlide(activeIndex + 1)}
              aria-label="Next article"
              disabled={total <= 1}
            >
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <Link href="/journal" className="section-link journal-view-all-link">
            <span>All Articles</span> <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="journal-carousel-viewport">
        <div
          ref={trackRef}
          className="journal-carousel-track"
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onPointerDown={cancelProgrammaticScroll}
          onWheel={cancelProgrammaticScroll}
          tabIndex={0}
          role="region"
          aria-label="Journal article slides. Use the left and right arrow keys to navigate."
        >
          {articles.map((article, index) => {
            const date = formatDate(article);
            const isActive = index === activeIndex;
            return (
              <article
                key={article.id}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className={`journal-slide${isActive ? " is-active" : ""}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${total}: ${compactTitle(article.title)}`}
                aria-current={isActive ? "true" : undefined}
              >
                <Link
                  href={`/journal/${article.slug}`}
                  className="journal-slide-media"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`Read ${article.title}`}
                >
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="journal-slide-img"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className="journal-slide-fallback" aria-hidden="true">
                      <BookOpen size={30} />
                      <span>The DropOut Journal</span>
                    </div>
                  )}

                  <div className="journal-slide-badge-row">
                    <span className="journal-badge category">
                      {article.categoryName || "General"}
                    </span>
                    {article.featured && (
                      <span className="journal-badge featured">Featured</span>
                    )}
                  </div>
                </Link>

                <div className="journal-slide-body">
                  <div className="journal-slide-meta-top">
                    <span className="journal-slide-readtime">
                      <Clock size={12} aria-hidden="true" />{" "}
                      {article.readingTimeMinutes || 2} min read
                    </span>
                    {date && (
                      <span className="journal-slide-date">
                        <Calendar size={12} aria-hidden="true" /> {date}
                      </span>
                    )}
                  </div>

                  <h3 className="journal-slide-heading">
                    <Link
                      href={`/journal/${article.slug}`}
                      tabIndex={isActive ? 0 : -1}
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p className="journal-slide-excerpt">{article.excerpt}</p>
                  )}

                  <div className="journal-slide-footer">
                    <div className="journal-slide-author">
                      <span className="journal-author-pic" aria-hidden="true">
                        {article.author.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={article.author.avatarUrl} alt="" loading="lazy" />
                        ) : (
                          authorInitials(article)
                        )}
                      </span>
                      <div className="journal-author-text">
                        <span className="author-name">
                          {article.author.displayName}
                        </span>
                        <span className="author-role">
                          {article.author.role || "Writer"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/journal/${article.slug}`}
                      className="button button-primary journal-read-cta"
                      tabIndex={isActive ? 0 : -1}
                    >
                      <span>Read Journal</span>
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="journal-carousel-dots" aria-label="Slide indicators">
        {articles.map((article, index) => (
          <button
            key={article.id}
            type="button"
            aria-label={`Go to slide ${index + 1}: ${compactTitle(article.title)}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`journal-dot${index === activeIndex ? " active" : ""}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
