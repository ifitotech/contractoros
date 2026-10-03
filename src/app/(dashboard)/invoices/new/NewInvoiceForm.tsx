"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { useI18n } from "@/lib/i18n/provider";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

type Billing = { quoteId: string; number: string; total: number; invoiced: number; remaining: number; clientName: string | null; projectName: string | null };

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function NewInvoiceForm({ clients, suggestedNumber = "", billing = null }: { clients: { id: string; name: string }[]; suggestedNumber?: string; billing?: Billing | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(billing ? t("invFullDesc", { number: billing.number }) : "");
  const [amount, setAmount] = useState(billing ? String(billing.remaining) : "");

  const presets = billing ? [
    ...[30, 50].filter((pct) => round2(billing.total * pct / 100) <= billing.remaining + 0.005).map((pct) => ({ key: `p${pct}`, label: `${pct}%`, amount: round2(billing.total * pct / 100), text: t("invPercentDesc", { pct: String(pct), number: billing.number }) })),
    { key: "rest", label: t("invRest"), amount: billing.remaining, text: billing.invoiced > 0 ? t("invRestDesc", { number: billing.number }) : t("invFullDesc", { number: billing.number }) },
  ] : [];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createInvoiceAction(new FormData(event.currentTarget)).catch(() => ({ errorCode: "errGeneric" }));
    if (result?.errorCode) { setError(t(result.errorCode as never)); setSaving(false); }
  }

  return <div className="p-4 md:p-8 max-w-lg mx-auto">
    <div className="flex items-center gap-3 mb-6"><button type="button" aria-label={t("cancel")} onClick={() => router.back()} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button><h1 className="text-lg font-bold">{t("newInvoice")}</h1></div>

    {billing && <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
      <p className="font-semibold">{t("invFromProposal", { number: billing.number })}</p>
      <p className="text-slate-600">{[billing.clientName, billing.projectName].filter(Boolean).join(" · ")}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div><dt className="text-[11px] uppercase text-slate-500">{t("qTotal")}</dt><dd className="font-semibold">{formatCurrency(billing.total)}</dd></div>
        <div><dt className="text-[11px] uppercase text-slate-500">{t("invBilled")}</dt><dd className="font-semibold">{formatCurrency(billing.invoiced)}</dd></div>
        <div><dt className="text-[11px] uppercase text-slate-500">{t("invLeft")}</dt><dd className="font-semibold">{formatCurrency(billing.remaining)}</dd></div>
      </dl>
    </div>}

    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      {billing && <input type="hidden" name="quoteId" value={billing.quoteId} />}
      {billing && billing.remaining > 0 && <div>
        <p className="mb-2 text-sm font-medium">{t("invHowMuch")}</p>
        <div className="flex flex-wrap gap-2">{presets.map((p) => <button key={p.key} type="button" onClick={() => { setAmount(String(p.amount)); setDescription(p.text); }} className="min-h-11 rounded-xl border border-brand-500 px-4 text-sm font-semibold text-brand-700">{p.label} · {formatCurrency(p.amount)}</button>)}</div>
      </div>}
      {billing && billing.remaining <= 0 && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{t("invAllBilled")}</p>}
      <Input name="number" label={t("invoiceNumber")} defaultValue={suggestedNumber} placeholder="INV-0001" required />
      {!billing && <label className="block text-sm font-medium">{t("clientLabel")}
        <select name="clientId" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base md:text-sm"><option value="">{t("noClient")}</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>}
      <Input name="dueDate" label={t("dueDate")} type="date" />
      <Input name="description" label={t("invoiceDescription")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("invoiceDescriptionPh")} required />
      <Input name="amount" label={t("amount")} type="number" step="0.01" min="0.01" max={billing ? billing.remaining : undefined} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
      <Input name="notes" label={t("notes")} />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" loading={saving} disabled={Boolean(billing && billing.remaining <= 0)}>{t("saveDraft")}</Button>
    </form>
  </div>;
}
