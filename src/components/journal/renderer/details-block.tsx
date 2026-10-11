"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";

interface DetailsBlockProps {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function DetailsBlock({
  summary,
  children,
  defaultOpen = false,
}: DetailsBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`journal-details ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="journal-details-summary"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <ChevronRight size={16} className={`journal-details-icon ${isOpen ? "rotated" : ""}`} />
        <span>{summary || "Click to expand details"}</span>
      </button>
      {isOpen && <div className="journal-details-content">{children}</div>}
    </div>
  );
}
