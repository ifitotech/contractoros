import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getQuoteById } from "@/lib/services/quotes";
import { getProposalExtras } from "@/lib/services/proposals";
import { getQuoteInvoicing } from "@/lib/services/invoices";
import { getProjectMoney } from "@/lib/services/project-control";
import { getProjectById } from "@/lib/services/projects";
import QuoteDetailClient from "./QuoteDetailClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/quotes/[id]", null));
  if (!c) redirect("/dashboard");
  // Company filter here, visibility (Owner/Manager or "create proposals") in the database.
  const quote = await getQuoteById(id, c.companyId).catch(logged("/quotes/[id]", null));
  if (!quote) notFound();
  const extras = await getProposalExtras(id, c.companyId, quote.number).catch(logged("/quotes/[id]", null));
  const canManage = c.role === "owner" || c.role === "manager";
  // Approved proposals show what has been billed and, with cost permission, how the project is doing against the contract.
  const approved = quote.status === "approved";
  const billing = canManage && approved ? await getQuoteInvoicing(c.companyId, id).catch(logged("/quotes/[id]", null)) : null;
  const projectId = (quote as { project_id?: string | null }).project_id ?? null;
  const project = approved && projectId ? await getProjectById(projectId, c.companyId).catch(logged("/quotes/[id]", null)) : null;
  const money = project ? await getProjectMoney(projectId as string, c.companyId, Number((project as { contract_value?: number }).contract_value ?? 0), Number((project as { budget_total?: number }).budget_total ?? 0), c.perms).catch(logged("/quotes/[id]", null)) : null;
  return <QuoteDetailClient quote={quote} extras={extras} canManage={canManage} billing={billing ? { invoiced: billing.invoiced, total: billing.quote.total, remaining: billing.remaining, invoices: billing.invoices } : null} money={money ? { contractValue: money.contractValue, actualCost: money.actualCost, committedCost: money.committedCost, estimatedProfit: money.estimatedProfit, estimatedMargin: money.estimatedMargin } : null} />;
}
