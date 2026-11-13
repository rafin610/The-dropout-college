"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { ButtonHTMLAttributes } from "react";

function subscribeTheme(change: () => void) {
  window.addEventListener("tdc-theme-change", change);
  return () => window.removeEventListener("tdc-theme-change", change);
}

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle({
  compact = false,
  className = "",
  ...props
}: {
  compact?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      document.documentElement.setAttribute("data-theme", next);
      window.localStorage.setItem("tdc-theme", next);
    } catch {
      // The preference simply will not persist.
    }
    window.dispatchEvent(new Event("tdc-theme-change"));
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={`app-theme-toggle${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      {...props}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}
