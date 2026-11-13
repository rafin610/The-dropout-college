"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/components/app/navigation";

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="app-mobile-nav" aria-label="Mobile navigation">
      {PRIMARY_NAV.map((item) => {
        const active = item.isActive(pathname);
        const isCreate = item.href === "/post";
        const Icon = isCreate ? item.mobileIcon || item.icon : item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-mobile-nav-item${isCreate ? " app-mobile-nav-create" : ""}${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
          >
            <span className="app-mobile-nav-icon">
              <Icon size={isCreate ? 23 : 20} strokeWidth={isCreate ? 2.1 : 1.8} />
            </span>
            <span className="app-mobile-nav-label">{item.mobileLabel || item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
