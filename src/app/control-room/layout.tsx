import Link from "next/link";
import { requirePermission } from "@/server/auth/permissions";
import { ApiError } from "@/server/errors";
import { isSupabaseConfigured } from "@/server/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ControlRoomLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured() && process.env.NODE_ENV !== "production") return children;

  try {
    await requirePermission("dashboard.read");
    return children;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login?next=/control-room");
      }
      if (error.code === "FORBIDDEN") {
        return (
          <main className="page-wrap">
            <div className="panel" style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
              <div className="eyebrow" style={{ color: "var(--coral)" }}>Access Restricted</div>
              <h1 style={{ fontSize: 28, margin: "14px 0" }}>Administrator Access Required</h1>
              <p className="member-bio" style={{ margin: "0 0 24px" }}>
                This area is reserved for platform administrators. If you believe this is an error, contact a super admin or sign in with your administrative account.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Link href="/" className="button button-ghost">Return to website</Link>
                <Link href="/login?next=/control-room" className="button button-primary">Switch account</Link>
              </div>
            </div>
          </main>
        );
      }
    }
    redirect("/?admin=unavailable");
  }
}