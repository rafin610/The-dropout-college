"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, Compass, FolderKanban, Home, LayoutDashboard, Menu, Moon, Search, Sparkles, Sun, Users, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EXTERNAL_LINKS, SiteFooter } from "@/components/social";

const nav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Events", href: "/events", icon: Sparkles },
];

function subscribeTheme(change: () => void) {
  window.addEventListener("tdc-theme-change", change);
  return () => window.removeEventListener("tdc-theme-change", change);
}

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Theme lives on <html data-theme>; the pre-paint script in layout sets it
  // from storage / OS preference, and this subscribes to changes so the
  // toggle icon always reflects the real theme without hydration mismatch.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      if (next === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      window.localStorage.setItem("tdc-theme", next);
    } catch {
      // Theme simply won't persist.
    }
    window.dispatchEvent(new Event("tdc-theme-change"));
  }

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; created_at: string; read_at: string | null; resource_type: string | null; resource_id: string | null }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem("tdc-sidebar-collapsed") === "1");
    } catch {
      // Collapse preference simply won't persist.
    }
    setSidebarReady(true);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("tdc-sidebar-collapsed", next ? "1" : "0");
      } catch {
        // Ignore persistence errors.
      }
      return next;
    });
  }

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (mobile) {
        // Mobile uses the overlay drawer, never the desktop icon-only mode.
        setMobileMenuOpen(false);
      }
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

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
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Realtime notification inserts + initial unread fetch for the badge.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    void fetch("/api/v1/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setNotifications(json.data ?? []);
      })
      .catch(() => {});
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id: string; title: string; body: string; created_at: string; read_at: string | null; resource_type: string | null; resource_id: string | null };
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [{ ...row }, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

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
  const collapsed = !isMobile && sidebarCollapsed;
  const showSidebarLabels = !collapsed;
  const shellClass = `app-shell${collapsed ? " sidebar-collapsed" : ""}${sidebarReady ? " sidebar-ready" : ""}`;

  function closeMobileDrawer() {
    setMobileMenuOpen(false);
  }

  return (
    <div className={shellClass}>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`} aria-label="Sidebar navigation">
        <Link href="/" className={`brand${collapsed ? " compact" : ""}`} title={collapsed ? "The DropOut College — expand sidebar" : "The DropOut College"}>
          <Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" />
          {showSidebarLabels && <span>The DropOut College</span>}
        </Link>
        {!isMobile && <div className="eyebrow sidebar-eyebrow">{showSidebarLabels ? "The talent network" : "· · ·"}</div>}
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? "active" : ""}${collapsed ? " collapsed" : ""}`}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.8} />
              {showSidebarLabels && <span className="nav-label">{label}</span>}
            </Link>
          ))}
          <a
            href={EXTERNAL_LINKS.odhyay}
            target="_blank"
            rel="noopener noreferrer"
            className={`nav-item nav-external${collapsed ? " collapsed" : ""}`}
            title={collapsed ? "ODHYAY" : "Visit ODHYAY — Digital Reading Platform"}
            aria-label="Visit ODHYAY, our digital reading platform (opens in a new tab)"
          >
            <BookOpen size={17} strokeWidth={1.8} />
            {showSidebarLabels && <span className="nav-label">ODHYAY</span>}
            {showSidebarLabels && <span className="nav-external-mark" aria-hidden="true">↗</span>}
          </a>
        </nav>
        {showSidebarLabels && <div className="sidebar-group-label">Your space</div>}
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}${collapsed ? " collapsed" : ""}`} title={collapsed ? "Dashboard" : undefined} aria-label="Dashboard">
          <LayoutDashboard size={17} strokeWidth={1.8} />
          {showSidebarLabels && <span className="nav-label">Dashboard</span>}
        </Link>
        <Link href="/profile" className={`nav-item ${pathname === "/profile" ? "active" : ""}${collapsed ? " collapsed" : ""}`} title={collapsed ? "My profile" : undefined} aria-label="My profile">
          <Users size={17} strokeWidth={1.8} />
          {showSidebarLabels && <span className="nav-label">My profile</span>}
        </Link>
        {isAdmin && (
          <Link href="/control-room" className={`nav-item ${pathname.startsWith("/control-room") || pathname.startsWith("/admin") ? "active" : ""}${collapsed ? " collapsed" : ""}`} style={{ color: "var(--lime)" }} title={collapsed ? "Control Room" : undefined} aria-label="Control Room">
            <Sparkles size={17} strokeWidth={1.8} />
            {showSidebarLabels && <span className="nav-label">Control Room</span>}
          </Link>
        )}
        <div className="sidebar-spacer" />
        <div className="sidebar-status" title={collapsed ? "Community online" : undefined}><span className="status-pulse" />{showSidebarLabels && <div><strong>Community online</strong><span>Live network</span></div>}</div>
        <Link href="https://discord.gg/3xfu5TMgF" target="_blank" rel="noreferrer" className={`discord-mini${collapsed ? " compact" : ""}`} title={collapsed ? "Join Discord" : undefined}><span>{showSidebarLabels ? "Join Discord" : "◎"}</span>{showSidebarLabels && <span>↗</span>}</Link>
      </aside>

      {/* Mobile overlay drawer — icon-only collapse is desktop-only */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-root" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-drawer-overlay" onClick={closeMobileDrawer} aria-hidden="true" />
          <aside className="mobile-drawer">
            <div className="mobile-drawer-head">
              <Link href="/" className="mobile-brand" onClick={closeMobileDrawer}>
                <Image src="/logo.svg" alt="The DropOut College" width={30} height={30} className="brand-logo" /><span>The DropOut College</span>
              </Link>
              <button className="icon-button" aria-label="Close menu" onClick={closeMobileDrawer}>
                <X size={18} />
              </button>
            </div>
            <nav className="mobile-drawer-nav" aria-label="Mobile navigation">
              {nav.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} className={pathname === href ? "active" : ""} onClick={closeMobileDrawer}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
              <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""} onClick={closeMobileDrawer}><LayoutDashboard size={18} /><span>Dashboard</span></Link>
              <Link href="/profile" className={pathname === "/profile" ? "active" : ""} onClick={closeMobileDrawer}><Users size={18} /><span>My profile</span></Link>
              <a href={EXTERNAL_LINKS.odhyay} target="_blank" rel="noopener noreferrer" onClick={closeMobileDrawer} title="Visit ODHYAY — Digital Reading Platform" aria-label="Visit ODHYAY, our digital reading platform (opens in a new tab)"><BookOpen size={18} /><span>ODHYAY ↗</span></a>
              {isAdmin && (
                <Link href="/control-room" className={pathname.startsWith("/control-room") ? "active" : ""} onClick={closeMobileDrawer} style={{ color: "var(--lime)" }}>
                  <Sparkles size={18} /><span>Control Room</span>
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}

      <main className="main-content">
        <header className="topbar">
          {!isMobile && (
            <button
              className="icon-button desktop-menu-toggle"
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
            >
              <Menu size={18} />
            </button>
          )}
          <button className="mobile-menu-toggle" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}>
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
            <button
              className="icon-button"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to daylight theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to daylight theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button search-mobile" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
            <div style={{ position: "relative" }}>
              <button className="icon-button notification-bell" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={notificationsOpen} onClick={toggleNotifications}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <>
                  <div className="notification-scrim" onClick={() => setNotificationsOpen(false)} aria-hidden="true" />
                  <div className="notification-panel" role="dialog" aria-label="Notifications">
                    <div className="notification-panel-head">
                      <strong>Notifications</strong>
                      {notifications.length > 0 && (
                        <button onClick={markAllNotificationsRead} className="notification-mark-all">
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notificationsLoading ? (
                      <p className="notification-state">Loading notifications…</p>
                    ) : !userId ? (
                      <div className="notification-state">
                        <p>Sign in to view notifications</p>
                        <Link href="/login" className="button button-primary" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => setNotificationsOpen(false)}>
                          Sign in
                        </Link>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="notification-state">No notifications yet</p>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.resource_type === "event" && n.resource_id ? `/events/${n.resource_id}` : n.resource_type === "project" && n.resource_id ? `/projects/${n.resource_id}` : "/dashboard"}
                            onClick={() => {
                              if (!n.read_at) {
                                void fetch("/api/v1/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
                                setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
                              }
                              setNotificationsOpen(false);
                            }}
                            className={`notification-item${n.read_at ? "" : " unread"}`}
                          >
                            <span className="notification-dot" aria-hidden="true" />
                            <span className="notification-text">
                              <strong>{n.title}</strong>
                              <span>{n.body}</span>
                              <small>{timeAgo(n.created_at)}</small>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
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

        {/* Global Search Modal */}
        {searchOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--overlay)",
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
                background: "var(--popover)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                boxShadow: "var(--shadow-lg)",
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
                  style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "var(--text)", fontSize: 14 }}
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
        <SiteFooter />
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

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
