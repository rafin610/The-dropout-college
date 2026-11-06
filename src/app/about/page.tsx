import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Compass, Heart, Lightbulb, MessageCircle, Rocket, Shield, Sparkles, Users } from "lucide-react";
import { DISCORD_INVITE_URL } from "@/lib/site-cms-types";
import { getFounders, getSiteSettings } from "@/server/site-content";
import { FounderProfilesSection } from "@/components/about/founder-profiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | The DropOut College",
  description:
    "Learn about The DropOut College's mission, story, philosophy, and our founders Ahmed Rafin and Nirob Mia. A community for self-driven learners and builders.",
};

export default async function AboutPage() {
  const [settings, founders] = await Promise.all([
    getSiteSettings(),
    getFounders(),
  ]);

  const inviteLink = DISCORD_INVITE_URL;

  return (
    <div className="about-page">
      {/* 1. About Hero */}
      <header className="about-hero">
        <Link href="/" className="about-back-link">
          <ArrowLeft size={13} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
        <div className="eyebrow about-eyebrow">
          <Sparkles size={11} className="home-hero-sparkle" /> About The DropOut College
        </div>
        <h1 className="about-hero-title">
          Education is what you build.<br />
          <span>Not just what you memorize.</span>
        </h1>
        <p className="about-hero-deck">
          {settings.who_we_are ||
            "The DropOut College is a learning-focused community built around curiosity, knowledge sharing, guidance, collaboration, and personal growth. We exist for those who choose to learn by doing."}
        </p>

        <div className="about-hero-actions">
          <a
            href={inviteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-primary"
          >
            <MessageCircle size={15} />
            <span>Join Our Community</span>
          </a>
          <Link href="/journal" className="button button-ghost">
            <span>Read The Journal</span>
            <ArrowRight size={14} />
          </Link>
          <a href="#founders" className="button button-ghost">
            <span>Meet The Founders</span>
          </a>
        </div>
      </header>

      {/* 2. Our Story */}
      <section className="section about-section" id="story">
        <div className="about-story-grid">
          <div className="about-story-intro">
            <div className="eyebrow">Our Origin</div>
            <h2>Why We Created The DropOut College</h2>
            <p className="lead-copy">
              Traditional education was built for a different century — one where knowledge was scarce, gatekept, and delivered in one-way lectures.
            </p>
          </div>

          <div className="about-story-narrative">
            <p>{settings.our_story || "The DropOut College was founded to help self-taught builders learn through real projects, open knowledge sharing, and collaboration."}</p>
          </div>
        </div>
      </section>

      {/* 3. Vision & Mission */}
      <section className="section about-pillars-section">
        <div className="about-pillars-grid">
          <div className="about-pillar-card">
            <div className="about-pillar-icon tone-lime">
              <Sparkles size={20} />
            </div>
            <div className="eyebrow">Long-Term Vision</div>
            <h3>Our Vision</h3>
            <p>
              {settings.our_vision ||
                "A world where practical skills, creative curiosity, and proof of work matter more than passive credentials. We envision an alternative global campus where anyone with an internet connection and the hunger to learn can become a world-class creator."}
            </p>
          </div>

          <div className="about-pillar-card">
            <div className="about-pillar-icon tone-cyan">
              <Rocket size={20} />
            </div>
            <div className="eyebrow">Active Purpose</div>
            <h3>Our Mission</h3>
            <p>
              {settings.our_mission ||
                "To empower self-driven learners, independent developers, writers, and creators by providing the collaborative community, editorial publication platforms, project feedback loops, and guidance needed to build sustainable modern careers."}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Our Goals */}
      <section className="section about-goals-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Milestones & Roadmap</div>
            <h2>Our Concrete Goals</h2>
            <p className="section-description">
              {settings.our_aim || "How we measure whether we are truly serving our members and community."}
            </p>
          </div>
        </div>

        <div className="about-goals-grid">
          <div className="about-goal-item">
            <span className="goal-num">01</span>
            <h4>Encourage Active Building</h4>
            <p>Help every member transition from passive tutorial watcher to active creator shipping public projects.</p>
          </div>
          <div className="about-goal-item">
            <span className="goal-num">02</span>
            <h4>Editorial Knowledge Sharing</h4>
            <p>Provide a prestigious publication venue via The DropOut Journal for members to articulate their research and technical insights.</p>
          </div>
          <div className="about-goal-item">
            <span className="goal-num">03</span>
            <h4>Safe & Welcoming Peer Support</h4>
            <p>Foster a culture where no question is too basic, beginners feel respected, and senior peers mentor with humility.</p>
          </div>
          <div className="about-goal-item">
            <span className="goal-num">04</span>
            <h4>Decentralized Opportunity</h4>
            <p>{settings.our_goal || "Connect self-taught builders from emerging tech ecosystems with global collaborators, co-founders, and opportunities."}</p>
          </div>
        </div>
      </section>

      {/* 5. Our Philosophy */}
      <section className="section about-philosophy-section">
        <div className="about-philosophy-panel">
          <div className="eyebrow">The Core Mindset</div>
          <h2>Our Learning Philosophy</h2>
          <div className="about-philosophy-grid">
            <div className="philosophy-item">
              <strong className="philosophy-title">01 / Learn by Shipping</strong>
              <p>{settings.our_philosophy || "You cannot learn swimming by reading about water. You learn coding by coding, design by designing, and writing by publishing."}</p>
            </div>
            <div className="philosophy-item">
              <strong className="philosophy-title">02 / Curiosity Over Conformity</strong>
              <p>Curiosity is the engine of intellect. When you follow your genuine interests, hard work feels like play.</p>
            </div>
            <div className="philosophy-item">
              <strong className="philosophy-title">03 / Teach What You Just Learned</strong>
              <p>The fastest way to cement a concept is to explain it to someone who is one step behind you.</p>
            </div>
            <div className="philosophy-item">
              <strong className="philosophy-title">04 / Proof of Work is Truth</strong>
              <p>Real repositories, live URLs, and published essays speak louder than resumes or traditional titles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Founders & CEO Profiles */}
      <FounderProfilesSection founders={founders} />

      {/* 7. Community Guidelines */}
      <section className="section about-guidelines-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Community Code</div>
            <h2>Principles of Participation</h2>
            <p className="section-description">
              How we protect and cultivate a healthy, inspiring environment for everyone.
            </p>
          </div>
        </div>

        <div className="about-guidelines-grid">
          <div className="guideline-card">
            <div className="guideline-icon">
              <Lightbulb size={18} />
            </div>
            <h4>Radical Curiosity</h4>
            <p>Ask deep questions, challenge assumptions constructively, and stay eager to understand how things work under the hood.</p>
          </div>

          <div className="guideline-card">
            <div className="guideline-icon">
              <Heart size={18} />
            </div>
            <h4>Respect & Constructive Feedback</h4>
            <p>Treat every member with kindness. When critiquing work, focus on the craft and offer actionable advice that elevates the builder.</p>
          </div>

          <div className="guideline-card">
            <div className="guideline-icon">
              <Users size={18} />
            </div>
            <h4>Collaborate Freely</h4>
            <p>Share snippets, resources, and insights openly. Celebrate each other&apos;s launches and milestones without jealousy.</p>
          </div>

          <div className="guideline-card">
            <div className="guideline-icon">
              <Shield size={18} />
            </div>
            <h4>Integrity & Authenticity</h4>
            <p>No spam, no misleading claims, and no stolen work. Be honest about what you know and transparent about what you are still learning.</p>
          </div>
        </div>
      </section>

      {/* 8. Final Join CTA */}
      <section className="section about-cta-section">
        <div className="about-cta-card">
          <div className="eyebrow">Start Your Journey</div>
          <h2>Become part of The DropOut College today.</h2>
          <p>
            Whether you are writing your first line of code, exploring AI workflows, or building an ambitious digital product, there is a seat for you at our table.
          </p>
          <div className="about-cta-btns">
            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary"
            >
              <MessageCircle size={15} />
              <span>Join Discord</span>
            </a>
            <Link href="/explore" className="button button-ghost">
              <Compass size={15} />
              <span>Explore Community</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
