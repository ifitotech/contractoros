import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { getCurrentMember } from "@/lib/auth";
import { getInvoices } from "@/lib/services/invoices";
import { formatCurrency } from "@/lib/utils";

export default async function InvoicesPage() {
  let invoices: any[] = [];
  try { const member = await getCurrentMember(); if (member?.company_id) invoices = await getInvoices(member.company_id as string); } catch {}
  return <div className="p-4 md:p-8"><div className="flex items-center gap-3 mb-6"><div className="flex-1"><h1 className="text-xl font-bold">Invoices</h1><p className="text-sm text-slate-500">Track customer balances and payments</p></div><Link href="/invoices/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="w-4 h-4" />New invoice</Link></div><div className="space-y-2">{invoices.map((invoice) => <Link href={`/invoices/${invoice.id}`} key={invoice.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50"><Receipt className="h-5 w-5 text-brand-600" /></div><div className="flex-1"><p className="text-sm font-semibold">{invoice.number}</p><p className="text-xs text-slate-500">{invoice.client?.name || "No client"} · {invoice.status}</p></div><p className="text-sm font-bold">{formatCurrency(Number(invoice.total))}</p></Link>)}{invoices.length === 0 && <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">No invoices yet. Create the first invoice when the module is ready.</div>}</div></div>;
}
