import { createSupabaseServerClient } from "@/server/supabase/server";

type AuditEntry = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  requestId?: string;
};

export async function writeAuditLog(entry: AuditEntry) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: entry.actorId,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    before_data: entry.beforeData,
    after_data: entry.afterData,
    request_id: entry.requestId,
  });

  if (error) throw error;
}