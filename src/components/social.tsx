import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Single source of truth for every external platform URL used across the
// sidebar, homepage social section, and footer.
export const EXTERNAL_LINKS = {
  youtube: "https://www.youtube.com/@TheDropOutCollege-v4k",
  facebook: "https://www.facebook.com/profile.php?id=61593723286324",
  instagram: "https://www.instagram.com/thedrop0utcollege/",
  x: "https://x.com/TheDropOutBD",
  odhyay: "https://odhyay.vercel.app/",
  discord: "https://discord.gg/3xfu5TMgF",
} as const;

function BrandSvg({ label, path, size = 20 }: { label: string; path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={label}
      aria-hidden={false}
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

export function YoutubeIcon({ size = 20 }: { size?: number }) {
  return <BrandSvg label="YouTube" size={size} path="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />;
}

export function FacebookIcon({ size = 20 }: { size?: number }) {
  return <BrandSvg label="Facebook" size={size} path="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />;
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return <BrandSvg label="Instagram" size={size} path="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 4 4 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.5a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z" />;
}

export function XIcon({ size = 20 }: { size?: number }) {
  return <BrandSvg label="X" size={size} path="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.4l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20z" />;
}

type SocialChannel = {
  key: "youtube" | "facebook" | "instagram" | "x";
  label: string;
  cta: string;
  blurb: string;
  href: string;
  tone: "coral" | "cyan" | "violet" | "lime";
  Icon: (props: { size?: number }) => React.ReactNode;
};

const CHANNELS: SocialChannel[] = [
  { key: "youtube", label: "YouTube", cta: "Watch & Learn", blurb: "Workshops, sessions, and stories from the community.", href: EXTERNAL_LINKS.youtube, tone: "coral", Icon: YoutubeIcon },
  { key: "facebook", label: "Facebook", cta: "Join the Community", blurb: "Announcements and conversations with fellow learners.", href: EXTERNAL_LINKS.facebook, tone: "cyan", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", cta: "Follow Us", blurb: "Daily sparks, moments, and behind-the-scenes.", href: EXTERNAL_LINKS.instagram, tone: "violet", Icon: InstagramIcon },
  { key: "x", label: "X", cta: "Follow Updates", blurb: "Quick updates on what we are building next.", href: EXTERNAL_LINKS.x, tone: "lime", Icon: XIcon },
];

export function StayConnected() {
  return (
    <section className="section" aria-labelledby="stay-connected-heading">
      <div className="social-panel">
        <div className="social-intro">
          <div className="eyebrow">Join the community</div>
          <h2 id="stay-connected-heading">Stay Connected</h2>
          <p>
            We are building a community. Come be part of it — follow The DropOut College
            across our platforms and stay connected with what we are building.
          </p>
        </div>
        <div className="social-grid">
          {CHANNELS.map(({ key, label, cta, blurb, href, tone, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`social-card tone-${tone}`}
              aria-label={`${label} — ${cta}`}
            >
              <span className="social-icon" aria-hidden="true"><Icon size={22} /></span>
              <span className="social-text">
                <strong>{label}</strong>
                <small>{blurb}</small>
              </span>
              <span className="social-cta">
                {cta} <ArrowUpRight size={13} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <strong>The DropOut College</strong>
          <p>A learning community for curious people who grow together through guidance, sharing, and collaboration.</p>
        </div>
        <nav className="site-footer-col" aria-label="Explore">
          <span className="site-footer-label">Explore</span>
          <Link href="/">Home</Link>
          <Link href="/explore">Community</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/events">Events</Link>
        </nav>
        <nav className="site-footer-col" aria-label="Connect">
          <span className="site-footer-label">Connect</span>
          <a href={EXTERNAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" aria-label="The DropOut College on YouTube">YouTube</a>
          <a href={EXTERNAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="The DropOut College on Facebook">Facebook</a>
          <a href={EXTERNAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="The DropOut College on Instagram">Instagram</a>
          <a href={EXTERNAL_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="The DropOut College on X">X</a>
          <a href={EXTERNAL_LINKS.odhyay} target="_blank" rel="noopener noreferrer" title="Visit ODHYAY — Digital Reading Platform" aria-label="Visit ODHYAY, our digital reading platform">ODHYAY</a>
        </nav>
      </div>
      <div className="site-footer-base">
        <span>© {year} The DropOut College</span>
        <a href={EXTERNAL_LINKS.discord} target="_blank" rel="noopener noreferrer">Join Discord ↗</a>
      </div>
    </footer>
  );
}
