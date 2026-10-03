"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { createConnectCodeAction, revokeConnectionAction } from "../actions";

export type ContractorRow = { connection_id: string; contractor_name: string; status: string; connected_at: string; requests_received: number; quotes_sent: number; quotes_awarded: number };
const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base outline-none focus:border-brand-500";

export default function ContractorsView({ rows, error = false }: { rows: ContractorRow[]; error?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setBusy(true); setMsg(null);
    const res = await createConnectCodeAction(label).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; code?: string }));
    setBusy(false);
    if (res.errorCode) { setMsg(t(res.errorCode as keyof Dictionary)); return; }
    setCode(res.code ?? null); setLabel("");
  }

  return <div className="p-4 md:p-6">
    <h1 className="text-xl font-bold">{t("supplyContractors")}</h1>
    <p className="mb-4 text-sm text-slate-500">{t("supplyContractorsHint")}</p>
    {(error || msg) && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error ? t("errGeneric") : msg}</div>}
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">{t("supplyConnectCode")}</h2>
      <p className="mb-3 text-xs text-slate-500">{t("supplyConnectCodeHint")}</p>
      <div className="flex gap-2"><input value={label} maxLength={80} aria-label={t("supplyCodeLabel")} placeholder={t("supplyCodeLabel")} onChange={(e) => setLabel(e.target.value)} className={field} /><button type="button" disabled={busy} onClick={create} className="min-h-11 shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-40">{t("supplyCreateCode")}</button></div>
      {code && (() => {
        const link = `${typeof window !== "undefined" ? window.location.origin : ""}/suppliers?code=${code}`;
        return <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3">
          <p className="text-xs font-medium text-slate-600">{t("supplyShareLink")}</p>
          <p className="mt-1 break-all text-sm font-semibold" data-testid="connect-link">{link}</p>
          <p className="mt-2 text-xs text-slate-500">{t("supplyCodeAlso")} <span className="break-all font-mono font-semibold" data-testid="connect-code">{code}</span></p>
          <p className="mt-1 text-xs text-slate-600">{t("supplyCodeOnce")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMsg(t("errGeneric")); } }} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium"><Copy className="h-4 w-4" />{copied ? t("copied") : t("supplyCopyLink")}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium">WhatsApp</a>
          </div>
        </div>;
      })()}
    </section>
    <ul className="space-y-2">
      {rows.map((r) => <li key={r.connection_id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate font-semibold">{r.contractor_name}</span><Badge variant={r.status === "active" ? "success" : "default"}>{r.status === "active" ? t("supplyActive") : t("linkRevoked")}</Badge></div>
        <p className="mt-1 text-xs text-slate-500">{t("supplyCounters", { requests: String(r.requests_received), quotes: String(r.quotes_sent), awarded: String(r.quotes_awarded) })} · {t("supplyConnectedOn", { date: formatDate(r.connected_at) })}</p>
        {r.status === "active" && <button type="button" disabled={busy} onClick={async () => { if (!window.confirm(t("supplyConfirmRevoke"))) return; setBusy(true); await revokeConnectionAction(r.connection_id); setBusy(false); router.refresh(); }} className="mt-2 min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">{t("revokeLink")}</button>}
      </li>)}
      {rows.length === 0 && !error && <li className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">{t("supplyNoContractors")}</li>}
    </ul>
  </div>;
}
