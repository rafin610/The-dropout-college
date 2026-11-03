export const MEMBER_STATUSES = ["active", "suspended", "deleted"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const ASSIGNABLE_ROLES = [
  "member",
  "mentor",
  "event_organizer",
  "moderator",
  "admin",
] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isMemberStatus(value: unknown): value is MemberStatus {
  return (
    typeof value === "string" &&
    (MEMBER_STATUSES as readonly string[]).includes(value)
  );
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

export function deactivatesAccount(status: MemberStatus): boolean {
  return status === "suspended" || status === "deleted";
}

export interface MemberActor {
  id: string;
  isSuperAdmin: boolean;
}

export interface MemberTarget {
  id: string;
  roles: string[];
}

export interface MemberPolicyResult {
  allowed: boolean;
  message?: string;
}

/**
 * Mirrors the checks enforced transactionally in the admin_update_member RPC.
 * Keeping them here as well gives the API a stable, readable error before the
 * RPC is called and makes the hierarchy rules unit-testable.
 */
export function canManageMember(
  actor: MemberActor,
  target: MemberTarget,
): MemberPolicyResult {
  if (actor.id === target.id) {
    return {
      allowed: false,
      message: "You cannot change your own membership.",
    };
  }

  if (!actor.isSuperAdmin && target.roles.includes("super_admin")) {
    return {
      allowed: false,
      message: "Only a super admin can change another super admin.",
    };
  }

  if (!actor.isSuperAdmin && target.roles.includes("admin")) {
    return {
      allowed: false,
      message: "Only a super admin can change another admin.",
    };
  }

  return { allowed: true };
}

/**
 * True when this update would remove the target's super-admin role or make
 * the account inactive. The caller must still verify that another active
 * super admin exists; the RPC performs that check under a transaction lock.
 */
export function removesSuperAdminAccess(
  currentRoles: string[],
  nextRole: string | undefined,
  nextStatus: MemberStatus | undefined,
): boolean {
  if (!currentRoles.includes("super_admin")) return false;
  if (nextRole !== undefined && nextRole !== "super_admin") return true;
  if (nextStatus !== undefined && deactivatesAccount(nextStatus)) return true;
  return false;
}
