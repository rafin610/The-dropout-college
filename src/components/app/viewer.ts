import type { MemberRole } from "@/server/auth/roles";

export interface AppViewer {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: MemberRole;
}
