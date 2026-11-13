"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Avatar } from "@/components/avatar";
import { PRIMARY_NAV } from "@/components/app/navigation";
import { SignOutButton } from "@/components/app/sign-out-button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import type { AppViewer } from "@/components/app/viewer";

function roleLabel(role: AppViewer["role"]) {
  return role === "admin" ? "Admin" : role === "moderator" ? "Moderator" : "Member";
}

function subscribeSidebar(change: () => void) {
  window.addEventListener("tdc-sidebar-change", change);
  return () => window.removeEventListener("tdc-sidebar-change", change);
}

function readSidebar(): "expanded" | "collapsed" {
  if (typeof document === "undefined") return "expanded";
  return document.documentElement.getAttribute("data-sidebar") === "collapsed"
    ? "collapsed"
    : "expanded";
}

export function AppSidebar({ viewer }: { viewer: AppViewer | null }) {
  const pathname = usePathname();
  const sidebarState = useSyncExternalStore(subscribeSidebar, readSidebar, () => "expanded" as const);
  const expanded = sidebarState === "expanded";

  function toggleSidebar() {
    const next = expanded ? "collapsed" : "expanded";
    try {
      document.documentElement.setAttribute("data-sidebar", next);
      window.localStorage.setItem("tdc-sidebar", next);
    } catch {
      // The navigation still works; the preference simply will not persist.
    }
    window.dispatchEvent(new Event("tdc-sidebar-change"));
  }

  return (
    <aside
      className={`app-sidebar${expanded ? " is-expanded" : " is-collapsed"}`}
      aria-label="Campus navigation"
      data-expanded={expanded}
    >
      <div className="app-sidebar-head">
        <Link href="/" className="app-brand" aria-label="The DropOut College campus home">
          <span className="app-brand-mark">
            <Image src="/logo.svg" alt="" width={28} height={28} priority />
          </span>
          <span className="app-brand-copy">
            <strong>The DropOut College</strong>
            <small>Campus</small>
          </span>
        </Link>

        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
          aria-expanded={expanded}
          title={expanded ? "Collapse navigation" : "Expand navigation"}
        >
          {expanded ? <PanelLeftClose size={17} strokeWidth={1.8} /> : <PanelLeftOpen size={17} strokeWidth={1.8} />}
        </button>
      </div>

      <div className="app-sidebar-rule" aria-hidden="true" />

      <nav className="app-sidebar-nav" aria-label="Primary navigation">
        {PRIMARY_NAV.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          const isCreate = item.href === "/post";

          if (isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-sidebar-create${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                aria-label="Create post"
                title={expanded ? undefined : "Create post"}
              >
                <span className="app-sidebar-create-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="app-sidebar-create-label">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={expanded ? undefined : item.label}
            >
              <span className="app-nav-icon">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span className="app-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="app-sidebar-bottom">
        <div className="app-appearance-row">
          <span className="app-appearance-label">Appearance</span>
          <ThemeToggle compact />
        </div>

        {viewer ? (
          <div className="app-sidebar-account">
            <Link
              href="/profile"
              className="app-account-link"
              aria-label="Open your profile"
              title={expanded ? undefined : viewer.displayName}
            >
              <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={36} />
              <span className="app-account-copy">
                <strong>{viewer.displayName}</strong>
                <small>{roleLabel(viewer.role)}</small>
              </span>
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="app-sidebar-signin"
            aria-label="Sign in to the campus"
            title={expanded ? undefined : "Sign in"}
          >
            <LogIn size={17} strokeWidth={1.8} />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
