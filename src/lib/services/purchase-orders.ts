import { createClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/po-status";
import { normalizeUnit } from "@/lib/materials";
import { responseTotal, round2, type ResponseLine } from "@/lib/pricing";
import type { POStatus } from "@/types/database";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

async function nextPONumber(companyId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_purchase_order_number", { p_company: companyId });
  if (error) throw error;
  return data as string;
}

async function addHistory(poId: string, from: string | null, to: string, userId: string, notes?: string | null) {
  const supabase = await createClient();
  await supabase.from("purchase_order_status_history").insert({ purchase_order_id: poId, from_status: from, to_status: to, changed_by: userId, notes: notes ?? null });
}

/**
 * "Buy now": the person already knows where to buy, so the material list becomes a purchase order with its lines.
 * Same rules as a field purchase: inside the person's limit it waits for the receipt, over it waits for approval.
 */
export async function createPurchaseOrderFromMaterialRequest(
  companyId: string, userId: string,
  input: { requestId: string; supplierId?: string | null; vendorName?: string | null; estimatedAmount?: number | null; withinLimit: boolean },
) {
  const supabase = await createClient();
  const { data: req, error: reqErr } = await supabase.from("material_requests").select("id, number, status, project_id").eq("id", input.requestId).eq("company_id", companyId).maybeSingle();
  if (reqErr) throw reqErr;
  if (!req || !req.project_id) throw new Error("forbidden");
  if (!["requested", "reviewed"].includes(req.status as string)) throw new Error("request_not_pending");
  const { data: items, error: itemsErr } = await supabase.from("material_request_items").select("material_id, description, quantity, unit, sort_order").eq("request_id", input.requestId).eq("company_id", companyId).order("sort_order");
  if (itemsErr) throw itemsErr;
  if (!items || items.length === 0) throw new Error("request_empty");

  let vendorName = (input.vendorName ?? "").trim();
  if (input.supplierId) {
    const { data: sup } = await supabase.from("suppliers").select("name").eq("id", input.supplierId).eq("company_id", companyId).maybeSingle();
    if (sup?.name) vendorName = sup.name as string;
    else input.supplierId = null;
  }
  if (!vendorName) throw new Error("supplier_required");
  const amount = input.estimatedAmount != null && Number.isFinite(input.estimatedAmount) && input.estimatedAmount >= 0 ? round2(input.estimatedAmount) : null;
  const status: POStatus = input.withinLimit ? "pending_document" : "pending_approval";
  const number = await nextPONumber(companyId);
  const { data: po, error } = await supabase.from("purchase_orders").insert({
    company_id: companyId, project_id: req.project_id, created_by: userId, number, vendor_name: vendorName.slice(0, 120), supplier_id: input.supplierId ?? null,
    description: `${req.number ?? ""}`.trim() || null, estimated_amount: amount, status, waiting_on: input.withinLimit ? "employee" : "owner",
  }).select().single();
  if (error) throw error;
  const { error: lineErr } = await supabase.from("purchase_order_items").insert(items.map((i, idx) => ({
    company_id: companyId, purchase_order_id: po.id, material_id: i.material_id as string | null, description: String(i.description).slice(0, 300),
    quantity: Number(i.quantity), unit: normalizeUnit(i.unit as string), unit_price: 0, sort_order: idx,
  })));
  if (lineErr) { await supabase.from("purchase_orders").delete().eq("id", po.id); throw lineErr; }
  await addHistory(po.id, null, status, userId, null);
  await supabase.from("material_requests").update({ status: "converted", waiting_on: "none", updated_at: new Date().toISOString() }).eq("id", input.requestId).eq("company_id", companyId).in("status", ["requested", "reviewed"]);
  return { id: po.id as string, number: po.number as string, status };
}

/**
 * PO built from a supplier response: only priced, available lines come across, each keeping its origin
 * (request line + library item). Over the person's limit it waits for approval; otherwise it is approved.
 */
export async function createPurchaseOrderFromResponse(companyId: string, userId: string, input: { requestId: string; responseId: string; withinLimit: (amount: number) => boolean }) {
  const supabase = await createClient();
  const { data: req, error: reqErr } = await supabase.from("supply_quote_requests").select("id, project_id, request_type, number").eq("id", input.requestId).eq("company_id", companyId).maybeSingle();
  if (reqErr) throw reqErr;
  if (!req || !req.project_id) throw new Error("forbidden");

  const { data: resp, error: respErr } = await supabase
    .from("supplier_quote_responses")
    .select("id, supplier_id, supplier_name, total_amount, freight, tax_amount, items:supplier_quote_response_items(request_item_id, unit_price, availability, lead_time)")
    .eq("id", input.responseId).eq("request_id", input.requestId).eq("company_id", companyId).maybeSingle();
  if (respErr) throw respErr;
  if (!resp) throw new Error("forbidden");

  const { data: reqItems, error: itemsErr } = await supabase
    .from("supply_quote_request_items").select("id, material_id, description, quantity, unit, sort_order").eq("request_id", input.requestId).eq("company_id", companyId).order("sort_order");
  if (itemsErr) throw itemsErr;
  const priced = new Map((resp.items as { request_item_id: string; unit_price: number | null; availability: string | null; lead_time: string | null }[]).map((l) => [l.request_item_id, l]));
  const lines = (reqItems ?? []).flatMap((i, idx) => {
    const l = priced.get(i.id as string);
    if (!l || l.unit_price == null || l.availability === "unavailable") return [];
    return [{ request_item_id: i.id as string, material_id: i.material_id as string | null, description: i.description as string, quantity: Number(i.quantity), unit: i.unit as string, unit_price: Number(l.unit_price), lead_time: l.lead_time, sort_order: idx }];
  });
  // A supplier that answered with a PDF and only a total: the PO keeps the list's lines without unit prices and the quoted total.
  const totalOnly = lines.length === 0 && resp.total_amount != null && Number(resp.total_amount) > 0;
  if (lines.length === 0 && !totalOnly) throw new Error("po_no_priced_lines");
  if (totalOnly) {
    (reqItems ?? []).forEach((i, idx) => lines.push({ request_item_id: i.id as string, material_id: i.material_id as string | null, description: i.description as string, quantity: Number(i.quantity), unit: i.unit as string, unit_price: 0, lead_time: null, sort_order: idx } as (typeof lines)[number]));
  }

  const asLines: ResponseLine[] = lines.map((l) => ({ requestItemId: l.request_item_id, quantity: l.quantity, unitPrice: l.unit_price, availability: "available", leadTime: null }));
  const freight = resp.freight == null ? null : Number(resp.freight);
  const tax = resp.tax_amount == null ? null : Number(resp.tax_amount);
  // The supplier's own quote total is what will be invoiced; otherwise lines + freight + tax.
  const total = round2(responseTotal(asLines, freight, tax, resp.total_amount == null ? null : Number(resp.total_amount)) ?? 0);
  const within = input.withinLimit(total);
  const status: POStatus = within ? "approved" : "pending_approval";
  const number = await nextPONumber(companyId);

  const { data: po, error } = await supabase.from("purchase_orders").insert({
    company_id: companyId, project_id: req.project_id, created_by: userId, number, vendor_name: resp.supplier_name ?? "Supplier",
    supplier_id: resp.supplier_id, pricing_request_id: req.id, supplier_response_id: resp.id,
    description: `${req.number ?? ""}`.trim() || null, estimated_amount: total, freight, tax_amount: tax,
    status, waiting_on: "owner", approved_by: within ? userId : null, approved_at: within ? new Date().toISOString() : null,
    approval_note: null,
  }).select().single();
  if (error) {
    if ((error as { code?: string }).code === "23505") throw new Error("po_exists");
    throw error;
  }

  const { error: lineErr } = await supabase.from("purchase_order_items").insert(lines.map((l) => ({
    company_id: companyId, purchase_order_id: po.id, request_item_id: l.request_item_id, material_id: l.material_id,
    description: l.description.slice(0, 300), quantity: l.quantity, unit: normalizeUnit(l.unit), unit_price: l.unit_price, lead_time: l.lead_time, sort_order: l.sort_order,
  })));
  if (lineErr) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    throw lineErr;
  }
  await addHistory(po.id, null, status, userId, `${req.number ?? ""}`.trim() || null);
  // The request moves on when a manager creates the PO; people without that right leave it as is (RLS).
  await supabase.from("supply_quote_requests").update({ status: "converted_to_po", waiting_on: "none", updated_at: new Date().toISOString() }).eq("id", req.id).eq("company_id", companyId).in("status", ["responded", "sent", "question_open", "awarded", "accepted"]);
  await supabase.from("supplier_quote_responses").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", resp.id).eq("company_id", companyId).eq("status", "submitted");
  return { id: po.id as string, number: po.number as string, status };
}

async function move(companyId: string, userId: string, poId: string, from: POStatus[], patch: Record<string, unknown>, to: POStatus, notes?: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").update({ ...patch, status: to, updated_at: new Date().toISOString() })
    .eq("id", poId).eq("company_id", companyId).in("status", from).select("id, status");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("po_transition_invalid");
  await addHistory(poId, from.length === 1 ? from[0] : null, to, userId, notes);
}

export const approvePurchaseOrder = (companyId: string, userId: string, poId: string, note?: string | null) =>
  move(companyId, userId, poId, ["pending_approval"], { approved_by: userId, approved_at: new Date().toISOString(), approval_note: note?.trim() || null, waiting_on: "owner" }, "approved", note);
export const rejectPurchaseOrder = (companyId: string, userId: string, poId: string, note?: string | null) =>
  move(companyId, userId, poId, ["pending_approval"], { approved_by: userId, approved_at: new Date().toISOString(), approval_note: note?.trim() || null, waiting_on: "employee" }, "rejected", note);
export const markPurchaseOrderSent = (companyId: string, userId: string, poId: string, expectedDelivery?: string | null) =>
  move(companyId, userId, poId, ["approved"], { sent_at: new Date().toISOString(), waiting_on: "supplier", ...(expectedDelivery ? { expected_delivery: expectedDelivery } : {}) }, "sent");

/** Logistics: how much of each line has arrived. Only while the PO waits for delivery; the database enforces it too. */
export async function recordPurchaseOrderReceipt(companyId: string, poId: string, lines: { id: string; received: number }[]) {
  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("id, status").eq("id", poId).eq("company_id", companyId).maybeSingle();
  if (!po) throw new Error("forbidden");
  if (po.status !== "approved" && po.status !== "sent") throw new Error("po_transition_invalid");
  for (const l of lines) {
    if (!Number.isFinite(l.received) || l.received < 0) throw new Error("invalid_qty");
    const { data, error } = await supabase.from("purchase_order_items").update({ received_quantity: l.received }).eq("id", l.id).eq("purchase_order_id", poId).eq("company_id", companyId).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("forbidden");
  }
}

/** Logistics: the date the material is expected. Only while the PO is approved or sent (after that it is history). */
export async function setPurchaseOrderExpectedDelivery(companyId: string, poId: string, date: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").update({ expected_delivery: date, updated_at: new Date().toISOString() })
    .eq("id", poId).eq("company_id", companyId).in("status", ["approved", "sent"]).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("po_transition_invalid");
}
export const markPurchaseOrderReceived = (companyId: string, userId: string, poId: string) =>
  move(companyId, userId, poId, ["approved", "sent"], { received_at: new Date().toISOString(), waiting_on: "employee" }, "received");
export const cancelPurchaseOrder = (companyId: string, userId: string, poId: string) =>
  move(companyId, userId, poId, ["pending_approval", "rejected", "approved", "sent", "open", "pending_document", "document_uploaded", "pending_review"], { waiting_on: "none" }, "cancelled");

const KINDS = ["receipt", "invoice", "packing_slip", "other"];
const ALLOWED_FILES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE = 10 * 1024 * 1024;

/** Receipt / invoice / packing slip. The PO moves to "document received" and waits on the Owner to close it. */
export async function uploadPurchaseOrderDocument(companyId: string, userId: string, poId: string, file: File, kind: string, photoOnly = false) {
  if (!ALLOWED_FILES.includes(file.type) || (photoOnly && !file.type.startsWith("image/"))) throw new Error("file_type");
  if (file.size > MAX_FILE) throw new Error("file_size");
  const supabase = await createClient();
  const { data: po, error: poErr } = await supabase.from("purchase_orders").select("id, status").eq("id", poId).eq("company_id", companyId).maybeSingle();
  if (poErr) throw poErr;
  if (!po) throw new Error("forbidden");
  if (!["received", "pending_document", "pending_review", "document_uploaded"].includes(po.status as string)) throw new Error("po_transition_invalid");

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `${companyId}/purchase_order/${poId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from("documents").insert({
    company_id: companyId, uploaded_by: userId, name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size, storage_path: path,
    related_type: "purchase_order", related_id: poId, document_kind: KINDS.includes(kind) ? kind : "other",
  });
  if (error) {
    await supabase.storage.from("documents").remove([path]);
    throw error;
  }
  if (po.status !== "document_uploaded") {
    await move(companyId, userId, poId, [po.status as POStatus], { waiting_on: "owner" }, "document_uploaded", file.name);
  }
}

/** Completes through the database function: needs a document, records the actual cost as a project expense once. */
export async function completePurchaseOrder(poId: string, finalAmount: number, taxAmount: number | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_purchase_order", { p_po: poId, p_final: finalAmount, p_tax: taxAmount });
  if (error) throw error;
  return data as string;
}

export async function getPurchaseOrderDocumentUrl(companyId: string, documentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("storage_path").eq("id", documentId).eq("company_id", companyId).eq("related_type", "purchase_order").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("forbidden");
  const signed = await supabase.storage.from("documents").createSignedUrl(data.storage_path as string, 120);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

export async function transitionPOStatus(poId: string, companyId: string, userId: string, toStatus: POStatus, notes?: string) {
  const supabase = await createClient();
  const { data: po, error: fetchError } = await supabase.from("purchase_orders").select("status").eq("id", poId).eq("company_id", companyId).single();
  if (fetchError || !po) throw fetchError ?? new Error("PO not found");
  if (!canTransition(po.status as POStatus, toStatus)) throw new Error("po_transition_invalid");
  // Completing goes through completePurchaseOrder() so the cost is recorded with the document check.
  if (toStatus === "completed") throw new Error("po_complete_via_function");
  await move(companyId, userId, poId, [po.status as POStatus], {}, toStatus, notes);
}

const PO_LIST = `id, number, vendor_name, description, estimated_amount, final_amount, status, waiting_on, expected_delivery, created_at, project_id, project:projects(id, name), creator:profiles!purchase_orders_created_by_fkey(full_name)`;

export async function getPurchaseOrders(companyId: string, statusFilter?: string, projectId?: string) {
  const supabase = await createClient();
  let query = supabase.from("purchase_orders").select(PO_LIST).eq("company_id", companyId).order("created_at", { ascending: false }).limit(300);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}


export type PODetail = NonNullable<Awaited<ReturnType<typeof getPurchaseOrderById>>>;

export async function getPurchaseOrderById(poId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, number, vendor_name, category, description, estimated_amount, final_amount, tax_amount, freight, status, waiting_on, exception_reason, approval_note, expected_delivery, approved_at, sent_at, received_at, completed_at, created_at, created_by, project_id, pricing_request_id, supplier_response_id, project:projects(id, name), creator:profiles!purchase_orders_created_by_fkey(full_name), pricing:supply_quote_requests(id, number)")
    .eq("id", poId).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [items, docs, history] = await Promise.all([
    supabase.from("purchase_order_items").select("id, description, quantity, unit, unit_price, lead_time, sort_order, received_quantity").eq("purchase_order_id", poId).order("sort_order"),
    supabase.from("documents").select("id, name, mime_type, document_kind, created_at").eq("related_type", "purchase_order").eq("related_id", poId).order("created_at"),
    supabase.from("purchase_order_status_history").select("id, from_status, to_status, notes, created_at, changer:profiles(full_name)").eq("purchase_order_id", poId).order("created_at"),
  ]);
  if (items.error) throw items.error;
  if (docs.error) throw docs.error;
  const raw = data as unknown as Record<string, unknown>;
  return {
    ...(raw as {
      id: string; number: string; vendor_name: string; category: string | null; description: string | null; estimated_amount: number | null;
      final_amount: number | null; tax_amount: number | null; freight: number | null; status: string; waiting_on: string; exception_reason: string | null;
      approval_note: string | null; expected_delivery: string | null; approved_at: string | null; sent_at: string | null; received_at: string | null; completed_at: string | null;
      created_at: string; created_by: string; project_id: string; pricing_request_id: string | null; supplier_response_id: string | null;
    }),
    project: one(raw.project as { id: string; name: string } | { id: string; name: string }[] | null),
    creator: one(raw.creator as { full_name: string | null } | { full_name: string | null }[] | null),
    pricing: one(raw.pricing as { id: string; number: string | null } | { id: string; number: string | null }[] | null),
    items: (items.data ?? []).map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), received_quantity: Number(i.received_quantity ?? 0) })) as { id: string; description: string; quantity: number; unit: string; unit_price: number; lead_time: string | null; received_quantity: number }[],
    documents: (docs.data ?? []) as { id: string; name: string; mime_type: string; document_kind: string | null; created_at: string }[],
    history: ((history.data ?? []) as unknown as { id: string; from_status: string | null; to_status: string; notes: string | null; created_at: string; changer: { full_name: string | null } | { full_name: string | null }[] | null }[]).map((h) => ({ ...h, changer: one(h.changer) })),
  };
}

/** POs already created from a Pricing Request (to show the link and hide "create PO" on used responses). */
export async function getPOsForPricingRequest(companyId: string, requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("id, number, status, supplier_response_id").eq("company_id", companyId).eq("pricing_request_id", requestId).neq("status", "cancelled");
  if (error) throw error;
  return data as { id: string; number: string; status: string; supplier_response_id: string | null }[];
}

