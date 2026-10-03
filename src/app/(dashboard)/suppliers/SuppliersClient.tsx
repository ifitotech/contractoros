"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Mail, Phone, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui/Badge";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { addSupplierContactAction, createSupplierWithContactAction, removeSupplierContactAction, setPrimaryContactAction } from "@/app/(dashboard)/pricing/actions";
import { redeemSupplyCodeAction, revokeConnectionAction } from "@/app/supply/actions";

export type SupplierContactRow = { id: string; name: string; email: string | null; phone: string | null; is_primary: boolean };
export type SupplierRow = { id: string; name: string; connected: boolean; connectionId: string | null; contacts: SupplierContactRow[] };
const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base outline-none focus:border-brand-500";
const GENERIC = /^(info|ventas|sales|contact|contacto|admin|office|orders|quotes|support|hello)@/i;

function ContactFields({ value, onChange }: { value: { name: string; email: string; phone: string }; onChange: (v: { name: string; email: string; phone: string }) => void }) {
  const { t } = useI18n();
  return <div className="grid gap-2 sm:grid-cols-3">
    <input value={value.name} maxLength={120} aria-label={t("contactName")} placeholder={t("contactName")} onChange={(e) => onChange({ ...value, name: e.target.value })} className={field} />
    <input type="email" value={value.email} maxLength={200} aria-label={t("contactEmail")} placeholder={t("contactEmail")} onChange={(e) => onChange({ ...value, email: e.target.value })} className={field} />
    <input type="tel" value={value.phone} maxLength={40} aria-label={t("contactPhone")} placeholder={t("contactPhone")} onChange={(e) => onChange({ ...value, phone: e.target.value })} className={field} />
    {GENERIC.test(value.email.trim()) && <p className="text-xs text-amber-700 sm:col-span-3">{t("genericEmailWarn")}</p>}
  </div>;
}

export default function SuppliersClient({ rows, error = false }: { rows: SupplierRow[]; error?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const params = useSearchParams();
  // A link from a supply house arrives with its connection code already filled in.
  useEffect(() => { const c = params.get("code"); if (c) setCode(c.trim().slice(0, 24)); }, [params]);
  const [linkTo, setLinkTo] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [extra, setExtra] = useState<Record<string, { name: string; email: string; phone: string }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<{ errorCode?: string }>, okText?: string) {
    setBusy(true); setMsg(null);
    const res = await fn().catch(() => ({ errorCode: "errGeneric" }));
    setBusy(false);
    setMsg(res.errorCode ? { ok: false, text: t(res.errorCode as keyof Dictionary) } : okText ? { ok: true, text: okText } : null);
    if (!res.errorCode) router.refresh();
    return !res.errorCode;
  }

  return <div className="mx-auto max-w-3xl p-4 md:p-8">
    <h1 className="text-xl font-bold">{t("navSuppliers")}</h1>
    <p className="mb-4 text-sm text-slate-500">{t("suppliersHint")}</p>
    {(error || msg) && <div role={msg?.ok ? "status" : "alert"} className={`mb-4 rounded-xl border p-3 text-sm ${msg?.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{error ? t("errGeneric") : msg?.text}</div>}

    <section id="new-supplier" className="mb-6 space-y-2 rounded-xl border border-slate-200 bg-white p-4" aria-label={t("addSupplierWithContact")}>
      <h2 className="font-semibold">{t("addSupplierWithContact")}</h2>
      <input value={name} maxLength={120} aria-label={t("supplierCompanyName")} placeholder={t("supplierCompanyName")} onChange={(e) => setName(e.target.value)} className={field} />
      <ContactFields value={contact} onChange={setContact} />
      <button type="button" disabled={busy || !name.trim() || !contact.name.trim()} onClick={async () => { if (await run(() => createSupplierWithContactAction({ name, contactName: contact.name, email: contact.email, phone: contact.phone }))) { setName(""); setContact({ name: "", email: "", phone: "" }); } }} className="min-h-11 w-full rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{t("addSupplierWithContact")}</button>
    </section>

    <ul className="mb-6 space-y-2">
      {rows.map((r) => <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
          <Badge variant={r.connected ? "success" : "default"}>{r.connected ? t("supplierConnected") : t("supplierNotConnected")}</Badge>
          {r.connectionId && <button type="button" disabled={busy} onClick={() => { if (window.confirm(t("confirmDisconnect"))) run(() => revokeConnectionAction(r.connectionId as string)); }} className="min-h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold">{t("disconnect")}</button>}
        </div>
        <ul className="mt-2 space-y-1.5">
          {r.contacts.length === 0 && <li className="text-xs text-slate-400">{t("noContactsYet")}</li>}
          {r.contacts.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm">
            <span className="font-medium">{c.name}</span>
            {c.is_primary && <Badge variant="info">{t("primaryContact")}</Badge>}
            {c.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{c.phone}</span>}
            <span className="ml-auto flex items-center gap-1">
              {!c.is_primary && <button type="button" disabled={busy} onClick={() => run(() => setPrimaryContactAction(r.id, c.id))} className="min-h-8 rounded-md px-2 text-xs text-brand-700 hover:bg-white">{t("makePrimary")}</button>}
              <button type="button" disabled={busy} aria-label={t("removeContact")} onClick={() => { if (window.confirm(`${t("removeContact")}?`)) run(() => removeSupplierContactAction(c.id)); }} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          </li>)}
        </ul>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-brand-700">{t("addContact")}</summary>
          <div className="mt-2 space-y-2">
            <ContactFields value={extra[r.id] ?? { name: "", email: "", phone: "" }} onChange={(v) => setExtra((p) => ({ ...p, [r.id]: v }))} />
            <button type="button" disabled={busy || !(extra[r.id]?.name ?? "").trim()} onClick={async () => { const v = extra[r.id]; if (v && await run(() => addSupplierContactAction(r.id, v))) setExtra((p) => ({ ...p, [r.id]: { name: "", email: "", phone: "" } })); }} className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold disabled:opacity-40">{t("addContact")}</button>
          </div>
        </details>
      </li>)}
      {rows.length === 0 && !error && <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{t("noSuppliersYet")}</li>}
    </ul>

    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{t("connectWithCode")}</h2>
      <input value={code} maxLength={24} autoComplete="off" aria-label={t("connectCodeInput")} placeholder={t("connectCodeInput")} onChange={(e) => setCode(e.target.value)} className={`${field} font-mono`} />
      <select value={linkTo} aria-label={t("connectCodeLinkTo")} onChange={(e) => setLinkTo(e.target.value)} className={field}><option value="">{t("connectCodeNew")}</option>{rows.filter((r) => !r.connected).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button type="button" disabled={busy || code.trim().length < 24} onClick={async () => { if (await run(() => redeemSupplyCodeAction(code, linkTo || null), t("connectCodeDone"))) { setCode(""); setLinkTo(""); } }} className="min-h-11 w-full rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{t("connectWithCode")}</button>
    </section>
  </div>;
}
