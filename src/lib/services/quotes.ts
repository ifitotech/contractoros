import { createClient } from "@/lib/supabase/server";
import { canCreate } from "@/lib/plans";

async function generateQuoteNumber(companyId: string): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const { count } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .like("number", `QT-${year}-%`);

  const next = (count ?? 0) + 1;
  return `QT-${year}-${String(next).padStart(4, "0")}`;
}

export async function createQuote(
  companyId: string,
  userId: string,
  plan: "free" | "pro" | "ultra",
  monthlyQuoteCount: number,
  data: {
    client_id: string;
    project_id?: string;
    items: { description: string; quantity: number; unit_price: number; part_number?: string }[];
    tax_rate?: number;
    discount_amount?: number;
    terms?: string;
    notes?: string;
    valid_until?: string;
    quote_type?: "service" | "materials" | "plan_estimate" | "complete";
  }
) {
  const limitCheck = canCreate(plan, "quotes_per_month", monthlyQuoteCount);
  if (!limitCheck.allowed) {
    throw new Error(
      "Has alcanzado el límite de 3 quotes este mes. Actualiza a Pro."
    );
  }

  const supabase = await createClient();
  const number = await generateQuoteNumber(companyId);

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxAmount = subtotal * ((data.tax_rate ?? 0) / 100);
  const discount = data.discount_amount ?? 0;
  const total = subtotal + taxAmount - discount;

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      company_id: companyId,
      client_id: data.client_id,
      project_id: data.project_id ?? null,
      number,
      status: "draft",
      quote_type: data.quote_type ?? "complete",
      issue_date: new Date().toISOString().slice(0, 10),
      valid_until: data.valid_until ?? null,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      total,
      terms: data.terms ?? null,
      notes: data.notes ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert line items
  if (data.items.length > 0) {
    await supabase.from("quote_items").insert(
      data.items.map((item, i) => ({
        quote_id: quote.id,
        description: item.description,
        part_number: item.part_number ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: i,
      }))
    );
  }

  // Status history
  await supabase.from("quote_status_history").insert({
    quote_id: quote.id,
    from_status: null,
    to_status: "draft",
    changed_by: userId,
    notes: "Quote creado",
  });

  return quote;
}

export async function getQuotes(companyId: string, statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("quotes")
    .select(
      `
      *,
      client:clients(id, name, contact_name),
      project:projects(id, name)
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

export async function getQuoteById(quoteId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").select("*, client:clients(id,name,contact_name,email,phone), project:projects(id,name), items:quote_items(*)").eq("id", quoteId).eq("company_id", companyId).single();
  if (error) throw error;
  return data;
}

export async function updateQuoteStatus(
  quoteId: string,
  companyId: string,
  userId: string,
  toStatus: string,
  notes?: string
) {
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("company_id", companyId)
    .single();

  if (!quote) throw new Error("Quote no encontrado");

  await supabase
    .from("quotes")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", quoteId);

  await supabase.from("quote_status_history").insert({
    quote_id: quoteId,
    from_status: quote.status,
    to_status: toStatus,
    changed_by: userId,
    notes: notes ?? null,
  });
}
