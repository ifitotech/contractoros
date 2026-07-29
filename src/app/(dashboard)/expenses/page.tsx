import { getCurrentMember } from "@/lib/auth";
import { getExpenses } from "@/lib/services/expenses";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  try { const member = await getCurrentMember(); if (member?.company_id) return <ExpensesClient expenses={await getExpenses(member.company_id as string)} />; } catch {}
  return <ExpensesClient demo />;
}
