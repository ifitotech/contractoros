"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, DollarSign, Download } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { recordInvoicePaymentAction, setInvoiceStatusAction } from "@/app/(dashboard)/invoices/actions";
import { useI18n } from "@/lib/i18n/provider";
import { invoiceStatusKey } from "@/lib/invoice-status";

type Invoice = {
  id: string; number: string; status: string; total: number; amount_paid: number; issue_date?: string; due_date?: string | null; notes?: string | null; quote_id?: string | null;
  client?: { name?: string } | null; project?: { name?: string } | null; quote?: { number?: string } | null;
  items?: { id: string; description: string; quantity: number; unit_price: number; amount: number }[];
};

export default function InvoiceDetailClient({ invoice: i, displayStatus, canManage }: { invoice: Invoice; displayStatus: string; canManage: boolean }) {
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState("");
  const balance = Math.max(0, Number(i.total) - Number(i.amount_paid));
  const cancelled = i.status === "cancelled";
  const badge = displayStatus === "overdue" ? "bg-red-100 text-red-700" : displayStatus === "paid" ? "bg-green-100 text-green-700" : cancelled ? "bg-slate-200 text-slate-500" : "bg-slate-100";

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    const r = (await fn().catch(() => ({ errorCode: "errGeneric" }))) as { errorCode?: string } | undefined;
    setBusy(false);
    if (r?.errorCode) { setError(t(r.errorCode as never)); return; }
    window.location.reload();
  }
  const pay = (amount: number) => {
    if (!(amount > 0)) return;
    const form = new FormData(); form.set("invoiceId", i.id); form.set("amount", String(amount));
    return run(() => recordInvoicePaymentAction(form));
  };

  return <div className="mx-auto max-w-2xl p-4 md:p-8">
    <div className="mb-6 flex items-center gap-3">
      <Link href="/invoices" aria-label={t("back")} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><p className="text-xs text-slate-400">{i.number}</p><h1 className="truncate text-lg font-bold">{i.client?.name || t("noClient")}</h1>
        <p className="truncate text-xs text-slate-500">{[i.project?.name, i.due_date ? t("invDueOn", { date: i.due_date }) : null].filter(Boolean).join(" · ")}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge}`}>{t(invoiceStatusKey(displayStatus))}</span>
    </div>

    {i.quote_id && i.quote?.number && <Link href={`/quotes/${i.quote_id}`} className="mb-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-brand-700">{t("invFromProposalLink", { number: i.quote.number })}</Link>}

    <div className="mb-4 grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{t("total")}</p><p className="font-bold">{formatCurrency(Number(i.total))}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{t("paid")}</p><p className="font-bold text-green-600">{formatCurrency(Number(i.amount_paid))}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{t("balance")}</p><p className="font-bold text-amber-600">{formatCurrency(balance)}</p></div>
    </div>

    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">{t("invoiceItems")}</h2>
      {(i.items || []).map((item) => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-50 py-3 text-sm"><span className="min-w-0 break-words">{item.description} · {item.quantity} × {formatCurrency(Number(item.unit_price))}</span><strong>{formatCurrency(Number(item.amount))}</strong></div>)}
      {i.notes && <p className="mt-4 text-sm text-slate-500">{i.notes}</p>}
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      <a href={`/api/invoices/${i.id}/pdf?lang=${locale}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"><Download className="h-4 w-4" />PDF</a>
      {canManage && i.status === "draft" && <Button disabled={busy} onClick={() => run(() => setInvoiceStatusAction(i.id, "sent"))}>{t("invMarkSent")}</Button>}
      {canManage && (i.status === "draft" || i.status === "sent") && Number(i.amount_paid) === 0 && <Button disabled={busy} variant="outline" onClick={() => { if (window.confirm(t("invConfirmCancel"))) run(() => setInvoiceStatusAction(i.id, "cancelled")); }}>{t("invCancel")}</Button>}
    </div>

    {!cancelled && balance > 0 && <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><DollarSign className="h-4 w-4" />{t("recordPayment")}</h2>
      <div className="flex gap-2"><input type="number" min="0.01" max={balance} step="0.01" value={payment} onChange={(e) => setPayment(e.target.value)} aria-label={t("amount")} placeholder={t("amount")} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><Button disabled={busy} onClick={() => pay(Number(payment))}>{t("recordPaymentBtn")}</Button></div>
      <Button disabled={busy} variant="outline" className="mt-3 w-full" onClick={() => pay(balance)}>{t("markPaidFull")}</Button>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {!cancelled && balance === 0 && <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700"><CheckCircle className="h-4 w-4" />{t("paidInFull")}</div>}
  </div>;
}
