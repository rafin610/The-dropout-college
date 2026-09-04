import { requirePermission } from "@/server/auth/permissions";
import { ApiError } from "@/server/errors";
import { isSupabaseConfigured } from "@/server/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ControlRoomLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured() && process.env.NODE_ENV !== "production") return children;

  try {
    await requirePermission("dashboard.read");
  } catch (error) {
    if (error instanceof ApiError && ["UNAUTHENTICATED", "SERVICE_UNAVAILABLE"].includes(error.code)) redirect("/?admin=unavailable");
    throw error;
  }

  return children;
}