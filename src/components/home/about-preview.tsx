import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { SiteSettingsMap } from "@/server/site-content";

function toPreview(text: string, maxSentences = 3, maxCharacters = 420): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const sentences = clean.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) ?? [clean];
  let preview = sentences.slice(0, maxSentences).join(" ").trim();

  if (preview.length > maxCharacters) {
    preview = `${preview.slice(0, maxCharacters).replace(/\s+\S*$/, "").trimEnd()}…`;
  }

  return preview;
}

export function AboutPreviewSection({
  settings,
  title = "A learning community built around curiosity, not credentials.",
  eyebrow = "Who We Are",
}: {
  settings: SiteSettingsMap;
  title?: string;
  eyebrow?: string;
}) {
  const combined = [settings.who_we_are, settings.our_mission]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");
  const preview = toPreview(combined);

  if (!preview) return null;

  return (
    <section className="section about-preview-section" aria-labelledby="about-preview-heading">
      <div className="about-preview-grid">
        <div className="about-preview-intro">
          <div className="eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" aria-hidden="true" />{" "}
            {eyebrow}
          </div>
          <h2 id="about-preview-heading" className="about-preview-title">
            {title}
          </h2>
        </div>

        <div className="about-preview-body">
          <p className="about-preview-copy">{preview}</p>
          <Link href="/about" className="about-preview-link">
            <span>See More About The College</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
