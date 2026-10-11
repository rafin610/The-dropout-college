"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PenLine, BookOpen, X } from "lucide-react";
import { JournalCard } from "@/components/journal/journal-card";
import { FeaturedArticleBanner } from "@/components/journal/featured-article";
import type { JournalArticle } from "@/server/journal/types";
import type { Category } from "@/lib/supabase-data";

interface JournalClientProps {
  initialArticles: JournalArticle[];
  categories: Category[];
  canWrite: boolean;
}

export function JournalClient({
  initialArticles,
  categories,
  canWrite,
}: JournalClientProps) {
  const articles = initialArticles;
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      // Category filter
      if (selectedCategory !== "all") {
        const matchesCategory =
          (art.categoryName || "").toLowerCase() === selectedCategory.toLowerCase() ||
          art.tags.some((t) => t.toLowerCase() === selectedCategory.toLowerCase());
        if (!matchesCategory) return false;
      }

      // Search query
      if (q) {
        const titleMatch = art.title.toLowerCase().includes(q);
        const excerptMatch = (art.excerpt || "").toLowerCase().includes(q);
        const authorMatch = art.author.displayName.toLowerCase().includes(q);
        const tagMatch = art.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !excerptMatch && !authorMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [articles, selectedCategory, searchQuery]);

  const featuredArticle = useMemo(() => {
    return articles.find((a) => a.featured) || articles[0] || null;
  }, [articles]);

  const nonFeaturedArticles = useMemo(() => {
    if (!featuredArticle) return filteredArticles;
    // When no search filter is active, avoid duplicating the featured one
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return filteredArticles.filter((a) => a.id !== featuredArticle.id);
    }
    return filteredArticles;
  }, [filteredArticles, featuredArticle, selectedCategory, searchQuery]);

  return (
    <div className="journal-page-wrapper">
      {/* Editorial Masthead */}
      <header className="journal-masthead">
        <div className="journal-masthead-top">
          <div className="journal-masthead-eyebrow">
            <span>The DropOut Journal</span>
            <span className="journal-masthead-dot">·</span>
            <span>Est. 2026</span>
          </div>

          {canWrite && (
            <Link href="/journal/studio" className="button button-primary journal-write-btn">
              <PenLine size={15} />
              <span>Write article</span>
            </Link>
          )}
        </div>

        <h1 className="journal-masthead-title">
          Knowledge without <span className="text-accent">boundaries.</span>
        </h1>
        <p className="journal-masthead-desc">
          Independent thinking, self-directed learning, and technical clarity. Essays, equations, code, and guides published by The DropOut College community.
        </p>
      </header>

      {/* Featured Banner (only when viewing all categories and no active search) */}
      {selectedCategory === "all" && !searchQuery.trim() && featuredArticle && (
        <FeaturedArticleBanner article={featuredArticle} />
      )}

      {/* Filter and Search Bar */}
      <section className="journal-filter-section" aria-label="Article Filters">
        <div className="journal-filter-bar">
          <div className="journal-search-wrap">
            <Search size={16} className="journal-search-icon" />
            <input
              type="text"
              placeholder="Search essays, topics, formulas, or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="journal-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="journal-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="journal-categories-scroll">
            <button
              type="button"
              className={`journal-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              All Topics
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`journal-filter-chip ${
                  selectedCategory.toLowerCase() === cat.name.toLowerCase() ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Feed */}
      <main className="journal-feed-section">
        {filteredArticles.length === 0 ? (
          <div className="journal-empty-state">
            <BookOpen size={36} className="text-muted" />
            <h3>No articles found</h3>
            <p className="text-muted">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search terms or selecting a different category."
                : "No published articles are available at this time."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="journal-grid">
            {nonFeaturedArticles.map((article) => (
              <JournalCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
