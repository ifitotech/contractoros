import { getCurrentMember } from "@/lib/auth";
import { getInvoiceById } from "@/lib/services/invoices";
import InvoiceDetailClient from "./InvoiceDetailClient";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const member = await getCurrentMember(); if (member?.company_id) return <InvoiceDetailClient invoice={await getInvoiceById(id, member.company_id as string)} />; } catch {}
  return <InvoiceDetailClient />;
}
