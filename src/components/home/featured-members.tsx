import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Member } from "@/lib/supabase-data";

export function FeaturedMembersSection({
  members,
  title = "Featured Creators & Builders",
  eyebrow = "People in Motion",
  description = "Meet active builders, writers, and learners shaping The DropOut College community.",
}: {
  members: Member[];
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section className="section home-members-section" aria-label="Featured Community Members">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={11} className="home-hero-sparkle" /> {eyebrow}
          </div>
          <h2>{title}</h2>
          {description && <p className="section-description">{description}</p>}
        </div>
        <Link href="/explore" className="section-link">
          <span>Browse All Members</span> <ArrowRight size={13} />
        </Link>
      </div>

      <div className="home-members-grid">
        {members.map((member) => (
          <article key={member.id} className="home-member-card">
            <div className="home-member-header">
              <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="home-member-avatar-wrap">
                <div className="home-member-avatar" style={{ background: member.color || "var(--accent)" }}>
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={`${member.name} avatar`} loading="lazy" />
                  ) : (
                    <span>{member.initials || "M"}</span>
                  )}
                </div>
              </Link>

              <div className="home-member-meta">
                <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="home-member-name">
                  {member.name}
                </Link>
                <span className="home-member-handle">{member.handle}</span>
                <span className="home-member-category-pill">{member.category || "Member"}</span>
              </div>
            </div>

            <p className="home-member-bio">
              {member.bio && member.bio !== "No bio added yet" ? member.bio : "Learning, exploring, and building in the collective."}
            </p>

            {member.skills && member.skills.length > 0 && (
              <div className="home-member-skills">
                {member.skills.slice(0, 3).map((skill) => (
                  <span key={skill} className="home-skill-pill">
                    {skill}
                  </span>
                ))}
                {member.skills.length > 3 && (
                  <span className="home-skill-pill more">+{member.skills.length - 3}</span>
                )}
              </div>
            )}

            <div className="home-member-footer">
              <Link href={`/profile?member=${encodeURIComponent(member.id)}`} className="home-member-profile-btn">
                <span>View Profile</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
