import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getClients } from "@/lib/services/clients";
import { getQuoteInvoicing, nextInvoiceNumber } from "@/lib/services/invoices";
import NewInvoiceForm from "./NewInvoiceForm";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Invoices are Owner/Manager work. Opened from an approved proposal, the invoice bills part or all of it.
export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ quoteId?: string }> }) {
  const { quoteId } = await searchParams;
  const c = await getActionContext().catch(logged("/invoices/new", null));
  if (!c || !(c.role === "owner" || c.role === "manager")) redirect("/dashboard");
  const [clients, number, billing] = await Promise.all([
    getClients(c.companyId).then((rows: { id: string; name: string; is_active?: boolean }[]) => rows.filter((x) => x.is_active !== false).map((x) => ({ id: x.id, name: x.name }))).catch(logged("/invoices/new", [])),
    nextInvoiceNumber(c.companyId).catch(logged("/invoices/new", "")),
    quoteId && UUID.test(quoteId) ? getQuoteInvoicing(c.companyId, quoteId).catch(logged("/invoices/new", null)) : Promise.resolve(null),
  ]);
  if (quoteId && (!billing || billing.quote.status !== "approved")) redirect("/quotes");
  return <NewInvoiceForm clients={clients} suggestedNumber={number} billing={billing ? { quoteId: billing.quote.id, number: billing.quote.number, total: billing.quote.total, invoiced: billing.invoiced, remaining: billing.remaining, clientName: billing.quote.clientName, projectName: billing.quote.projectName } : null} />;
}
