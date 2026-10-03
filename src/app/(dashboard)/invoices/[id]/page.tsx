import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCompanyToday } from "@/lib/services/companies";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { getInvoiceById } from "@/lib/services/invoices";
import InvoiceDetailClient from "./InvoiceDetailClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member?.company_id) notFound();
  const invoice = await getInvoiceById(id, member.company_id as string).catch(logged("/invoices/[id]", null));
  if (!invoice) notFound();
  const status = effectiveInvoiceStatus(invoice.status, invoice.due_date, Number(invoice.total), Number(invoice.amount_paid ?? 0), await getCompanyToday(member.company_id as string));
  return <InvoiceDetailClient invoice={invoice} displayStatus={status} canManage={member.role === "owner" || member.role === "manager"} />;
}
