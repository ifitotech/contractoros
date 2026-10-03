"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, FileText, Paperclip } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";
import { createPOFromResponseAction } from "@/app/(dashboard)/pos/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { AVAILABILITY, PRICING_TYPES, bestPriceByLine } from "@/lib/pricing";
import { PricingStatusBadge } from "@/components/shared/PricingStatusBadge";
import { WaitingOn } from "@/components/shared/RequestStatusBadge";
import type { InvitationView, QuestionView, getPricingRequestById } from "@/lib/services/pricing-requests";
import {
  addAttachmentAction, answerQuestionAction, awardResponseAction, createSupplierLinkAction, revokeSupplierLinkAction, cancelPricingAction, closeRequestAction, createSupplierAction,
  getAttachmentUrlAction, markSentAction, recordResponseAction,
} from "../actions";

type Request = NonNullable<Awaited<ReturnType<typeof getPricingRequestById>>>;
type Supplier = { id: string; name: string; supply_company_id?: string | null; contacts?: { id: string; name: string; email: string | null; is_primary: boolean }[] };
const AVAIL_KEYS: Record<string, keyof Dictionary> = { available: "availAvailable", partial: "availPartial", unavailable: "availUnavailable" };
const OPEN = ["draft", "sent", "question_open", "responded"];

export default function PricingDetail({ request: r, suppliers, invitations = [], questions = [], pos = [], canManage, pricesVisible }: { request: Request; suppliers: Supplier[]; pos?: { id: string; number: string; supplier_response_id: string | null }[]; invitations?: InvitationView[]; questions?: QuestionView[]; canManage: boolean; pricesVisible: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const { permissions } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isOpen = OPEN.includes(r.status);
  const typeKey = PRICING_TYPES.find((p) => p.code === r.request_type)?.key;
  const best = useMemo(() => bestPriceByLine(r.responses), [r.responses]);

  async function run(fn: () => Promise<{ errorCode?: string }>) {
    setBusy(true); setError(null);
    const res = await fn().catch(() => ({ errorCode: "errGeneric" }));
    if (res.errorCode) setError(t(res.errorCode as keyof Dictionary));
    setBusy(false);
    router.refresh();
    return !res.errorCode;
  }

  async function openFile(id: string) {
    const res = await getAttachmentUrlAction(id).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; url?: string }));
    if (res.errorCode || !res.url) { setError(t((res.errorCode ?? "errGeneric") as keyof Dictionary)); return; }
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("requestId", r.id); form.set("file", file);
    run(() => addAttachmentAction(form));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function copyText() {
    const lines = r.items.map((i) => `- ${i.quantity} ${i.unit}  ${i.description}${i.allow_substitution ? ` (${t("substitutionOk")})` : ""}`);
    const head = [`${r.number}${r.title ? ` — ${r.title}` : ""}`, r.response_due_date ? `${t("bidDate")}: ${formatDate(r.response_due_date)}` : "", r.notes ?? ""].filter(Boolean);
    const links = r.links.map((l) => `${l.label}: ${l.url}`);
    try { await navigator.clipboard.writeText([...head, "", ...lines, ...(links.length ? ["", ...links] : [])].join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError(t("errGeneric")); }
  }

  const btn = "min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-40";
  const money = (n: number | null) => (n == null ? "—" : formatCurrency(n));

  return <div className="mx-auto max-w-3xl p-4 pb-16 md:p-8">
    <div className="mb-5 flex items-start gap-3">
      <Link href="/pricing" aria-label={t("back")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{r.number}</h1><PricingStatusBadge status={r.status} /><span className="text-xs text-slate-400">{typeKey ? t(typeKey) : r.request_type}</span></div>
        <p className="text-sm text-slate-500">{[r.title, r.project?.name].filter(Boolean).join(" · ")}</p>
        <p className="text-xs text-slate-400">{r.response_due_date ? `${t("bidDate")} ${formatDate(r.response_due_date)} · ` : ""}{t("waitingOn")}: <WaitingOn value={r.waiting_on} />{r.material_request ? ` · ${t("prFromRequest", { number: r.material_request.number })}` : ""}</p>
      </div>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
    {(() => {
      // Four steps, always in this order. The current one is the first that is not done yet.
      const done = [true, invitations.length > 0 || r.status !== "draft", r.responses.length > 0, r.status === "converted_to_po" || r.status === "awarded" || r.responses.some((x) => x.status === "accepted")];
      const current = done.findIndex((d) => !d);
      const labels = [t("prStep1"), t("prStep2"), t("prStep3"), t("prStep4")];
      return <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label={t("prSteps")}>{labels.map((label, i) => <li key={i} aria-current={i === current ? "step" : undefined} className={`rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight ${done[i] ? "bg-green-100 text-green-800" : i === current ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}><span className="block text-sm">{done[i] ? "✓" : i + 1}</span>{label}</li>)}</ol>;
    })()}
    {r.notes && <p className="mb-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm">{r.notes}</p>}
    <h2 className="mb-2 font-semibold">{t("prStep1Title")}</h2>

    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{r.items.map((i) => <li key={i.id} className="flex items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1"><p className="break-words font-medium">{i.description}</p>{i.allow_substitution && <p className="text-xs text-slate-400">{t("substitutionOk")}</p>}</div>
      <span className="shrink-0 font-semibold">{i.quantity} {i.unit}</span></li>)}</ul>

    {(r.links.length > 0 || r.attachments.some((a) => !a.response_id) || canManage) && <section className="mt-5">
      <h2 className="mb-2 font-semibold">{t("prFiles")}</h2>
      <ul className="space-y-1.5">
        {r.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-700"><ExternalLink className="h-4 w-4 shrink-0" /><span className="truncate">{l.label}</span></a></li>)}
        {r.attachments.filter((a) => !a.response_id).map((a) => <li key={a.id}><button type="button" onClick={() => openFile(a.id)} className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate">{a.name}</span><span className="text-xs text-slate-400">{t("openFile")}</span></button></li>)}
      </ul>
      {canManage && isOpen && <><input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="mt-2 flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium disabled:opacity-40"><Paperclip className="h-4 w-4" />{t("addFile")}</button></>}
    </section>}

    {canManage && isOpen && <div className="mt-5 space-y-2">
      {r.status === "draft" && <p className="text-xs text-slate-500">{t("prMarkSentHint")}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyText} className={`${btn} flex items-center gap-2 border border-slate-200`}><Copy className="h-4 w-4" />{copied ? t("prCopied") : t("prCopyText")}</button>
        {r.status === "draft" && <button type="button" disabled={busy} onClick={() => run(() => markSentAction(r.id))} className={`${btn} bg-brand-600 text-white`}>{t("prMarkSent")}</button>}
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("prConfirmClose"))) run(() => closeRequestAction(r.id)); }} className={`${btn} border border-slate-200`}>{t("prClose")}</button>
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("confirmCancelRequest"))) run(() => cancelPricingAction(r.id)); }} className={`${btn} border border-red-100 bg-red-50 text-red-600`}>{t("prCancel")}</button>
      </div>
    </div>}

    {canManage && <SupplierLinks request={r} suppliers={suppliers} invitations={invitations} questions={questions} isOpen={isOpen} onChange={() => router.refresh()} />}

    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2"><h2 className="flex-1 font-semibold">{t("prStep3Title")}</h2>
        {canManage && isOpen && <button type="button" onClick={() => setShowForm((v) => !v)} className="min-h-10 rounded-lg border border-brand-500 bg-brand-50 px-3 text-sm font-semibold text-brand-700">{t("recordResponse")}</button>}</div>
      {!pricesVisible && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{t("pricesHidden")}</p>}
      {canManage && showForm && <ResponseForm request={r} suppliers={suppliers} onDone={() => { setShowForm(false); router.refresh(); }} />}
      {pricesVisible && r.responses.length === 0 && !showForm && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{t("noResponsesYet")}</p>}
      {pricesVisible && r.responses.length > 0 && <div className="space-y-3">
        {r.responses.map((resp) => <div key={resp.id} className={`rounded-xl border bg-white p-4 ${resp.status === "accepted" ? "border-green-300" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{resp.supplier_name}</p>{resp.status === "accepted" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">{t("awarded")}</span>}<span className="ml-auto text-lg font-bold">{money(resp.total_amount)}</span></div>
          <p className="text-xs text-slate-400">{[resp.quote_number, resp.expires_on ? `${t("validUntil")} ${formatDate(resp.expires_on)}` : null, resp.freight != null ? `${t("freight")} ${money(resp.freight)}` : null, resp.tax_amount != null ? `${t("taxAmount")} ${money(resp.tax_amount)}` : null].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 divide-y divide-slate-100 text-sm">{r.items.map((i) => { const l = resp.lines.find((x) => x.requestItemId === i.id); if (!l) return null; const isBest = l.unitPrice != null && best.get(i.id) === l.unitPrice && r.responses.length > 1;
            return <div key={i.id} className="flex items-start gap-2 py-1.5"><span className="min-w-0 flex-1 break-words">{i.description}</span><span className="shrink-0 text-right"><span className={isBest ? "font-semibold text-green-700" : ""}>{money(l.unitPrice)}</span>{isBest && <span className="ml-1 text-[10px] font-semibold text-green-700">{t("bestPrice")}</span>}<span className="block text-xs text-slate-400">{[l.availability ? t(AVAIL_KEYS[l.availability]) : null, l.leadTime].filter(Boolean).join(" · ")}</span></span></div>; })}</div>
          {resp.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{resp.notes}</p>}
          {r.attachments.filter((a) => a.response_id === resp.id).map((a) => <button key={a.id} type="button" onClick={() => openFile(a.id)} className="mt-2 flex min-h-9 items-center gap-2 text-sm text-brand-700"><FileText className="h-4 w-4" />{a.name}</button>)}
          {(() => { const po = pos.find((x) => x.supplier_response_id === resp.id);
            if (po) return <Link href={`/pos/${po.id}`} className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-brand-500 bg-brand-50 px-4 text-sm font-semibold text-brand-700">{t("poViewExisting", { number: po.number })}</Link>;
            if (!permissions.can_create_po || !["submitted", "accepted"].includes(resp.status) || !r.project_id || ["closed", "cancelled"].includes(r.status)) return null;
            return <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(null); const res = await createPOFromResponseAction(r.id, resp.id).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; id?: string })); setBusy(false); if (res.errorCode) { setError(t(res.errorCode as keyof Dictionary)); return; } router.push(`/pos/${res.id}`); router.refresh(); }} className={`${btn} mt-3 w-full border border-brand-500 bg-brand-50 text-brand-700`}>{t("poCreateFromResponse")}</button>; })()}
          {canManage && isOpen && resp.status === "submitted" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("confirmAward"))) run(() => awardResponseAction(r.id, resp.id)); }} className={`${btn} mt-3 w-full bg-brand-600 text-white`}>{t("awardResponse")}</button>}
        </div>)}
      </div>}
    </section>
  </div>;
}

function ResponseForm({ request: r, suppliers, onDone }: { request: Request; suppliers: Supplier[]; onDone: () => void }) {
  const { t } = useI18n();
  const [supplierId, setSupplierId] = useState("");
  const [newName, setNewName] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [total, setTotal] = useState("");
  const [freight, setFreight] = useState("");
  const [tax, setTax] = useState("");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Record<string, { price: string; availability: string; lead: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base outline-none focus:border-brand-500";
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const setLine = (id: string, p: Partial<{ price: string; availability: string; lead: string }>) => setLines((prev) => ({ ...prev, [id]: { ...{ price: "", availability: "", lead: "" }, ...prev[id], ...p } }));

  async function save() {
    setError(null); setBusy(true);
    let sid: string | null = supplierId || null;
    let name = suppliers.find((s) => s.id === supplierId)?.name ?? "";
    if (!sid && newName.trim()) {
      name = newName.trim();
      const created = await createSupplierAction(name).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; id?: string }));
      if (created.errorCode) { setError(t(created.errorCode as keyof Dictionary)); setBusy(false); return; }
      sid = created.id ?? null;
    }
    const res = await recordResponseAction(r.id, {
      supplierId: sid, supplierName: name, quoteNumber, totalAmount: num(total), freight: num(freight), taxAmount: num(tax), expiresOn: expires || null, notes,
      lines: r.items.map((i) => ({ requestItemId: i.id, unitPrice: num(lines[i.id]?.price ?? ""), availability: lines[i.id]?.availability || null, leadTime: lines[i.id]?.lead || null })),
    }).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string }));
    setBusy(false);
    if (res.errorCode) { setError(t(res.errorCode as keyof Dictionary)); return; }
    onDone();
  }

  return <div className="mb-4 space-y-3 rounded-xl border border-brand-500 bg-white p-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium">{t("supplierName")}<select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${input} mt-1`}><option value="" />{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {!supplierId && <label className="block text-sm font-medium">{t("newSupplierName")}<input value={newName} maxLength={120} onChange={(e) => setNewName(e.target.value)} className={`${input} mt-1`} /></label>}
      <label className="block text-sm font-medium">{t("quoteNumber")}<input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">{t("validUntil")}<input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${input} mt-1`} /></label>
    </div>
    <div className="rounded-lg bg-slate-50 p-3">
      <label className="block text-sm font-semibold">{t("quoteTotal")}<input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" className={`${input} mt-1`} /></label>
      <p className="mt-1 text-xs text-slate-500">{t("totalOnlyHint")}</p>
    </div>
    <details className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-600">{t("lineDetail")}</summary>
      <div className="mt-3 space-y-3">
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">{r.items.map((i) => <div key={i.id} className="space-y-2 p-3">
      <p className="text-sm font-medium">{i.description} <span className="text-slate-400">· {i.quantity} {i.unit}</span></p>
      <div className="grid grid-cols-3 gap-2">
        <input inputMode="decimal" placeholder={t("unitPrice")} aria-label={`${t("unitPrice")} ${i.description}`} value={lines[i.id]?.price ?? ""} onChange={(e) => setLine(i.id, { price: e.target.value })} className={input} />
        <select aria-label={`${t("availability")} ${i.description}`} value={lines[i.id]?.availability ?? ""} onChange={(e) => setLine(i.id, { availability: e.target.value })} className={input}><option value="">{t("availability")}</option>{AVAILABILITY.map((a) => <option key={a} value={a}>{t(AVAIL_KEYS[a])}</option>)}</select>
        <input placeholder={t("leadTime")} aria-label={`${t("leadTime")} ${i.description}`} value={lines[i.id]?.lead ?? ""} onChange={(e) => setLine(i.id, { lead: e.target.value })} className={input} />
      </div></div>)}</div>
    <div className="grid grid-cols-3 gap-2">
      <label className="block text-sm font-medium">{t("freight")}<input inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">{t("taxAmount")}<input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={`${input} mt-1`} /></label>
    </div>
      </div>
    </details>
    <textarea value={notes} rows={2} maxLength={2000} aria-label={t("itemNotes")} placeholder={t("itemNotes")} onChange={(e) => setNotes(e.target.value)} className={input} />
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <button type="button" disabled={busy} onClick={save} className="min-h-11 w-full rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{t("saveResponse")}</button>
  </div>;
}

function SupplierLinks({ request: r, suppliers, invitations, questions, isOpen, onChange }: { request: Request; suppliers: Supplier[]; invitations: InvitationView[]; questions: QuestionView[]; isOpen: boolean; onChange: () => void }) {
  const { t } = useI18n();
  const [supplierId, setSupplierId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ name: string; url: string } | null>(null);
  const [sentInApp, setSentInApp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const input = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base outline-none focus:border-brand-500";

  const connected = Boolean(suppliers.find((s) => s.id === supplierId)?.supply_company_id);

  async function sendInApp() {
    setBusy(true); setError(null);
    const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? "";
    const res = await createSupplierLinkAction(r.id, { supplierId, supplierName, viaAccount: true }).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string }));
    setBusy(false);
    if (res.errorCode) { setError(t(res.errorCode as keyof Dictionary)); return; }
    setSentInApp(supplierName);
    onChange();
  }

  async function create() {
    setBusy(true); setError(null);
    const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? name.trim();
    const res = await createSupplierLinkAction(r.id, { supplierId: supplierId || null, supplierName, supplierEmail: email || null, days: Number(days) || 14 }).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; token?: string }));
    setBusy(false);
    if (res.errorCode || !res.token) { setError(t((res.errorCode ?? "errGeneric") as keyof Dictionary)); return; }
    setFresh({ name: supplierName, url: `${window.location.origin}/supplier/${res.token}` });
    setName(""); setEmail(""); setSupplierId("");
    onChange();
  }

  async function act(fn: () => Promise<{ errorCode?: string }>) {
    setBusy(true); setError(null);
    const res = await fn().catch(() => ({ errorCode: "errGeneric" }));
    if (res.errorCode) setError(t(res.errorCode as keyof Dictionary));
    setBusy(false);
    onChange();
  }

  const status = (i: InvitationView) => i.revoked_at ? t("linkRevoked") : new Date(i.expires_at) < new Date() ? t("linkExpires", { date: formatDate(i.expires_at) }) : i.first_opened_at ? t("linkOpened", { date: formatDate(i.first_opened_at) }) : t("linkNotOpened");

  return <section className="mt-8">
    <h2 className="mb-2 font-semibold">{t("prStep2Title")}</h2>
    {error && <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    {sentInApp && <div role="status" className="mb-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm">{t("sentToSupplyAccount", { name: sentInApp })}</div>}
    {fresh && <div className="mb-3 rounded-xl border border-green-300 bg-green-50 p-3">
      <p className="text-sm font-semibold">{t("linkForSupplier", { name: fresh.name })}</p>
      <p className="mt-1 break-all rounded-lg bg-white p-2 text-xs">{fresh.url}</p>
      <p className="mt-1 text-xs text-slate-600">{t("linkShownOnce")}</p>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(fresh.url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError(t("errGeneric")); } }} className="mt-2 flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white"><Copy className="h-4 w-4" />{copied ? t("prCopied") : t("copyLink")}</button>
    </div>}
    {isOpen && <div className="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
      <label className="block text-sm font-medium">{t("supplierName")}<select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); const c = suppliers.find((s) => s.id === e.target.value)?.contacts?.[0]; setEmail(c?.email ?? ""); }} className={`${input} mt-1`}><option value="" />{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {supplierId && (suppliers.find((s) => s.id === supplierId)?.contacts?.length ?? 0) > 0 && <label className="block text-sm font-medium">{t("chooseContact")}<select onChange={(e) => setEmail(suppliers.find((s) => s.id === supplierId)?.contacts?.find((c) => c.id === e.target.value)?.email ?? "")} className={`${input} mt-1`}>{suppliers.find((s) => s.id === supplierId)?.contacts?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_primary ? ` · ${t("primaryContact")}` : ""}</option>)}</select></label>}
      {!supplierId && <label className="block text-sm font-medium">{t("newSupplierName")}<input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} /></label>}
      <label className="block text-sm font-medium">{t("supplierEmailOptional")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-1`} /></label>
      <label className="block text-sm font-medium">{t("linkDays")}<input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={`${input} mt-1`} /></label>
      {connected && <button type="button" disabled={busy} onClick={sendInApp} className="min-h-11 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2">{t("sendToSupplyAccount")}</button>}
      <button type="button" disabled={busy || (!supplierId && !name.trim())} onClick={create} className={`min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-40 sm:col-span-2 ${connected ? "border border-slate-200" : "bg-brand-600 text-white"}`}>{t("createSupplierLink")}</button>
    </div>}
    <ul className="space-y-2">{invitations.map((i) => { const qs = questions.filter((q) => q.invitation_id === i.id); const live = !i.revoked_at && new Date(i.expires_at) > new Date();
      return <li key={i.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-medium">{i.supplier_name}{i.supply_company_id ? <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{t("supplyAccountBadge")}</span> : null}</span><span className="text-xs text-slate-400">{status(i)}</span>
          {live && isOpen && <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("confirmRevokeLink"))) act(() => revokeSupplierLinkAction(r.id, i.id)); }} className="min-h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold">{t("revokeLink")}</button>}</div>
        {qs.length > 0 && <div className="mt-2 space-y-1.5"><p className="text-xs font-semibold text-slate-500">{t("supplierQuestions")}</p>{qs.map((q) => <p key={q.id} className={`whitespace-pre-wrap rounded-lg p-2 text-xs ${q.author === "supplier" ? "bg-amber-50" : "bg-brand-50"}`}><span className="font-semibold">{q.author === "supplier" ? i.supplier_name : t("youLabel")}: </span>{q.body}</p>)}</div>}
        {live && isOpen && qs.length > 0 && <div className="mt-2 flex gap-2"><input value={replies[i.id] ?? ""} maxLength={2000} aria-label={t("answerQuestion")} placeholder={t("answerQuestion")} onChange={(e) => setReplies((p) => ({ ...p, [i.id]: e.target.value }))} className={input} /><button type="button" disabled={busy || !(replies[i.id] ?? "").trim()} onClick={() => act(async () => { const res = await answerQuestionAction(r.id, i.id, replies[i.id] ?? ""); if (!res.errorCode) setReplies((p) => ({ ...p, [i.id]: "" })); return res; })} className="min-h-10 shrink-0 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white disabled:opacity-40">{t("answerQuestion")}</button></div>}
      </li>; })}</ul>
  </section>;
}
