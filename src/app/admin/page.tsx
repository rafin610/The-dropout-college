import { AdminDashboard } from "@/components/admin-dashboard";
import { requirePermission } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePermission("dashboard.read");
  return <AdminDashboard />;
}
