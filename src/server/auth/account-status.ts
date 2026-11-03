export type AccountStatus = "active" | "suspended" | "deleted";

const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  "active",
  "suspended",
  "deleted",
];

/**
 * Only an explicitly active account may use authenticated application paths.
 * A missing status is treated as "not yet provisioned" by the caller, not as
 * active here, so the policy stays explicit and easy to test.
 */
export function isActiveAccountStatus(status: unknown): boolean {
  return status === "active";
}

export function normalizeAccountStatus(status: unknown): AccountStatus | null {
  return typeof status === "string" &&
    (ACCOUNT_STATUSES as readonly string[]).includes(status)
    ? (status as AccountStatus)
    : null;
}
