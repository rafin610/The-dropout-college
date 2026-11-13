import type { MemberRole } from "@/server/auth/roles";

export interface DirectoryMember {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: MemberRole;
}
