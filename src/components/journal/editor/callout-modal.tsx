"use client";

import { useState } from "react";
import { X, Info, AlertTriangle, Lightbulb, CheckCircle2, AlertCircle, BookOpen, Compass } from "lucide-react";
import type { CalloutVariant } from "../renderer/callout-block";

interface CalloutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (variant: CalloutVariant, title: string) => void;
}

const VARIANTS: Array<{
  id: CalloutVariant;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "info", label: "Information", desc: "Helpful background context or notes", icon: Info },
  { id: "important", label: "Important", desc: "Crucial concepts readers must know", icon: AlertCircle },
  { id: "tip", label: "Tip", desc: "Best practices, productivity tips, shortcuts", icon: Lightbulb },
  { id: "warning", label: "Warning", desc: "Caveats, breaking changes, or pitfalls", icon: AlertTriangle },
  { id: "success", label: "Success", desc: "Expected outcomes, milestone achievements", icon: CheckCircle2 },
  { id: "definition", label: "Definition", desc: "Term glossary, theorem or formal definition", icon: BookOpen },
  { id: "example", label: "Example", desc: "Concrete scenario, practical walk-through", icon: Compass },
];

export function CalloutModal({ isOpen, onClose, onInsert }: CalloutModalProps) {
  const [variant, setVariant] = useState<CalloutVariant>("info");
  const [title, setTitle] = useState("");

  if (!isOpen) return null;

  function handleInsert() {
    onInsert(variant, title.trim());
    onClose();
  }

  return (
    <div className="journal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="journal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="journal-modal-header">
          <div className="journal-modal-title">
            <span>Insert Callout Box</span>
          </div>
          <button type="button" className="journal-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="journal-modal-body">
          <div className="journal-form-group">
            <label className="journal-form-label">Callout Type</label>
            <div className="journal-variant-grid">
              {VARIANTS.map((v) => {
                const Icon = v.icon;
                const isSelected = variant === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`journal-variant-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setVariant(v.id);
                      if (!title) setTitle(v.label);
                    }}
                  >
                    <div className="journal-variant-icon">
                      <Icon size={16} />
                    </div>
                    <div className="journal-variant-meta">
                      <strong>{v.label}</strong>
                      <small>{v.desc}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="journal-form-group">
            <label className="journal-form-label">Custom Title (Optional)</label>
            <input
              type="text"
              className="journal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Note on asymptotic complexity"
            />
          </div>
        </div>

        <div className="journal-modal-footer">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button button-primary" onClick={handleInsert}>
            Insert Callout
          </button>
        </div>
      </div>
    </div>
  );
}
