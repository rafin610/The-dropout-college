import { requirePermission } from "@/server/auth/permissions";
import { ApiError } from "@/server/errors";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function AdminLayout() {
  if (!isSupabaseConfigured() && process.env.NODE_ENV !== "production") redirect("/control-room");

  try {
    await requirePermission("dashboard.read");
  } catch (error) {
    if (error instanceof ApiError && ["UNAUTHENTICATED", "SERVICE_UNAVAILABLE"].includes(error.code)) redirect("/?admin=unavailable");
    throw error;
  }
  redirect("/control-room");
}