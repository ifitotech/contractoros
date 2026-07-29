import { createClient } from "@/lib/supabase/server";
import { canTransition, type PO_TRANSITIONS } from "@/lib/po-status";
import type { POStatus } from "@/types/database";

async function generatePONumber(companyId: string): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  // Count existing POs this year for the company
  const { count } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .like("number", `PO-${year}-%`);

  const next = (count ?? 0) + 1;
  const padded = String(next).padStart(5, "0");
  return `PO-${year}-${padded}`;
}

export async function createPurchaseOrder(
  companyId: string,
  userId: string,
  data: {
    project_id: string;
    vendor_name: string;
    category?: string;
    description?: string;
    estimated_amount?: number;
  }
) {
  const supabase = await createClient();
  const number = await generatePONumber(companyId);

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: companyId,
      project_id: data.project_id,
      created_by: userId,
      number,
      vendor_name: data.vendor_name,
      category: data.category ?? null,
      description: data.description ?? null,
      estimated_amount: data.estimated_amount ?? null,
      status: "pending_document", // starts waiting for document
    })
    .select()
    .single();

  if (error) throw error;

  // Log status history
  await supabase.from("purchase_order_status_history").insert({
    purchase_order_id: po.id,
    from_status: null,
    to_status: "pending_document",
    changed_by: userId,
    notes: "PO creado",
  });

  return po;
}

export async function transitionPOStatus(
  poId: string,
  companyId: string,
  userId: string,
  toStatus: POStatus,
  notes?: string
) {
  const supabase = await createClient();

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", poId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !po) throw fetchError ?? new Error("PO not found");

  if (!canTransition(po.status as POStatus, toStatus)) {
    throw new Error(
      `No se puede cambiar de "${po.status}" a "${toStatus}"`
    );
  }

  // Special rule: cannot complete without document
  if (toStatus === "completed") {
    const { data: full } = await supabase
      .from("purchase_orders")
      .select("document_id")
      .eq("id", poId)
      .single();

    if (!full?.document_id) {
      throw new Error(
        "Debes subir el invoice, recibo o documento correspondiente antes de completar este PO."
      );
    }
  }

  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      status: toStatus,
      completed_at: toStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId);

  if (updateError) throw updateError;

  await supabase.from("purchase_order_status_history").insert({
    purchase_order_id: poId,
    from_status: po.status,
    to_status: toStatus,
    changed_by: userId,
    notes: notes ?? null,
  });
}

export async function requestException(
  poId: string,
  companyId: string,
  userId: string,
  reason: string
) {
  if (!reason.trim()) {
    throw new Error("Debes indicar el motivo de la excepción");
  }

  await transitionPOStatus(
    poId,
    companyId,
    userId,
    "exception_requested",
    reason
  );

  // Update exception_reason
  const supabase = await createClient();
  await supabase
    .from("purchase_orders")
    .update({ exception_reason: reason })
    .eq("id", poId);
}

export async function getPurchaseOrders(companyId: string, statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select(
      `
      *,
      project:projects(id, name),
      creator:profiles!purchase_orders_created_by_fkey(full_name)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
