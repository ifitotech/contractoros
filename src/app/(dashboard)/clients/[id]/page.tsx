import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getClientById } from "@/lib/services/clients";
import { getClientInvoices } from "@/lib/services/invoices";
import { getCompanyToday } from "@/lib/services/companies";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import ClientDetailClient from "./ClientDetailClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member?.company_id) notFound();
  const client = await getClientById(id, member.company_id as string).catch(logged("/clients/[id]", null));
  if (!client) notFound();
  const canSeeMoney = member.role === "owner" || member.role === "manager";
  const billing = canSeeMoney ? await getClientInvoices(id, member.company_id as string).catch(logged("/clients/[id]", null)) : null;
  const today = await getCompanyToday(member.company_id as string);
  return <ClientDetailClient client={client} billing={billing ? { owed: billing.owed, invoices: billing.rows.map((i) => ({ ...i, status: effectiveInvoiceStatus(i.status, i.due_date, i.total, i.amount_paid, today) })) } : null} />;
}
