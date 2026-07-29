import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, canCreate, type PlanName, type LimitKey } from "@/lib/plans";

function currentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getCompanyPlan(companyId: string): Promise<PlanName> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan:plans(name)")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.plan?.name as PlanName) ?? "free";
}

export async function getUsage(
  companyId: string,
  key: LimitKey
): Promise<number> {
  const supabase = await createClient();
  const { start, end } = currentPeriod();

  // For active_projects and employees we count current state, not monthly
  if (key === "active_projects") {
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["active", "approved", "quoted", "lead"]);
    return count ?? 0;
  }

  if (key === "employees") {
    const { count } = await supabase
      .from("company_members")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true);
    return count ?? 0;
  }

  // Monthly counters from usage_records or live count
  if (key === "quotes_per_month") {
    const { count } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");
    return count ?? 0;
  }

  if (key === "expenses_per_month") {
    const { count } = await supabase
      .from("expenses")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("date", start)
      .lte("date", end);
    return count ?? 0;
  }

  if (key === "pos_per_month") {
    const { count } = await supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");
    return count ?? 0;
  }

  return 0;
}

export async function checkLimit(
  companyId: string,
  key: LimitKey
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number; plan: PlanName }> {
  const plan = await getCompanyPlan(companyId);
  const used = await getUsage(companyId, key);
  const result = canCreate(plan, key, used);

  return {
    allowed: result.allowed,
    limit: result.limit,
    used,
    remaining: result.remaining,
    plan,
  };
}

export async function getAllUsage(companyId: string) {
  const plan = await getCompanyPlan(companyId);
  const keys: LimitKey[] = [
    "active_projects",
    "employees",
    "quotes_per_month",
    "expenses_per_month",
    "pos_per_month",
  ];

  const usage: Record<string, { used: number; limit: number }> = {};

  for (const key of keys) {
    const used = await getUsage(companyId, key);
    usage[key] = {
      used,
      limit: PLAN_LIMITS[plan][key],
    };
  }

  return { plan, usage };
}
