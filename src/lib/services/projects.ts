import { createClient } from "@/lib/supabase/server";
import { getProjectFinancials } from "@/lib/finance";

export async function getProjects(companyId: string) {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(id, name, contact_name),
      expenses(amount)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (projects ?? []).map((p) => {
    const spentTotal = (p.expenses ?? []).reduce(
      (sum: number, e: { amount: number }) => sum + Number(e.amount),
      0
    );

    const financials = getProjectFinancials({
      contractValue: Number(p.contract_value),
      budgetTotal: Number(p.budget_total),
      budgetMaterials: Number(p.budget_materials),
      budgetLabor: Number(p.budget_labor),
      budgetSubcontractors: Number(p.budget_subcontractors),
      budgetOther: Number(p.budget_other),
      spentTotal,
    });

    return {
      ...p,
      spentTotal,
      ...financials,
    };
  });
}

export async function getProjectById(projectId: string, companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      client:clients(*),
      expenses(*, category:expense_categories(name)),
      members:project_members(user_id, profile:profiles(full_name))
    `
    )
    .eq("id", projectId)
    .eq("company_id", companyId)
    .single();

  if (error) throw error;

  const spentTotal = (data.expenses ?? []).reduce(
    (sum: number, e: { amount: number }) => sum + Number(e.amount),
    0
  );

  const financials = getProjectFinancials({
    contractValue: Number(data.contract_value),
    budgetTotal: Number(data.budget_total),
    budgetMaterials: Number(data.budget_materials),
    budgetLabor: Number(data.budget_labor),
    budgetSubcontractors: Number(data.budget_subcontractors),
    budgetOther: Number(data.budget_other),
    spentTotal,
  });

  return { ...data, spentTotal, ...financials };
}

export async function createProject(
  companyId: string,
  data: {
    client_id: string;
    name: string;
    description?: string;
    address?: string;
    contract_value: number;
    budget_materials?: number;
    budget_labor?: number;
    budget_subcontractors?: number;
    budget_other?: number;
    start_date?: string;
  }
) {
  const supabase = await createClient();

  const budgetTotal =
    (data.budget_materials ?? 0) +
    (data.budget_labor ?? 0) +
    (data.budget_subcontractors ?? 0) +
    (data.budget_other ?? 0);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      client_id: data.client_id,
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      status: "lead",
      contract_value: data.contract_value,
      budget_total: budgetTotal,
      budget_materials: data.budget_materials ?? 0,
      budget_labor: data.budget_labor ?? 0,
      budget_subcontractors: data.budget_subcontractors ?? 0,
      budget_other: data.budget_other ?? 0,
      start_date: data.start_date ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return project;
}

export async function updateProject(projectId: string, companyId: string, data: { name?: string; description?: string; address?: string; status?: string; contract_value?: number }) {
  const supabase = await createClient();
  const { data: project, error } = await supabase.from("projects").update({ ...data, updated_at: new Date().toISOString() }).eq("id", projectId).eq("company_id", companyId).select().single();
  if (error) throw error;
  return project;
}

export async function archiveProject(projectId: string, companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", projectId).eq("company_id", companyId);
  if (error) throw error;
}
