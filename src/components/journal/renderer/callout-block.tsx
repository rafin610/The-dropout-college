"use client";

import React from "react";
import {
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Compass,
} from "lucide-react";

export type CalloutVariant =
  | "info"
  | "important"
  | "tip"
  | "warning"
  | "success"
  | "definition"
  | "example";

interface CalloutBlockProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

const variantConfig: Record<
  CalloutVariant,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  info: { label: "Information", icon: Info },
  important: { label: "Important", icon: AlertCircle },
  tip: { label: "Tip", icon: Lightbulb },
  warning: { label: "Warning", icon: AlertTriangle },
  success: { label: "Success", icon: CheckCircle2 },
  definition: { label: "Definition", icon: BookOpen },
  example: { label: "Example", icon: Compass },
};

export function CalloutBlock({
  variant = "info",
  title,
  children,
}: CalloutBlockProps) {
  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;

  return (
    <aside className={`journal-callout journal-callout-${variant}`} role="note">
      <div className="journal-callout-header">
        <Icon size={16} className="journal-callout-icon" />
        <span className="journal-callout-title">{title || config.label}</span>
      </div>
      <div className="journal-callout-content">{children}</div>
    </aside>
  );
}
