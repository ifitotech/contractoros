"use client";

import Link from "next/link";
import { ChevronDown, Plus, Ruler, ShoppingCart, Wrench, FileText, Layers, ClipboardList, ArrowUpRight } from "lucide-react";
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
    <PageHeader title="Supply & Purchase" action={<div className="relative"><button type="button" onClick={() => setCreateOpen((open) => !open)} className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus className="w-4 h-4" />{t("create")}<ChevronDown className="w-4 h-4" /></button>{createOpen && <div className="absolute left-0 z-50 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("create")}</p><Link onClick={() => setCreateOpen(false)} href="/quotes/estimator" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-brand-50"><Ruler className="h-4 w-4 text-brand-600" /><span><strong className="block">{t("createPlanEstimator")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/supply-requests" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-amber-50"><ShoppingCart className="h-4 w-4 text-amber-600" /><span><strong className="block">{t("createSupplyRequest")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=service" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Wrench className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createServiceQuote")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=complete" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createCompleteQuote")}</strong></span></Link><Link onClick={() => setCreateOpen(false)} href="/quotes/new?type=materials" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Layers className="h-4 w-4 text-slate-500" /><span><strong className="block">{t("createMaterialQuote")}</strong></span></Link></div>}</div>} />
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800"><strong>{t("demoMode")}</strong>: esta vista muestra cómo se verá el flujo Draft → Sent → Approved. Tus quotes reales aparecerán al conectar Supabase.</div>}
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="surface-card border-amber-200 bg-amber-50/40 p-4 md:p-5"><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Supply & purchasing</p><h2 className="mt-1 text-lg font-bold">Supply → Purchase</h2><p className="mt-1 text-xs text-slate-600">Keep material buying separate from customer quotes: request pricing first, then create the purchase order.</p></div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-amber-800"><span className="rounded-full bg-amber-200 px-2 py-1">1 Request</span><span className="h-px flex-1 bg-amber-200" /><span className="rounded-full bg-amber-200 px-2 py-1">2 Review</span><span className="h-px flex-1 bg-amber-200" /><span className="rounded-full bg-amber-200 px-2 py-1">3 Buy</span></div><div className="grid grid-cols-2 gap-2"><ModeLink href="/supply-requests" label={t("createSupplyRequest")} icon={<ShoppingCart className="h-4 w-4" />} tone="amber" /><ModeLink href="/quotes/estimator" label="Plan estimator" icon={<Ruler className="h-4 w-4" />} tone="amber" /><ModeLink href="/pos/new" label="New purchase order" icon={<ClipboardList className="h-4 w-4" />} tone="amber" /><ModeLink href="/pos" label="View purchase orders" icon={<ArrowUpRight className="h-4 w-4" />} tone="amber" /></div></div>
    </div>
    <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Supply & purchasing</p><h2 className="mt-1 text-lg font-bold">Supply purchase pipeline</h2></div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
      {["draft", "sent", "approved", "rejected", "expired"].map((status) => <button key={status} onClick={() => setFilter(status)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-300"><span className="block text-xs text-slate-500 capitalize">{status}</span><span className="text-lg font-bold">{data.filter((q) => q.status === status).length}</span></button>)}
    </div>
    <FilterChips value={filter} onChange={setFilter} options={[{ value: "all", label: t("all") }, { value: "draft", label: t("statusDraft") }, { value: "sent", label: t("statusSent") }, { value: "pending", label: t("statusPending") }, { value: "approved", label: t("statusApproved") }, { value: "rejected", label: t("statusRejected") }]} />
    <div className="mt-4 space-y-2">{filtered.map((q) => <Link key={q.id} href={q.id.startsWith("demo-") ? "/quotes" : `/quotes/${q.id}`} className="block bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:border-brand-300 transition"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{q.client?.name || t("newQuote")}</p><p className="text-xs text-slate-500">{q.number} · {q.notes}</p></div><div className="text-right flex-shrink-0"><p className="text-sm font-bold">{formatCurrency(Number(q.total))}</p><QuoteStatusBadge status={q.status} /></div></div></Link>)}{filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">{t("noResults")}</p>}</div>
  </div>;
}

function ModeLink({ href, label, icon, tone = "brand" }: { href: string; label: string; icon: React.ReactNode; tone?: "brand" | "amber" }) {
  return <Link href={href} className={`flex min-h-16 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold transition ${tone === "amber" ? "border-amber-200 text-amber-900 hover:border-amber-400" : "border-slate-200 text-slate-700 hover:border-brand-300"}`}><span className={tone === "amber" ? "text-amber-600" : "text-brand-600"}>{icon}</span><span className="min-w-0 flex-1">{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300" /></Link>;
}
