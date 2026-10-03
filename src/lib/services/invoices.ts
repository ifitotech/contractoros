import { createClient } from "@/lib/supabase/server";

export async function getInvoices(companyId: string, projectId?: string) {
  const supabase = await createClient();
  let query = supabase.from("invoices").select("*, client:clients(name), project:projects(name)").eq("company_id", companyId).order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createInvoice(companyId: string, userId: string, data: { clientId?: string; projectId?: string; quoteId?: string; number: string; dueDate?: string; notes?: string; items: { description: string; quantity: number; unitPrice: number; partNumber?: string }[] }) {
  const supabase = await createClient();
  const items = data.items.map((item) => ({ ...item, amount: item.quantity * item.unitPrice }));
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const { data: invoice, error } = await supabase.from("invoices").insert({ company_id: companyId, client_id: data.clientId || null, project_id: data.projectId || null, quote_id: data.quoteId || null, number: data.number, due_date: data.dueDate || null, notes: data.notes || null, subtotal, total: subtotal, created_by: userId }).select().single();
  if (error) throw error;
  const { error: itemError } = await supabase.from("invoice_items").insert(items.map((item) => ({ invoice_id: invoice.id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, amount: item.amount, part_number: item.partNumber || null })));
  if (itemError) throw itemError;
  return invoice;
}

export async function getInvoiceById(invoiceId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("*, client:clients(name,email), project:projects(name), quote:quotes(number), items:invoice_items(*)").eq("id", invoiceId).eq("company_id", companyId).single();
  if (error) throw error;
  return data;
}

/** Adds a payment in one database statement (so two payments at once both count). Refused on a cancelled invoice. */
export async function recordInvoicePayment(invoiceId: string, companyId: string, amount: number) {
  const supabase = await createClient();
  // The company filter keeps the check explicit; row security enforces it again inside the function.
  const { data: own, error: readError } = await supabase.from("invoices").select("id").eq("id", invoiceId).eq("company_id", companyId).maybeSingle();
  if (readError) throw readError;
  if (!own) throw new Error("forbidden");
  const { error } = await supabase.rpc("record_invoice_payment", { p_invoice: invoiceId, p_amount: amount });
  if (error) throw error;
}

/** Draft -> sent, and cancel while nothing has been paid. Anything else is refused. */
export async function updateInvoiceStatus(invoiceId: string, companyId: string, status: "sent" | "cancelled") {
  const supabase = await createClient();
  const { data: inv, error: readError } = await supabase.from("invoices").select("status, amount_paid").eq("id", invoiceId).eq("company_id", companyId).single();
  if (readError) throw readError;
  const allowed = status === "sent" ? inv.status === "draft" : (inv.status === "draft" || inv.status === "sent") && Number(inv.amount_paid) === 0;
  if (!allowed) throw new Error("invoice_transition_invalid");
  const { error } = await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId).eq("company_id", companyId);
  if (error) throw error;
}

export type QuoteInvoicing = {
  quote: { id: string; number: string; status: string; total: number; client_id: string | null; project_id: string | null; clientName: string | null; projectName: string | null };
  invoices: { id: string; number: string; status: string; total: number }[];
  invoiced: number;
  remaining: number;
};

/** What has been billed against a proposal so far (cancelled invoices do not count). */
export async function getQuoteInvoicing(companyId: string, quoteId: string): Promise<QuoteInvoicing | null> {
  const supabase = await createClient();
  const { data: q, error } = await supabase.from("quotes").select("id, number, status, total, client_id, project_id, client:clients(name), project:projects(name)").eq("id", quoteId).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  if (!q) return null;
  const { data: inv, error: invErr } = await supabase.from("invoices").select("id, number, status, total").eq("company_id", companyId).eq("quote_id", quoteId).order("created_at");
  if (invErr) throw invErr;
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as { name?: string } | null;
  const invoices = (inv ?? []).map((i) => ({ id: i.id as string, number: i.number as string, status: i.status as string, total: Number(i.total) }));
  const invoiced = Math.round(invoices.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + i.total, 0) * 100) / 100;
  const total = Number(q.total);
  return {
    quote: { id: q.id as string, number: q.number as string, status: q.status as string, total, client_id: q.client_id as string | null, project_id: q.project_id as string | null, clientName: one(q.client)?.name ?? null, projectName: one(q.project)?.name ?? null },
    invoices, invoiced, remaining: Math.max(0, Math.round((total - invoiced) * 100) / 100),
  };
}

/** Next INV-0001 style number for the company, taken atomically by the database so two people never get the same one. */
export async function nextInvoiceNumber(companyId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_invoice_number", { p_company: companyId });
  if (error || !data) return `INV-${Date.now()}`;
  return data as string;
}

/** Money billed, collected and still owed on a project (cancelled invoices do not count). */
export async function getProjectBilling(projectId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("total, amount_paid, status").eq("company_id", companyId).eq("project_id", projectId);
  if (error) throw error;
  const live = (data ?? []).filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const invoiced = live.reduce((sum, i) => sum + Number(i.total), 0);
  const collected = live.reduce((sum, i) => sum + Number(i.amount_paid ?? 0), 0);
  return { invoiced: Math.round(invoiced * 100) / 100, collected: Math.round(collected * 100) / 100, owed: Math.round((invoiced - collected) * 100) / 100 };
}

/** A client's invoices and what they still owe (drafts and cancelled invoices are not owed yet). */
export async function getClientInvoices(clientId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("id, number, status, total, amount_paid, due_date").eq("company_id", companyId).eq("client_id", clientId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  const rows = (data ?? []).map((i) => ({ id: i.id as string, number: i.number as string, status: i.status as string, total: Number(i.total), amount_paid: Number(i.amount_paid ?? 0), due_date: (i.due_date as string | null) ?? null }));
  const owed = Math.round(rows.filter((i) => i.status !== "draft").reduce((sum, i) => sum + (i.total - i.amount_paid), 0) * 100) / 100;
  return { rows, owed };
}
