"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { PRICING_TYPES } from "@/lib/pricing";
import { createPricingRequestAction } from "../actions";

type Source = { id: string; number: string; projectId: string; projectName: string; itemCount: number };

export default function NewPricingForm({ projects, requests, initialFrom }: { projects: { id: string; name: string }[]; requests: Source[]; initialFrom: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [from, setFrom] = useState(requests.some((r) => r.id === initialFrom) ? initialFrom : requests[0]?.id ?? "");
  const source = requests.find((r) => r.id === from);
  const [type, setType] = useState("material");
  const [title, setTitle] = useState("");
  const [bidDate, setBidDate] = useState("");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");
  const [delivery, setDelivery] = useState("delivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500";

  async function submit() {
    setError(null); setBusy(true);
    const res = await createPricingRequestAction({
      projectId: source?.projectId ?? null, requestType: type, title, bidDate: bidDate || null, notes,
      deliveryMethod: delivery || null, links: links.split("\n").map((u) => ({ url: u.trim(), label: "" })).filter((l) => l.url),
      materialRequestId: source?.id ?? null, lines: [],
    }).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; id?: string }));
    if (res.errorCode) { setError(t(res.errorCode as keyof Dictionary)); setBusy(false); return; }
    router.push(`/pricing/${res.id}`);
    router.refresh();
  }

  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28 md:p-8">
    <h1 className="text-xl font-bold">{t("newPricingRequest")}</h1>
    {requests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm text-slate-600">{t("prNeedsList")}</p>
      <Link href="/material" className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white">{t("prCreateListFirst")}</Link>
    </div> : <label className="block text-sm font-medium">{t("fromMaterialRequest")}
      <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1`}>{requests.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.projectName} · {t("itemsCount", { count: String(r.itemCount) })}</option>)}</select>
      <span className="mt-1 block text-xs font-normal text-slate-500">{t("prListHint")}</span></label>}
    {requests.length > 0 && <>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium">{t("prAnswerBy")}<input type="date" value={bidDate} onChange={(e) => setBidDate(e.target.value)} className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">{t("prDelivery")}<select value={delivery} onChange={(e) => setDelivery(e.target.value)} className={`${input} mt-1`}><option value="delivery">{t("prDeliveryDelivery")}</option><option value="pickup">{t("prDeliveryPickup")}</option></select></label>
    </div>
    <label className="block text-sm font-medium">{t("prNotes")}<textarea value={notes} rows={3} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className={`${input} mt-1`} /></label>
    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">{t("prMoreOptions")}</summary>
      <div className="mt-3 space-y-4">
        <label className="block text-sm font-medium">{t("prTitle")}<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} /></label>
        <label className="block text-sm font-medium">{t("prType")}<select value={type} onChange={(e) => setType(e.target.value)} className={`${input} mt-1`}>{PRICING_TYPES.map((p) => <option key={p.code} value={p.code}>{t(p.key)}</option>)}</select></label>
        <label className="block text-sm font-medium">{t("prLinks")}<textarea value={links} rows={2} onChange={(e) => setLinks(e.target.value)} className={`${input} mt-1`} /></label>
      </div>
    </details>
    </>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
    <div className="fixed inset-x-0 bottom-[calc(3.9rem+env(safe-area-inset-bottom,0px))] z-30 border-t md:bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:left-64">
      <div className="mx-auto max-w-2xl"><button type="button" disabled={busy || !source} onClick={submit} className="min-h-12 w-full rounded-xl bg-brand-600 px-4 font-semibold text-white disabled:opacity-40">{t("prCreate")}</button></div>
    </div>
  </div>;
}
