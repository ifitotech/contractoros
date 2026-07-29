// Centralized plan limits configuration
// Never hardcode limits in components — always use this module

export type PlanName = "free" | "pro" | "ultra";

export type LimitKey =
  | "active_projects"
  | "employees"
  | "quotes_per_month"
  | "expenses_per_month"
  | "pos_per_month";

export const PLAN_LIMITS: Record<PlanName, Record<LimitKey, number>> = {
  free: {
    active_projects: 3,
    employees: 3,
    quotes_per_month: 3,
    expenses_per_month: 50,
    pos_per_month: 20,
  },
  pro: {
    active_projects: -1, // unlimited
    employees: -1,
    quotes_per_month: -1,
    expenses_per_month: -1,
    pos_per_month: -1,
  },
  ultra: {
    active_projects: -1,
    employees: -1,
    quotes_per_month: -1,
    expenses_per_month: -1,
    pos_per_month: -1,
  },
};

export function isUnlimited(value: number) {
  return value === -1;
}

export function canCreate(
  plan: PlanName,
  key: LimitKey,
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const limit = PLAN_LIMITS[plan][key];

  if (isUnlimited(limit)) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - currentUsage);
  return {
    allowed: currentUsage < limit,
    limit,
    remaining,
  };
}

export function getUpgradeMessage(key: LimitKey): string {
  const messages: Record<LimitKey, string> = {
    active_projects:
      "Has alcanzado el límite de 3 proyectos activos del plan Free. Actualiza a Pro para proyectos ilimitados.",
    employees:
      "Has alcanzado el límite de 3 empleados del plan Free. Actualiza a Pro para empleados ilimitados.",
    quotes_per_month:
      "Has alcanzado el límite de 3 quotes este mes. Actualiza a Pro para quotes ilimitados.",
    expenses_per_month:
      "Has alcanzado el límite mensual de gastos. Actualiza a Pro.",
    pos_per_month:
      "Has alcanzado el límite mensual de Purchase Orders. Actualiza a Pro.",
  };
  return messages[key];
}
