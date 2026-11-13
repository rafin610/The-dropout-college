"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, SquarePen } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/app/sign-out-button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import type { AppViewer } from "@/components/app/viewer";

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/members")) return "Members";
  if (pathname === "/post") return "Create Post";
  if (pathname.startsWith("/p/")) return "Post";
  if (pathname.startsWith("/journal/studio")) return "Journal studio";
  if (pathname.startsWith("/journal")) return "Journal";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/staff")) return "Staff";
  if (pathname.startsWith("/login")) return "Sign in";
  return "Campus";
}

export function AppHeader({ viewer }: { viewer: AppViewer | null }) {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-heading">
          <Link href="/" className="app-header-logo" aria-label="Campus home">
            <Image src="/logo.svg" alt="" width={26} height={26} priority />
          </Link>
          <div className="app-header-titles">
            <span className="app-header-eyebrow">Campus</span>
            <h1>{pageTitle(pathname)}</h1>
          </div>
        </div>

        <div className="app-header-actions">
          <Link href="/post" className="app-header-create">
            <SquarePen size={15} strokeWidth={1.9} />
            <span>New post</span>
          </Link>
          <ThemeToggle compact className="app-header-theme" />
          {viewer ? (
            <>
              <Link href="/profile" className="app-header-account" aria-label="Open your profile">
                <Avatar src={viewer.avatarUrl} name={viewer.displayName} size={30} />
                <span>{viewer.displayName}</span>
              </Link>
              <SignOutButton className="app-header-signout" />
            </>
          ) : (
            <Link href="/login" className="app-header-signin">
              <LogIn size={15} />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
