"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="c-page-narrow">
      <div className="c-empty" style={{ marginTop: 24 }}>
        <div className="c-empty-icon">
          <TriangleAlert size={20} />
        </div>
        <h1>That did not load.</h1>
        <p>The campus hit a snag. Try again, or head back to the feed.</p>
        <div className="c-actions-row" style={{ justifyContent: "center" }}>
          <button type="button" className="c-button c-button-primary" onClick={reset}>
            <RefreshCw size={15} />
            <span>Try again</span>
          </button>
          <Link href="/" className="c-button">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
