import type { LucideIcon } from "lucide-react";
import { BookOpen, House, Plus, SquarePen, UserRound, UsersRound } from "lucide-react";

export interface PrimaryNavItem {
  label: string;
  /** Shorter label used by the mobile navigation bar. */
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
  /** The icon used by the highlighted mobile create action. */
  mobileIcon?: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export const PRIMARY_NAV: PrimaryNavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: House,
    isActive: (pathname) => pathname === "/",
  },
  {
    label: "Members",
    href: "/members",
    icon: UsersRound,
    isActive: (pathname) => pathname.startsWith("/members"),
  },
  {
    label: "Create Post",
    mobileLabel: "Create",
    href: "/post",
    icon: SquarePen,
    mobileIcon: Plus,
    isActive: (pathname) => pathname === "/post" || pathname.startsWith("/p/"),
  },
  {
    label: "Journal",
    href: "/journal",
    icon: BookOpen,
    isActive: (pathname) => pathname.startsWith("/journal") || pathname.startsWith("/staff"),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserRound,
    isActive: (pathname) => pathname.startsWith("/profile"),
  },
];
