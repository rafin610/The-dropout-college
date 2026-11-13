"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useFollow } from "@/lib/social-client";
import { Avatar } from "@/components/avatar";
import type { DirectoryMember } from "@/components/members/types";

export function MemberCard({
  member,
  viewerId,
  isFollowing,
  followStateLoading,
  onFollowChange,
  onAuthRequired,
}: {
  member: DirectoryMember;
  viewerId: string | null;
  isFollowing: boolean;
  followStateLoading: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  onAuthRequired: () => void;
}) {
  const role = member.role === "admin" ? "Admin" : member.role === "moderator" ? "Moderator" : "Member";
  const follow = useFollow(member.id, viewerId, {
    initialIsFollowing: isFollowing,
    skipInitialFetch: true,
    onAuthRequired,
    onFollowChange,
  });
  const isSelf = viewerId === member.id;

  return (
    <article className="member-directory-card">
      <Link
        href={`/profile/${encodeURIComponent(member.username)}`}
        className="member-directory-main"
        aria-label={`Open ${member.displayName}'s profile`}
      >
        <div className="member-directory-top">
          <Avatar src={member.avatarUrl} name={member.displayName} size={48} />
          <div className="member-directory-identity">
            <strong>{member.displayName}</strong>
            <span>@{member.username}</span>
          </div>
          {member.role !== "member" && (
            <span className={`c-role-badge ${member.role}`}>{role}</span>
          )}
        </div>

        <p className={member.bio ? "member-directory-bio" : "member-directory-bio is-empty"}>
          {member.bio || "A quiet member of the campus."}
        </p>
      </Link>

      <div className="member-directory-actions">
        {isSelf ? (
          <span className="member-follow-self">You</span>
        ) : (
          <button
            type="button"
            className={`member-follow-button${follow.isFollowing ? " following" : ""}`}
            onClick={() => void follow.toggle()}
            disabled={follow.loading || followStateLoading}
            aria-pressed={follow.isFollowing}
          >
            {follow.loading ? <Loader2 size={14} className="spin" /> : null}
            {follow.loading ? "Updating…" : follow.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
      {follow.error && <p className="member-follow-error" role="alert">{follow.error}</p>}
    </article>
  );
}
