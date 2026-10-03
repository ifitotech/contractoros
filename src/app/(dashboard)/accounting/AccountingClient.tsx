"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LocalDateTime } from "@/components/shared/LocalDateTime";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type Project = { id: string; name: string; number?: string | null };
type LogRow = { id: string; dataset: string; format: string; date_from?: string | null; date_to?: string | null; row_count: number; created_at: string; exporter?: { full_name?: string | null } | { full_name?: string | null }[] | null };

const DATASETS: { value: string; label: keyof Dictionary }[] = [
  { value: "customers", label: "acctCustomers" }, { value: "vendors", label: "acctVendors" }, { value: "projects", label: "acctProjects" },
  { value: "expenses", label: "acctExpenses" }, { value: "purchase_orders", label: "acctPOs" }, { value: "invoices", label: "acctInvoices" },
  { value: "project_costs", label: "acctProjectCosts" }, { value: "all", label: "acctAll" },
];
const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base md:text-sm";

export default function AccountingClient({ projects, log, error = false }: { projects: Project[]; log: LogRow[]; error?: boolean }) {
  const { t } = useI18n();
  const [dataset, setDataset] = useState("expenses");
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [project, setProject] = useState("");
  const isAll = dataset === "all";
  const fmt = isAll ? "json" : format;
  const datesInvalid = !!from && !!to && from > to;
  const qs = new URLSearchParams({ dataset, format: fmt });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (project) qs.set("project", project);
  const labelOf = (d: string) => { const m = DATASETS.find((x) => x.value === d); return m ? t(m.label) : d; };

  return <div className="p-4 md:p-8 max-w-3xl">
    <PageHeader title={t("accounting")} />
    <p className="mb-4 text-sm text-slate-600">{t("acctIntro")}</p>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("errGeneric")}</div>}
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-medium">{t("acctDataset")}
        <select className={`${field} mt-1`} value={dataset} onChange={(e) => setDataset(e.target.value)}>{DATASETS.map((d) => <option key={d.value} value={d.value}>{t(d.label)}</option>)}</select>
      </label>
      <label className="block text-sm font-medium">{t("acctFormat")}
        <select className={`${field} mt-1`} value={fmt} disabled={isAll} onChange={(e) => setFormat(e.target.value)}><option value="csv">CSV</option><option value="json">JSON</option></select>
      </label>
      {isAll && <p className="text-xs text-slate-500">{t("acctAllJson")}</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">{t("acctFrom")}<input type="date" className={`${field} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="block text-sm font-medium">{t("acctTo")}<input type="date" className={`${field} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {datesInvalid && <p role="alert" className="text-xs text-red-600">{t("acctDatesInvalid")}</p>}
      <label className="block text-sm font-medium">{t("acctProject")}
        <select className={`${field} mt-1`} value={project} onChange={(e) => setProject(e.target.value)}><option value="">{t("all")}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.number ? `${p.number} · ` : ""}{p.name}</option>)}</select>
      </label>
      <p className="text-xs text-slate-500">{t("acctNotes")}</p>
      <a href={datesInvalid ? undefined : `/api/accounting/export?${qs}`} aria-disabled={datesInvalid} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white ${datesInvalid ? "pointer-events-none opacity-50" : ""}`}><Download className="h-4 w-4" />{t("acctDownload")}</a>
    </div>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{t("acctQbNote")}</div>
    <h2 className="mb-2 mt-6 text-sm font-semibold">{t("acctHistory")}</h2>
    {log.length === 0 ? <p className="text-sm text-slate-500">{t("acctNoHistory")}</p> :
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{log.map((l) => {
        const ex = Array.isArray(l.exporter) ? l.exporter[0] : l.exporter;
        return <li key={l.id} className="px-4 py-3 text-sm"><div className="font-medium">{labelOf(l.dataset)} · {l.format.toUpperCase()} · {l.row_count} {t("acctRows")}</div><div className="text-xs text-slate-500"><LocalDateTime value={l.created_at} />{ex?.full_name ? ` · ${ex.full_name}` : ""}{l.date_from || l.date_to ? ` · ${l.date_from ?? "…"} → ${l.date_to ?? "…"}` : ""}</div></li>;
      })}</ul>}
  </div>;
}
