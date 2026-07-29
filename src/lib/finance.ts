// Centralized financial calculations
// Avoid duplicating formulas across components

export interface ProjectFinancials {
  contractValue: number;
  budgetTotal: number;
  budgetMaterials: number;
  budgetLabor: number;
  budgetSubcontractors: number;
  budgetOther: number;
  spentTotal: number;
  spentMaterials?: number;
  spentLabor?: number;
  spentOther?: number;
}

export function calculateAvailable(budget: number, spent: number): number {
  return Math.max(0, budget - spent);
}

export function calculateProfit(
  contractValue: number,
  spentTotal: number
): number {
  return contractValue - spentTotal;
}

export function calculateMargin(
  contractValue: number,
  spentTotal: number
): number {
  if (contractValue <= 0) return 0;
  return ((contractValue - spentTotal) / contractValue) * 100;
}

export function calculateBudgetUsage(budget: number, spent: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, (spent / budget) * 100);
}

export function isOverBudget(budget: number, spent: number): boolean {
  return spent > budget;
}

export function isNearBudget(
  budget: number,
  spent: number,
  threshold = 0.9
): boolean {
  if (budget <= 0) return false;
  return spent / budget >= threshold && spent <= budget;
}

export function getProjectFinancials(project: ProjectFinancials) {
  const available = calculateAvailable(project.budgetTotal, project.spentTotal);
  const profit = calculateProfit(project.contractValue, project.spentTotal);
  const margin = calculateMargin(project.contractValue, project.spentTotal);
  const usage = calculateBudgetUsage(project.budgetTotal, project.spentTotal);
  const overBudget = isOverBudget(project.budgetTotal, project.spentTotal);
  const nearBudget = isNearBudget(project.budgetTotal, project.spentTotal);

  return {
    available,
    profit,
    margin,
    usage,
    overBudget,
    nearBudget,
  };
}
