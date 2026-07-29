import { createClient } from "@/lib/supabase/server";

export async function getInvoices(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("*, client:clients(name), project:projects(name)").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInvoice(companyId: string, userId: string, data: { clientId?: string; projectId?: string; number: string; dueDate?: string; notes?: string; items: { description: string; quantity: number; unitPrice: number; partNumber?: string }[] }) {
  const supabase = await createClient();
  const items = data.items.map((item) => ({ ...item, amount: item.quantity * item.unitPrice }));
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const { data: invoice, error } = await supabase.from("invoices").insert({ company_id: companyId, client_id: data.clientId || null, project_id: data.projectId || null, number: data.number, due_date: data.dueDate || null, notes: data.notes || null, subtotal, total: subtotal, created_by: userId }).select().single();
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

export async function recordInvoicePayment(invoiceId: string, companyId: string, amount: number) {
  const supabase = await createClient();
  const { data: invoice, error: readError } = await supabase.from("invoices").select("total, amount_paid").eq("id", invoiceId).eq("company_id", companyId).single();
  if (readError) throw readError;
  const paid = Math.min(Number(invoice.total), Number(invoice.amount_paid) + amount);
  const status = paid >= Number(invoice.total) ? "paid" : paid > 0 ? "partial" : "sent";
  const { error } = await supabase.from("invoices").update({ amount_paid: paid, status, updated_at: new Date().toISOString() }).eq("id", invoiceId).eq("company_id", companyId);
  if (error) throw error;
}

export async function updateInvoiceStatus(invoiceId: string, companyId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId).eq("company_id", companyId);
  if (error) throw error;
}
