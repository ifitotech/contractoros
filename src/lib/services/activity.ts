import { createClient } from "@/lib/supabase/server";

export async function logActivity(params: {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  await supabase.from("activity_logs").insert({
    company_id: params.companyId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
  });
}
