import { createClient } from "@/lib/supabase/server";

export async function createNotification(params: {
  companyId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedType?: string;
  relatedId?: string;
}) {
  const supabase = await createClient();

  await supabase.from("notifications").insert({
    company_id: params.companyId,
    user_id: params.userId,
    title: params.title,
    body: params.body,
    type: params.type,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
    is_read: false,
  });
}

export async function getUnreadNotifications(userId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getNotifications(userId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markAllAsRead(userId: string, companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("company_id", companyId).eq("is_read", false);
  if (error) throw error;
}

export async function markAsRead(notificationId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

// Convenience creators for common events
export async function notifyPOCreated(
  companyId: string,
  ownerUserId: string,
  poNumber: string,
  poId: string
) {
  await createNotification({
    companyId,
    userId: ownerUserId,
    title: "Nuevo Purchase Order",
    body: `Se creó el ${poNumber}. Pendiente de documento.`,
    type: "po_created",
    relatedType: "purchase_order",
    relatedId: poId,
  });
}

export async function notifyExceptionRequested(
  companyId: string,
  ownerUserId: string,
  poNumber: string,
  poId: string,
  reason: string
) {
  await createNotification({
    companyId,
    userId: ownerUserId,
    title: "Excepción solicitada",
    body: `${poNumber}: ${reason}`,
    type: "exception_requested",
    relatedType: "purchase_order",
    relatedId: poId,
  });
}
