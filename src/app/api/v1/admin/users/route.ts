import { requirePermission } from "@/server/auth/permissions";
import { toErrorResponse } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("users.manage");
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim();
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");

    const supabase = await createSupabaseServerClient();
    let query = supabase.from("profiles").select("id, display_name, username, bio, status, created_at, user_roles(role), users(email, account_status)", { count: "exact" });

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,users.email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (role) {
      query = query.filter("user_roles.role", "in", `(${role})`);
    }

    const { data, error, count } = await query.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;

    return Response.json({
      data: (data ?? []).map((row) => {
        const rowUser = Array.isArray(row.users) ? row.users[0] : row.users;
        return {
          id: row.id,
          displayName: row.display_name,
          username: row.username,
          email: rowUser?.email ?? "",
          status: row.status ?? "active",
          accountStatus: rowUser?.account_status ?? "active",
          createdAt: row.created_at,
          roles: Array.isArray(row.user_roles) ? row.user_roles.map((entry: any) => entry.role) : [],
        };
      }),
      pagination: { page, pageSize, total: count ?? 0 },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await requirePermission("users.manage");
    const payload = await request.json();
    const { userId, status, role } = payload ?? {};
    if (!userId) throw new Error("A user ID is required.");

    const supabase = await createSupabaseServerClient();
    if (status) {
      await supabase.from("profiles").update({ status, updated_at: new Date().toISOString() }).eq("id", userId);
      await supabase.from("users").update({ account_status: status, updated_at: new Date().toISOString() }).eq("id", userId);
    }

    if (role) {
      await supabase.from("user_roles").delete().eq("profile_id", userId);
      await supabase.from("user_roles").insert({ profile_id: userId, role });
    }

    return Response.json({ data: { updated: true }, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
