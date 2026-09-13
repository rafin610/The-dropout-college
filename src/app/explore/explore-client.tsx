"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { MemberCard } from "@/components/cards";
import type { Category, Member } from "@/lib/supabase-data";

export function ExploreClient({
  initialMembers,
  categories,
}: {
  initialMembers: Member[];
  categories: Category[];
}) {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialCat = searchParams.get("category") ?? "all";

  const [query, setQuery] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredMembers = useMemo(() => {
    return initialMembers.filter((member) => {
      // Category filter
      if (selectedCategory !== "all") {
        const catObj = categories.find((c) => c.id === selectedCategory);
        const matchCategory = catObj
          ? member.category.toLowerCase() === catObj.name.toLowerCase()
          : member.category.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchCategory) return false;
      }

      // Online filter
      if (onlineOnly && !member.online) {
        return false;
      }

      // Text query
      if (query.trim()) {
        const text = `${member.name} ${member.handle} ${member.bio} ${member.category}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }

      return true;
    });
  }, [initialMembers, categories, selectedCategory, onlineOnly, query]);

  function clearAll() {
    setQuery("");
    setSelectedCategory("all");
    setOnlineOnly(false);
  }

  return (
    <>
      <div className="toolbar">
        <div className="input-wrap">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, skills, projects..."
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 0 }}
              aria-label="Clear search input"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          className={`filter ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters((prev) => !prev)}
          type="button"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      {showFilters && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#d6ddd4" }}>
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              style={{ accentColor: "var(--lime)" }}
            />
            Show online members only
          </label>
          {(query || selectedCategory !== "all" || onlineOnly) && (
            <button onClick={clearAll} style={{ background: "transparent", border: 0, color: "var(--coral)", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>
              Reset all filters
            </button>
          )}
        </div>
      )}

      <div className="filter-row" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={`filter ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          All members
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`filter ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16, color: "var(--muted)", fontSize: 12 }}>
        Showing {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
      </div>

      {filteredMembers.length ? (
        <div className="member-grid">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="muted-text" style={{ fontSize: 14, margin: "0 0 12px" }}>No members match your search criteria.</p>
          <button onClick={clearAll} className="button button-ghost" style={{ fontSize: 11 }}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
