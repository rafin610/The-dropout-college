"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Compass, FolderKanban, Home, LayoutDashboard, Search, Sparkles, Users, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Events", href: "/events", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" /><span>The DropOut College</span></Link>
        <div className="eyebrow sidebar-eyebrow">The talent network</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${pathname === href ? "active" : ""}`}><Icon size={17} strokeWidth={1.8} />{label}</Link>)}
        </nav>
        <div className="sidebar-group-label">Your space</div>
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}><LayoutDashboard size={17} strokeWidth={1.8} />Dashboard</Link>
        <Link href="/profile" className={`nav-item ${pathname === "/profile" ? "active" : ""}`}><Users size={17} strokeWidth={1.8} />My profile</Link>
        <div className="sidebar-spacer" />
        <div className="sidebar-status"><span className="status-pulse" /><div><strong>Community online</strong><span>286 creators active</span></div></div>
        <Link href="https://discord.gg/3xfu5TMgF" target="_blank" rel="noreferrer" className="discord-mini"><span>Join Discord</span><span>↗</span></Link>
      </aside>
      <main className="main-content">
        <header className="topbar"><button className="mobile-brand" onClick={() => setSearchOpen(false)}><Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" /><span>The DropOut College</span></button><div className="topbar-search"><Search size={16} /><span>Search the community</span><kbd>⌘ K</kbd></div><div className="topbar-actions"><button className="icon-button search-mobile" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search size={18} /></button><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><Link href="/login" className="login-link">Sign in</Link><Link href="/profile" className="user-avatar">MC</Link></div></header>
        {searchOpen && <div className="mobile-search"><Search size={16} /><input autoFocus placeholder="Search members, projects, skills..." /><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button></div>}
        <div className="page-wrap">{children}</div>
      </main>
      <nav className="mobile-nav">{nav.slice(0, 4).map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={18} /><span>{label}</span></Link>)}</nav>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) { return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>; }
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`pill pill-${tone}`}>{children}</span>; }