"use client";

import Link from "next/link";
import { ChevronDown, Plus, Ruler, ShoppingCart, Wrench, FileText, Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { QuoteStatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { FilterChips } from "@/components/ui/FilterChips";
import { useState } from "react";

type Quote = { id: string; number: string; status: string; total: number; client?: { name?: string } | null; notes?: string | null };

const demoQuotes: Quote[] = [
  { id: "demo-1", number: "Q-0007", status: "draft", total: 1850, client: { name: "Casa Rivera" }, notes: "Bathroom remodel" },
  { id: "demo-2", number: "Q-0006", status: "sent", total: 4250, client: { name: "Office Torres" }, notes: "Electrical upgrade" },
  { id: "demo-3", number: "Q-0005", status: "approved", total: 7800, client: { name: "Garcia Residence" }, notes: "Panel and lighting" },
  { id: "demo-4", number: "Q-0004", status: "rejected", total: 2100, client: { name: "Miller Kitchen" }, notes: "Cabinet lighting" },
  { id: "demo-5", number: "Q-0003", status: "expired", total: 3300, client: { name: "Northside Store" }, notes: "Store repairs" },
];

export default function QuotesClient({ quotes, demo = false }: { quotes?: Quote[]; demo?: boolean }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const data = demo ? demoQuotes : (quotes ?? []);
  const filtered = filter === "all" ? data : data.filter((q) => q.status === filter);
  return <div className="p-4 md:p-8">
    <PageHeader title={t("quotes")} action={<div className="relative"><button type="button" onClick={() => setCreateOpen((open) => !open)} className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus className="w-4 h-4" />{t("create")}<ChevronDown className="w-4 h-4" /></button>{createOpen && <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("create")}</p><Link onClick={() => setCreateOpen(false)} href="/quotes/estimator" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-brand-50"><Ruler className="h-4 w-4 text-brand-600" /><span><strong className="block">{t("createPlanEstimator")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/supply-requests" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-amber-50"><ShoppingCart className="h-4 w-4 text-amber-600" /><span><strong className="block">{t("createSupplyRequest")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=service" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Wrench className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createServiceQuote")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=complete" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createCompleteQuote")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=materials" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Layers className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createMaterialQuote")}</strong></span></Link></div>}</div>} />
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800"><strong>{t("demoMode")}</strong>: esta vista muestra cómo se verá el flujo Draft → Sent → Approved. Tus quotes reales aparecerán al conectar Supabase.</div>}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
      {["draft", "sent", "approved", "rejected", "expired"].map((status) => <button key={status} onClick={() => setFilter(status)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-300"><span className="block text-xs text-slate-500 capitalize">{status}</span><span className="text-lg font-bold">{data.filter((q) => q.status === status).length}</span></button>)}
    </div>
    <FilterChips value={filter} onChange={setFilter} options={[{ value: "all", label: t("all") }, { value: "draft", label: t("statusDraft") }, { value: "sent", label: t("statusSent") }, { value: "pending", label: t("statusPending") }, { value: "approved", label: t("statusApproved") }, { value: "rejected", label: t("statusRejected") }]} />
    <div className="mt-4 space-y-2">{filtered.map((q) => <Link key={q.id} href={q.id.startsWith("demo-") ? "/quotes" : `/quotes/${q.id}`} className="block bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:border-brand-300 transition"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{q.client?.name || t("newQuote")}</p><p className="text-xs text-slate-500">{q.number} · {q.notes}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-bold">{formatCurrency(Number(q.total))}</p><QuoteStatusBadge status={q.status} /></div></div></Link>)}{filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">{t("noResults")}</p>}</div>
  </div>;
}
