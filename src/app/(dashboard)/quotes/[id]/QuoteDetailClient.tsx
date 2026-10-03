"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { QuoteStatusBadge } from "@/components/shared/StatusBadge";
import { WaitingOn } from "@/components/shared/RequestStatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { getProposalExtras } from "@/lib/services/proposals";
import ProposalPanel from "./ProposalPanel";

type Quote = {
  id: string; number: string; status: string; version?: number; waiting_on?: string; issue_date?: string; valid_until?: string | null; subtotal: number; tax_amount?: number; discount_amount?: number; total: number;
  terms?: string | null; notes?: string | null; client?: { name?: string } | null; project?: { name?: string } | null;
  items?: { id: string; description: string; quantity: number; unit_price: number; amount: number; part_number?: string | null }[];
};

type Billing = { invoiced: number; total: number; remaining: number; invoices: { id: string; number: string; status: string; total: number }[] };
type Money = { contractValue: number; actualCost: number; committedCost: number; estimatedProfit?: number; estimatedMargin?: number };

export default function QuoteDetailClient({ quote: q, extras, canManage, billing = null, money = null }: { quote: Quote; extras: Awaited<ReturnType<typeof getProposalExtras>> | null; canManage: boolean; billing?: Billing | null; money?: Money | null }) {
  const { t, locale } = useI18n();
  const items = [...(q.items ?? [])];
  return <div className="mx-auto max-w-2xl p-4 pb-16 md:p-8">
    <div className="mb-6 flex items-center gap-3">
      <Link href="/quotes" aria-label={t("back")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><p className="text-xs text-slate-400">{q.number}{(q.version ?? 1) > 1 ? ` · ${t("proposalVersion", { version: String(q.version) })}` : ""}</p><h1 className="truncate text-lg font-bold">{q.project?.name || q.client?.name || t("proposal")}</h1></div>
      <QuoteStatusBadge status={q.status} />
    </div>
    <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm">
      <div className="flex justify-between"><span className="text-slate-500">{t("qClient")}</span><strong>{q.client?.name || "—"}</strong></div>
      <div className="flex justify-between"><span className="text-slate-500">{t("qIssueDate")}</span><span>{q.issue_date || "—"}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">{t("qValidUntil")}</span><span>{q.valid_until || "—"}</span></div>
      {q.waiting_on && q.waiting_on !== "none" && <div className="flex justify-between"><span className="text-slate-500">{t("waitingOn")}</span><span><WaitingOn value={q.waiting_on} /></span></div>}
    </div>
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">{t("qLineItems")}</h2>
      <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-50 pb-3 text-sm"><div className="min-w-0"><p className="break-words font-medium">{item.description}</p><p className="text-xs text-slate-500">{item.part_number || ""}{item.part_number ? " · " : ""}{item.quantity} × {formatCurrency(Number(item.unit_price))}</p></div><strong className="shrink-0">{formatCurrency(Number(item.amount))}</strong></div>)}</div>
      <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between"><span>{t("qSubtotal")}</span><span>{formatCurrency(Number(q.subtotal))}</span></div>
        {Number(q.discount_amount || 0) > 0 && <div className="flex justify-between"><span>{t("qDiscount")}</span><span>-{formatCurrency(Number(q.discount_amount))}</span></div>}
        <div className="flex justify-between"><span>{t("qTax")}</span><span>{formatCurrency(Number(q.tax_amount || 0))}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>{t("qTotal")}</span><span>{formatCurrency(Number(q.total))}</span></div>
      </div>
    </div>
    {(q.notes || q.terms) && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 text-sm"><p className="whitespace-pre-wrap">{q.notes}</p><p className="mt-3 whitespace-pre-wrap text-slate-500">{q.terms}</p></div>}

    {billing && <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5" aria-label={t("billingTitle")}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{t("billingTitle")}</h2><p className="text-sm text-slate-500">{t("billingProgress", { billed: formatCurrency(billing.invoiced), total: formatCurrency(billing.total) })}</p></div>
        {billing.remaining > 0 && <Link href={`/invoices/new?quoteId=${q.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">{t("createInvoiceFromProposal")}</Link>}</div>
      {billing.invoices.length > 0 && <ul className="mt-3 space-y-1.5">{billing.invoices.map((i) => <li key={i.id}><Link href={`/invoices/${i.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span className="font-medium">{i.number}</span><span>{formatCurrency(i.total)}</span></Link></li>)}</ul>}
    </section>}
    {money && <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 text-sm" aria-label={t("marginTitle")}>
      <h2 className="mb-1 font-semibold">{t("marginTitle")}</h2>
      <p className="text-slate-500">{t("marginLine", { contract: formatCurrency(money.contractValue), actual: formatCurrency(money.actualCost), committed: formatCurrency(money.committedCost) })}</p>
      {money.estimatedProfit != null && <p className={`mt-1 font-semibold ${money.estimatedProfit < 0 ? "text-red-700" : "text-green-700"}`}>{t("marginResult", { amount: formatCurrency(money.estimatedProfit), pct: String(Math.round((money.estimatedMargin ?? 0) * 10) / 10) })}</p>}
    </section>}
    <a href={`/api/quotes/${q.id}/pdf?lang=${locale}`} className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><Download className="h-4 w-4" />PDF</a>
    {extras && <ProposalPanel quote={{ id: q.id, status: q.status, number: q.number, version: q.version ?? 1, clientName: q.client?.name ?? "" }} extras={extras} canManage={canManage} />}
  </div>;
}
