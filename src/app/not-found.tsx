import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="c-page-narrow">
      <div className="c-empty" style={{ marginTop: 24 }}>
        <div className="c-empty-icon">
          <Compass size={20} />
        </div>
        <h1>This page has left the campus.</h1>
        <p>The post may have been deleted, or the link is no longer valid.</p>
        <div className="c-actions-row" style={{ justifyContent: "center" }}>
          <Link href="/" className="c-button c-button-primary">
            Back to the feed
          </Link>
          <Link href="/journal" className="c-button">
            Read the Journal
          </Link>
        </div>
      </div>
    </div>
  );
}
