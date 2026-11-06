import Link from "next/link";
import { ArrowRight, Compass, MessageCircle, Sparkles } from "lucide-react";
import { DISCORD_INVITE_URL } from "@/lib/site-cms-types";

export function FinalCommunityCTA({
  title = "Ready to build with relentless learners?",
  description = "Join The DropOut College to connect with self-directed developers, share your projects, read original essays, and build real-world momentum.",
  inviteUrl = DISCORD_INVITE_URL,
}: {
  title?: string;
  description?: string;
  inviteUrl?: string;
}) {
  return (
    <section className="section home-final-cta-section" aria-label="Join Community CTA">
      <div className="home-final-cta-card">
        <div className="home-final-cta-content">
          <div className="eyebrow home-final-cta-eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> The DropOut College
          </div>
          <h2 className="home-final-cta-title">{title}</h2>
          <p className="home-final-cta-copy">{description}</p>

          <div className="home-final-cta-actions">
            <Link
              href={inviteUrl}
              className="button button-primary"
              target={inviteUrl.startsWith("http") ? "_blank" : undefined}
              rel={inviteUrl.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <MessageCircle size={15} />
              <span>Join Discord</span>
            </Link>

            <Link href="/explore" className="button button-ghost">
              <Compass size={15} />
              <span>Explore Community</span>
            </Link>

            <Link href="/about" className="button button-ghost">
              <span>Read Our Story</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
