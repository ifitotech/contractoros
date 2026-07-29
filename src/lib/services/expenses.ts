import { createClient } from "@/lib/supabase/server";
import { canCreate } from "@/lib/plans";

export async function createExpense(
  companyId: string,
  userId: string,
  plan: "free" | "pro" | "ultra",
  monthlyExpenseCount: number,
  data: {
    project_id?: string;
    purchase_order_id?: string;
    vendor_name?: string;
    category_id: string;
    amount: number;
    tax_amount?: number;
    date?: string;
    notes?: string;
    document_id?: string;
  }
) {
  // Check plan limits
  const limitCheck = canCreate(plan, "expenses_per_month", monthlyExpenseCount);
  if (!limitCheck.allowed) {
    throw new Error(
      "Has alcanzado el límite mensual de gastos del plan Free. Actualiza a Pro."
    );
  }

  const supabase = await createClient();

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      project_id: data.project_id ?? null,
      purchase_order_id: data.purchase_order_id ?? null,
      created_by: userId,
      vendor_name: data.vendor_name ?? null,
      category_id: data.category_id,
      amount: data.amount,
      tax_amount: data.tax_amount ?? 0,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      notes: data.notes ?? null,
      document_id: data.document_id ?? null,
      status: "approved",
    })
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function getExpenses(
  companyId: string,
  filters?: {
    projectId?: string;
    categoryId?: string;
    fromDate?: string;
    toDate?: string;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from("expenses")
    .select(
      `
      *,
      category:expense_categories(id, name),
      project:projects(id, name),
      creator:profiles!expenses_created_by_fkey(full_name)
    `
    )
    .eq("company_id", companyId)
    .order("date", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.fromDate) query = query.gte("date", filters.fromDate);
  if (filters?.toDate) query = query.lte("date", filters.toDate);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getExpenseCategories(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}
