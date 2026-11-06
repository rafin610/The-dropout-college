import { ArrowUpRight, Sparkles, Terminal } from "lucide-react";
import type { FounderProfile } from "@/server/site-content";

export function FounderProfilesSection({
  founders,
  title = "Founders & Leadership",
  eyebrow = "Vision & Engineering",
  description = "The DropOut College was founded by self-taught builders who believe true competence is earned through curiosity, hands-on engineering, and building in the open.",
}: {
  founders: FounderProfile[];
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  const visibleFounders = founders.filter((f) => f.visible !== false);

  if (visibleFounders.length === 0) {
    return null;
  }

  return (
    <section className="section founder-section" id="founders" aria-label="Founders and Leadership">
      <div className="section-heading text-center-wrap">
        <div className="eyebrow">
          <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
        </div>
        <h2>{title}</h2>
        {description && <p className="section-description max-w-2xl">{description}</p>}
      </div>

      <div className="founder-grid">
        {visibleFounders.map((founder) => (
          <article key={founder.id} className="founder-card">
            {/* Header / Portrait */}
            <div className="founder-header">
              <div className="founder-portrait-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={founder.portraitUrl}
                  alt={`${founder.name} — ${founder.role}`}
                  className="founder-portrait-img"
                  loading="lazy"
                />
                <div className="founder-role-badge">
                  <span>{founder.role}</span>
                </div>
              </div>

              <div className="founder-title-block">
                <span className="founder-tagline">{founder.tagline}</span>
                <h3 className="founder-name">{founder.name}</h3>
                <span className="founder-location">{founder.location}</span>

                <div className="founder-cta-row">
                  <a
                    href={founder.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary founder-portfolio-btn"
                  >
                    <span>Visit Portfolio</span>
                    <ArrowUpRight size={14} />
                  </a>

                  {founder.githubUrl && (
                    <a
                      href={founder.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-ghost founder-github-btn"
                      aria-label={`${founder.name} on GitHub`}
                    >
                      <Terminal size={14} />
                      <span>GitHub</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quote / Mindset */}
            {founder.quote && (
              <blockquote className="founder-quote">
                &ldquo;{founder.quote}&rdquo;
              </blockquote>
            )}

            {/* Biography */}
            <div className="founder-bio-wrap">
              <h4 className="founder-subhead">Professional Background</h4>
              <p className="founder-bio">{founder.bio}</p>
            </div>

            {/* Skills */}
            {founder.skills && founder.skills.length > 0 && (
              <div className="founder-skills-wrap">
                <h4 className="founder-subhead">Key Competencies & Technologies</h4>
                <div className="founder-skill-pills">
                  {founder.skills.map((skill) => (
                    <span key={skill} className="founder-skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Journey Milestones */}
            {founder.journey && founder.journey.length > 0 && (
              <div className="founder-journey-wrap">
                <h4 className="founder-subhead">Professional Journey</h4>
                <div className="founder-journey-timeline">
                  {founder.journey.map((step, sIdx) => (
                    <div key={step.title} className="founder-journey-step">
                      <div className="journey-step-marker">
                        <span>0{sIdx + 1}</span>
                      </div>
                      <div className="journey-step-content">
                        <span className="journey-period">{step.period}</span>
                        <strong>{step.title}</strong>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {founder.socialLinks && founder.socialLinks.length > 0 && (
              <div className="founder-social-footer">
                <span className="founder-social-label">Connect:</span>
                <div className="founder-social-links">
                  {founder.socialLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="founder-social-a"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
