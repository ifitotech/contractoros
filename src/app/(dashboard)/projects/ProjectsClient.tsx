"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { SearchInput } from "@/components/ui/SearchInput";
import { useState } from "react";

type Project = { id: string; name: string; status: string; contract_value: number; budget_total: number; spentTotal: number; client?: { name?: string } | null };

export default function ProjectsClient({ projects, demo = false }: { projects?: Project[]; demo?: boolean }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const data = projects ?? [];
  const filtered = data.filter((p) => `${p.name} ${p.client?.name || ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "all" || p.status === status));
  return <div className="p-4 md:p-8">
    <PageHeader title={t("projects")} action={<Link href="/projects/new" className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus className="w-4 h-4" />{t("newProject")}</Link>} />
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para ver proyectos reales.</div>}
    <div className="flex gap-2 mb-4"><SearchInput value={search} onChange={setSearch} placeholder={t("search")} className="flex-1" /><select aria-label={t("all")} value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">{t("all")}</option><option value="lead">Lead</option><option value="quoted">Quoted</option><option value="approved">Approved</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
    <div className="space-y-3">{filtered.map((p) => { const overBudget = p.spentTotal > Number(p.budget_total); const progress = Number(p.budget_total) > 0 ? Math.min(100, (p.spentTotal / Number(p.budget_total)) * 100) : 0; return <Link key={p.id} href={`/projects/${p.id}`} className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition"><div className="flex items-start justify-between gap-3 mb-2"><div className="min-w-0"><p className="font-semibold text-sm truncate">{p.name}</p><p className="text-xs text-slate-500">{p.client?.name || "—"}</p></div><ProjectStatusBadge status={p.status} /></div><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-400">{t("contractValue")}</p><p className="font-semibold">{formatCurrency(Number(p.contract_value))}</p></div><div><p className="text-slate-400">{t("budget")}</p><p className="font-semibold">{formatCurrency(Number(p.budget_total))}</p></div><div><p className="text-slate-400">{t("spent")}</p><p className={`font-semibold ${overBudget ? "text-red-600" : ""}`}>{formatCurrency(p.spentTotal)}</p></div></div><div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${progress}%` }} /></div></Link> })}{filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">{t("noResults")}</p>}</div>
  </div>;
}
