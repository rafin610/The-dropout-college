"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Compass, FolderKanban, Home, LayoutDashboard, Menu, Search, Sparkles, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const nav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Events", href: "/events", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; created_at: string; read_at: string | null; resource_type: string | null; resource_id: string | null }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAccountName((data.user?.user_metadata?.full_name as string | undefined) || (data.user?.user_metadata?.name as string | undefined) || null);
      if (data.user) {
        // Quick permission check
        fetch("/api/v1/admin/overview")
          .then((res) => { if (res.ok) setIsAdmin(true); })
          .catch(() => {});
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAccountName((session?.user?.user_metadata?.full_name as string | undefined) || (session?.user?.user_metadata?.name as string | undefined) || null);
      if (!session?.user) {
        setIsAdmin(false);
      } else {
        fetch("/api/v1/admin/overview")
          .then((res) => setIsAdmin(res.ok))
          .catch(() => setIsAdmin(false));
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function loadNotifications() {
    if (!userId) return;
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data ?? []);
      }
    } catch {
      // Fallback
    } finally {
      setNotificationsLoading(false);
    }
  }

  function toggleNotifications() {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) void loadNotifications();
  }

  async function markAllNotificationsRead() {
    try {
      await fetch("/api/v1/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    } catch {
      // Ignore
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserId(null);
    setAccountName(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" /><span>The DropOut College</span></Link>
        <div className="eyebrow sidebar-eyebrow">The talent network</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-item ${pathname === href ? "active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-group-label">Your space</div>
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}><LayoutDashboard size={17} strokeWidth={1.8} />Dashboard</Link>
        <Link href="/profile" className={`nav-item ${pathname === "/profile" ? "active" : ""}`}><Users size={17} strokeWidth={1.8} />My profile</Link>
        {isAdmin && (
          <Link href="/control-room" className={`nav-item ${pathname.startsWith("/control-room") || pathname.startsWith("/admin") ? "active" : ""}`} style={{ color: "var(--lime)" }}>
            <Sparkles size={17} strokeWidth={1.8} />Control Room
          </Link>
        )}
        <div className="sidebar-spacer" />
        <div className="sidebar-status"><span className="status-pulse" /><div><strong>Community online</strong><span>Live network</span></div></div>
        <Link href="https://discord.gg/3xfu5TMgF" target="_blank" rel="noreferrer" className="discord-mini"><span>Join Discord</span><span>↗</span></Link>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu-toggle" aria-label="Open menu" onClick={() => setMobileMenuOpen((value) => !value)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="mobile-brand" onClick={() => { setSearchOpen(false); setMobileMenuOpen(false); }}>
            <Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" /><span>The DropOut College</span>
          </Link>
          <button
            className="topbar-search"
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search dialog"
            style={{ background: "transparent", border: 0, textAlign: "left", cursor: "pointer" }}
          >
            <Search size={16} />
            <span>Search the community</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <button className="icon-button search-mobile" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
            <div style={{ position: "relative" }}>
              <button className="icon-button" aria-label="Notifications" onClick={toggleNotifications}>
                <Bell size={18} />
                {unreadCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />}
              </button>

              {notificationsOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 36,
                    width: 320,
                    background: "rgba(20,24,22,0.96)",
                    border: "1px solid var(--line)",
                    backdropFilter: "blur(20px)",
                    borderRadius: 6,
                    padding: 16,
                    zIndex: 100,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <strong style={{ fontSize: 13, color: "#f4f6ee" }}>Notifications</strong>
                    {notifications.length > 0 && (
                      <button onClick={markAllNotificationsRead} style={{ background: "transparent", border: 0, color: "var(--lime)", fontSize: 11, cursor: "pointer" }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notificationsLoading ? (
                    <p style={{ color: "var(--muted)", fontSize: 12, margin: "12px 0" }}>Loading...</p>
                  ) : !userId ? (
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                      <p style={{ color: "var(--muted)", fontSize: 11, margin: "0 0 10px" }}>Sign in to view notifications</p>
                      <Link href="/login" className="button button-primary" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => setNotificationsOpen(false)}>
                        Sign in
                      </Link>
                    </div>
                  ) : notifications.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 11, margin: "14px 0", textAlign: "center" }}>No notifications yet</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                      {notifications.map((n) => (
                        <Link key={n.id} href={n.resource_type === "event" && n.resource_id ? `/events/${n.resource_id}` : "/dashboard"} onClick={() => { if (!n.read_at) void fetch("/api/v1/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); setNotificationsOpen(false); }} style={{ display: "block", padding: "8px 10px", background: n.read_at ? "transparent" : "rgba(216,255,98,0.06)", border: "1px solid var(--line)", borderRadius: 4 }}>
                          <strong style={{ display: "block", fontSize: 12, color: "#fff" }}>{n.title}</strong>
                          <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{n.body}</span>
                          <small style={{ color: "var(--muted)", fontSize: 9 }}>{new Date(n.created_at).toLocaleDateString()}</small>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {userId ? (
              <>
                <Link href="/profile" className="login-link">{accountName || "My profile"}</Link>
                <button className="login-link" onClick={signOut} style={{ background: "transparent", border: 0, cursor: "pointer" }}>Sign out</button>
              </>
            ) : (
              <Link href="/login" className="login-link">Sign in</Link>
            )}
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="mobile-menu-panel" aria-label="Mobile navigation">
            {nav.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href ? "active" : ""} onClick={() => setMobileMenuOpen(false)}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""} onClick={() => setMobileMenuOpen(false)}><LayoutDashboard size={18} /><span>Dashboard</span></Link>
            <Link href="/profile" className={pathname === "/profile" ? "active" : ""} onClick={() => setMobileMenuOpen(false)}><Users size={18} /><span>My profile</span></Link>
            {isAdmin && (
              <Link href="/control-room" className={pathname.startsWith("/control-room") ? "active" : ""} onClick={() => setMobileMenuOpen(false)} style={{ color: "var(--lime)" }}>
                <Sparkles size={18} /><span>Control Room</span>
              </Link>
            )}
          </div>
        )}

        {/* Global Search Modal */}
        {searchOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,12,11,0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
              display: "grid",
              placeItems: "start center",
              paddingTop: "14vh",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          >
            <div
              style={{
                width: "min(600px, 92vw)",
                background: "rgba(22,26,24,0.98)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
              }}
            >
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
                <Search size={18} color="var(--lime)" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members, skills, projects, events..."
                  style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "#fff", fontSize: 14 }}
                />
                <button type="button" onClick={() => setSearchOpen(false)} style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </form>
              <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--muted)", fontSize: 11 }}>
                <span>Press <strong>Enter</strong> to explore results</span>
                <span>ESC to close</span>
              </div>
            </div>
          </div>
        )}

        <div className="page-wrap">{children}</div>
      </main>
      <nav className="mobile-nav">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
        {userId ? (
          <Link href="/profile" className={pathname === "/profile" ? "active" : ""}>
            <Users size={18} />
            <span>Profile</span>
          </Link>
        ) : (
          <Link href="/login" className={pathname === "/login" ? "active" : ""}>
            <Users size={18} />
            <span>Login</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) { return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>; }
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`pill pill-${tone}`}>{children}</span>; }
