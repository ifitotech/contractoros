import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { getProjects } from "@/lib/services/projects";
import { getQuotes } from "@/lib/services/quotes";
import { getInvoices } from "@/lib/services/invoices";
import { getExpenses } from "@/lib/services/expenses";
import ReportsClient from "./ReportsClient";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// Company-wide money is Owner/Manager information (employees only ever see their own project data).
export default async function ReportsPage() {
  const c = await getActionContext().catch(logged("/reports", null));
  if (!c || !(c.role === "owner" || c.role === "manager")) redirect("/dashboard");
  try {
    const companyId = c.companyId;
    const [metrics, projects, quotes, invoices, expenses] = await Promise.all([getDashboardMetrics(companyId), getProjects(companyId), getQuotes(companyId), getInvoices(companyId), getExpenses(companyId)]);
    // Only approved/reimbursed expenses are real cost.
    const counted = (expenses ?? []).filter((e: { status?: string }) => e.status === "approved" || e.status === "reimbursed");
    return <ReportsClient metrics={metrics} projects={projects} quotes={quotes} invoices={invoices} expenses={counted} />;
  } catch (error) {
    logError("/reports", error);
    return <ReportsClient demo />;
  }
}
