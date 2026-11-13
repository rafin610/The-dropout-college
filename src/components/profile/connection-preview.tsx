"use client";

import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { FollowMember } from "@/lib/social-client";

export function ConnectionPreview({
  label,
  count,
  people,
  loading,
  onClick,
}: {
  label: string;
  count: number;
  people: FollowMember[];
  loading: boolean;
  onClick: () => void;
}) {
  const formattedCount = count.toLocaleString();
  return (
    <button
      type="button"
      className="profile-connection-trigger"
      onClick={onClick}
      aria-label={`View ${loading ? "" : `${formattedCount} `}${label.toLowerCase()}`}
    >
      <span className="profile-connection-copy">
        <span className="profile-connection-label">{label}</span>
        <span className="profile-connection-count">{loading ? "…" : count.toLocaleString()}</span>
      </span>
      <span className="profile-connection-avatars" aria-hidden="true">
        {people.slice(0, 2).map((row, index) => {
          const person = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          if (!person) return null;
          return (
            <Avatar
              key={person.id}
              src={person.avatar_url}
              name={person.display_name}
              size={30}
              className={index === 0 ? "profile-connection-avatar-first" : "profile-connection-avatar-next"}
            />
          );
        })}
      </span>
      <ChevronRight className="profile-connection-chevron" size={16} aria-hidden="true" />
    </button>
  );
}
