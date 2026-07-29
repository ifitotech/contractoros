import { createClient } from "@/lib/supabase/server";
import { getProjectFinancials } from "@/lib/finance";

export async function getDashboardMetrics(companyId: string) {
  const supabase = await createClient();

  // Active projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, contract_value, budget_total, status, expenses(amount)")
    .eq("company_id", companyId)
    .in("status", ["active", "approved", "quoted"]);
  const { count: completedProjectsCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "completed");
  const { count: employeesWorking } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_active", true);
  const { count: pendingInvoices } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["sent", "partial", "overdue"]);

  const activeProjects = projects ?? [];
  const totalContractValue = activeProjects.reduce(
    (s, p) => s + Number(p.contract_value),
    0
  );

  let totalSpent = 0;
  let totalProfit = 0;

  for (const p of activeProjects) {
    const spent = (p.expenses ?? []).reduce(
      (s: number, e: { amount: number }) => s + Number(e.amount),
      0
    );
    totalSpent += spent;
    totalProfit += Number(p.contract_value) - spent;
  }

  // Quotes pending
  const { count: pendingQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["sent", "pending"]);

  // POs without document
  const { count: posWithoutDoc } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "pending_document");

  // Expenses this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("company_id", companyId)
    .gte("date", monthStart);

  const expensesThisMonth = (monthExpenses ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );

  return {
    activeProjectsCount: activeProjects.length,
    completedProjectsCount: completedProjectsCount ?? 0,
    employeesWorking: employeesWorking ?? 0,
    pendingInvoices: pendingInvoices ?? 0,
    totalContractValue,
    totalSpent,
    totalProfit,
    margin: totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0,
    pendingQuotes: pendingQuotes ?? 0,
    posWithoutDoc: posWithoutDoc ?? 0,
    expensesThisMonth,
  };
}

export async function getRecentActivity(companyId: string, limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*, user:profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
