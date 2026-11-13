"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PenLine, BookOpen, X, Settings2 } from "lucide-react";
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
      if (selectedCategory !== "all") {
        const matchesCategory =
          (art.categoryName || "").toLowerCase() === selectedCategory.toLowerCase() ||
          art.tags.some((t) => t.toLowerCase() === selectedCategory.toLowerCase());
        if (!matchesCategory) return false;
      }

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
    if (selectedCategory === "all" && !searchQuery.trim()) {
      return filteredArticles.filter((a) => a.id !== featuredArticle.id);
    }
    return filteredArticles;
  }, [filteredArticles, featuredArticle, selectedCategory, searchQuery]);

  return (
    <div className="journal-page-wrapper">
      <header className="app-page-head journal-app-head">
        <div>
          <p className="c-kicker">The DropOut Journal</p>
          <h1 className="app-page-title">Journal</h1>
          <p className="app-page-sub">
            Independent thinking, technical clarity, and ideas worth keeping.
          </p>
        </div>

        {canWrite && (
          <div className="journal-head-actions">
            <Link href="/staff" className="c-button">
              <Settings2 size={15} />
              <span>Manage</span>
            </Link>
            <Link href="/journal/studio" className="c-button c-button-primary">
              <PenLine size={15} />
              <span>Write article</span>
            </Link>
          </div>
        )}
      </header>

      {selectedCategory === "all" && !searchQuery.trim() && featuredArticle && (
        <FeaturedArticleBanner article={featuredArticle} />
      )}

      <section className="journal-filter-section" aria-label="Article filters">
        <div className="journal-search-wrap">
          <Search size={17} className="journal-search-icon" />
          <input
            type="search"
            placeholder="Search essays, topics, or authors…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="journal-search-input"
            aria-label="Search journal articles"
          />
          {searchQuery && (
            <button
              type="button"
              className="journal-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="journal-categories-scroll" aria-label="Journal topics">
          <button
            type="button"
            className={`journal-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            All topics
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
      </section>

      <div className="journal-feed-section">
        <div className="journal-results-head">
          <span>{searchQuery || selectedCategory !== "all" ? "Results" : "Recent publications"}</span>
          <span>{filteredArticles.length}</span>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="journal-empty-state">
            <BookOpen size={30} />
            <h3>No articles found</h3>
            <p>
              {searchQuery || selectedCategory !== "all"
                ? "Try a different search or topic."
                : "No published articles are available yet."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <button
                type="button"
                className="c-button"
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
      </div>
    </div>
  );
}
