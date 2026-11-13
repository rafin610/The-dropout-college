"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { MobileBottomNavigation } from "@/components/app/mobile-bottom-navigation";
import type { AppViewer } from "@/components/app/viewer";

export function AppFrame({
  viewer,
  children,
}: {
  viewer: AppViewer | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const focusedRoute = pathname === "/login" || pathname.startsWith("/journal/studio");

  if (focusedRoute) {
    return (
      <div className="app-focus-shell">
        <main className="app-focus-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <AppSidebar viewer={viewer} />
      <div className="app-workspace">
        <AppHeader viewer={viewer} />
        <main className="app-main">{children}</main>
      </div>
      <MobileBottomNavigation />
    </div>
  );
}
