"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, FileText, Upload } from "lucide-react";
import { POStatusBadge } from "@/components/shared/StatusBadge";
import { DeliveryTag } from "@/components/shared/DeliveryTag";
import { WaitingOn } from "@/components/shared/RequestStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { PO_STATUS_KEYS, PO_UPLOAD_STATUSES, isTerminal } from "@/lib/po-status";
import type { POStatus } from "@/types/database";
import type { PODetail as PO } from "@/lib/services/purchase-orders";
import { approvePOAction, cancelPOAction, completePOAction, getPODocumentUrlAction, receivePOAction, recordPOReceiptAction, rejectPOAction, sendPOAction, setPOExpectedDeliveryAction, uploadPODocumentAction } from "../actions";

const KIND_KEYS: Record<string, keyof Dictionary> = { receipt: "poKindReceipt", invoice: "poKindInvoice", packing_slip: "poKindPacking", other: "poKindOther" };
const btn = "min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-40";
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500";

export default function PODetail({ po, isReviewer, isCreator, canSend, canUpload }: { po: PO; isReviewer: boolean; isCreator: boolean; canSend: boolean; canUpload: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const status = po.status as POStatus;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("receipt");
  const [finalAmount, setFinalAmount] = useState(po.estimated_amount != null ? String(po.estimated_amount) : "");
  const [received, setReceived] = useState<Record<string, string>>(Object.fromEntries(po.items.map((i) => [i.id, String(i.received_quantity)])));
  const [deliveryDate, setDeliveryDate] = useState(po.expected_delivery ?? "");
  const [tax, setTax] = useState(po.tax_amount != null ? String(po.tax_amount) : "");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const money = (n: number | null | undefined) => (n == null ? "—" : formatCurrency(Number(n)));
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function run(fn: () => Promise<{ errorCode?: string }>) {
    setBusy(true); setError(null);
    const res = await fn().catch(() => ({ errorCode: "errGeneric" }));
    if (res.errorCode) setError(t(res.errorCode as keyof Dictionary));
    setBusy(false);
    router.refresh();
  }

  async function openDoc(id: string) {
    const res = await getPODocumentUrlAction(id).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; url?: string }));
    if (res.errorCode || !res.url) { setError(t((res.errorCode ?? "errGeneric") as keyof Dictionary)); return; }
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  function uploadPhoto(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("poId", po.id); form.set("kind", "receipt"); form.set("file", file);
    run(() => uploadPODocumentAction(form));
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("poId", po.id); form.set("kind", kind); form.set("file", file);
    run(() => uploadPODocumentAction(form));
    if (fileRef.current) fileRef.current.value = "";
  }

  const receiving = status === "approved" || status === "sent";
  const canCloseOut = (status === "document_uploaded" || status === "pending_review") && (isReviewer || isCreator);
  const canUploadNow = canUpload && (PO_UPLOAD_STATUSES.includes(status) || status === "document_uploaded");
  const showDocs = ["received", "pending_document", "pending_review", "document_uploaded", "completed"].includes(status) || po.documents.length > 0;

  return <div className="mx-auto max-w-lg p-4 pb-16 md:p-8">
    <div className="mb-6 flex items-center gap-3">
      <Link href="/pos" aria-label={t("back")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><p className="text-xs text-slate-400">{po.number}</p><h1 className="truncate text-lg font-bold">{po.vendor_name}</h1></div>
      <POStatusBadge status={status} />
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

    <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
      <Row label={t("navProjects")} value={po.project?.name ?? "—"} />
      {po.description && <Row label={t("description")} value={po.description} />}
      <Row label={t("poEstimated")} value={money(po.estimated_amount)} bold />
      {status === "completed" && <Row label={t("poFinal")} value={money(po.final_amount)} bold />}
      {po.tax_amount != null && <Row label={t("poTax")} value={money(po.tax_amount)} />}
      {po.freight != null && <Row label={t("freight")} value={money(po.freight)} />}
      {po.expected_delivery && <Row label={t("poExpectedDelivery")} value={<span className="inline-flex items-center gap-2">{formatDate(po.expected_delivery)}<DeliveryTag date={po.expected_delivery} status={status} /></span>} />}
      <Row label={t("employees")} value={`${po.creator?.full_name ?? "—"} · ${formatDate(po.created_at)}`} />
      {!isTerminal(status) && po.waiting_on !== "none" && <Row label={t("waitingOn")} value={<WaitingOn value={po.waiting_on} />} />}
      {po.pricing && <p className="text-xs"><Link href={`/pricing/${po.pricing.id}`} className="text-brand-700 underline">{t("poFromPricing", { number: po.pricing.number ?? "" })}</Link></p>}
    </div>

    {po.items.length > 0 && <section className="mb-4"><h2 className="mb-2 font-semibold">{t("poLines")}</h2>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{po.items.map((i) => <li key={i.id} className="flex items-start gap-3 px-4 py-3 text-sm"><div className="min-w-0 flex-1"><p className="break-words font-medium">{i.description}</p><p className="text-xs text-slate-400">{i.quantity} {i.unit} × {money(i.unit_price)}{i.lead_time ? ` · ${i.lead_time}` : ""}</p>{(i.received_quantity > 0 || receiving) && <p className={`mt-0.5 text-xs font-medium ${i.received_quantity >= i.quantity ? "text-green-700" : i.received_quantity > 0 ? "text-amber-700" : "text-slate-400"}`}>{i.received_quantity >= i.quantity ? t("poAllArrived") : t("poReceivedOf", { received: String(i.received_quantity), total: String(i.quantity) })}</p>}{receiving && <input type="number" inputMode="decimal" min="0" max={i.quantity} step="0.01" aria-label={`${t("poReceivedQty")}: ${i.description}`} value={received[i.id] ?? ""} onChange={(e) => setReceived({ ...received, [i.id]: e.target.value })} className={`${field} mt-1.5 max-w-[9rem]`} />}</div><span className="shrink-0 font-semibold">{money(i.quantity * i.unit_price)}</span></li>)}</ul>{receiving && <button type="button" disabled={busy} onClick={() => run(() => recordPOReceiptAction(po.id, po.items.map((i) => ({ id: i.id, received: Number((received[i.id] ?? "0").replace(",", ".")) || 0 }))))} className={`${btn} mt-2 w-full border border-slate-200`}>{t("poSaveReceived")}</button>}</section>}

    {po.approval_note && <p className="mb-4 whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">{po.approval_note}</p>}

    {status === "pending_approval" && isReviewer && <div className="mb-4 space-y-2">
      <textarea value={note} rows={2} maxLength={500} aria-label={t("poApprovalNote")} placeholder={t("poApprovalNote")} onChange={(e) => setNote(e.target.value)} className={field} />
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => run(() => approvePOAction(po.id, note))} className={`${btn} flex-1 bg-brand-600 text-white`}>{t("poApprove")}</button><button type="button" disabled={busy} onClick={() => run(() => rejectPOAction(po.id, note))} className={`${btn} flex-1 border border-slate-200`}>{t("poReject")}</button></div>
    </div>}
    {status === "pending_approval" && !isReviewer && <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t("poWaitsApproval")}</p>}

    {(status === "approved" || status === "sent") && <div className="mb-4 space-y-2">
      {canSend && <div className="rounded-xl border border-slate-200 bg-white p-3"><label className="block text-xs font-medium text-slate-600">{t("poExpectedDelivery")}<input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={`${field} mt-1`} /></label><p className="mt-1 text-xs text-slate-400">{t("poExpectedDeliveryHint")}</p>{status === "sent" && <div className="mt-2 flex gap-2"><button type="button" disabled={busy || deliveryDate === (po.expected_delivery ?? "")} onClick={() => run(() => setPOExpectedDeliveryAction(po.id, deliveryDate || null))} className={`${btn} flex-1 border border-slate-200`}>{deliveryDate ? t("poSaveDate") : t("poClearDate")}</button></div>}</div>}
      {status === "approved" && canSend && <button type="button" disabled={busy} onClick={() => run(() => sendPOAction(po.id, deliveryDate || null))} className={`${btn} w-full bg-brand-600 text-white`}>{t("poMarkSent")}</button>}
      <button type="button" disabled={busy} onClick={() => run(() => receivePOAction(po.id))} className={`${btn} w-full border border-slate-200`}>{t("poMarkReceived")}</button>
    </div>}

    {showDocs && <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">{t("poDocuments")}</h2>
      {po.documents.length === 0 ? <p className="mb-3 text-sm text-slate-500">{status === "completed" ? t("poNoDocsYet") : t("poDocsRequired")}</p> :
        <ul className="mb-3 space-y-1.5">{po.documents.map((d) => <li key={d.id}><button type="button" onClick={() => openDoc(d.id)} className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate">{d.name}</span><span className="text-xs text-slate-400">{d.document_kind ? t(KIND_KEYS[d.document_kind]) : ""}</span></button></li>)}</ul>}
      {canUploadNow && (isReviewer ? <div className="space-y-2">
        <select value={kind} aria-label={t("poReceiptKind")} onChange={(e) => setKind(e.target.value)} className={field}>{Object.entries(KIND_KEYS).map(([k, key]) => <option key={k} value={k}>{t(key)}</option>)}</select>
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${btn} flex w-full items-center justify-center gap-2 border border-dashed border-slate-300`}><Upload className="h-4 w-4" />{t("uploadDocument")}</button>
        <p className="text-xs text-slate-400">PDF, JPG, PNG, WEBP · 10 MB</p>
      </div> : <div className="space-y-2">
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className={`${btn} flex w-full items-center justify-center gap-2 bg-brand-600 text-white`}><Camera className="h-5 w-5" />{t("takeReceiptPhoto")}</button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${btn} flex w-full items-center justify-center gap-2 border border-slate-200`}><Upload className="h-4 w-4" />{t("chooseReceiptPhoto")}</button>
        <p className="text-xs text-slate-400">{t("receiptRequiredHint")}</p>
      </div>)}
    </section>}

    {canCloseOut && po.documents.length > 0 && <section className="mb-4 space-y-2 rounded-xl border border-brand-500 bg-white p-5">
      <label className="block text-sm font-medium">{t("poFinalAmount")}<input inputMode="decimal" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className={`${field} mt-1`} /></label>
      <label className="block text-sm font-medium">{t("poTaxAmount")}<input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={`${field} mt-1`} /></label>
      <p className="text-xs text-slate-500">{t("poCompleteHint")}</p>
      <button type="button" disabled={busy || num(finalAmount) == null} onClick={() => run(() => completePOAction(po.id, num(finalAmount) ?? 0, num(tax)))} className={`${btn} w-full bg-brand-600 text-white`}>{t("completePO")}</button>
    </section>}

    {!isTerminal(status) && (isReviewer || isCreator) && <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("poConfirmCancel"))) run(() => cancelPOAction(po.id)); }} className={`${btn} w-full border border-red-100 bg-red-50 text-red-600`}>{t("poCancel")}</button>}

    {po.history.length > 0 && <section className="mt-8"><h2 className="mb-2 text-sm font-semibold text-slate-500">{t("poHistory")}</h2>
      <ul className="space-y-1 text-xs text-slate-500">{po.history.map((h) => <li key={h.id}>{formatDate(h.created_at)} · {t(PO_STATUS_KEYS[h.to_status as POStatus] as keyof Dictionary)}{h.changer?.full_name ? ` · ${h.changer.full_name}` : ""}{h.notes ? ` — ${h.notes}` : ""}</li>)}</ul></section>}
  </div>;
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-slate-500">{label}</span><span className={`text-right ${bold ? "font-bold" : ""}`}>{value}</span></div>;
}
