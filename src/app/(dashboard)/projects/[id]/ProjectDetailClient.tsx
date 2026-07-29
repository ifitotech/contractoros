"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type Project = { id: string; name: string; status: string; contract_value: number; budget_total: number; budget_materials: number; budget_labor: number; budget_other: number; spentTotal: number; profit: number; margin: number; overBudget: boolean; client?: { name?: string } | null; expenses?: { id: string; amount: number; vendor_name?: string | null; category?: { name?: string } | null }[] };

export default function ProjectDetailClient({ project, demo = false }: { project?: Project; demo?: boolean }) {
  const { t } = useI18n();
  const p = project ?? { id: "demo", name: "Project details", status: "lead", contract_value: 0, budget_total: 0, budget_materials: 0, budget_labor: 0, budget_other: 0, spentTotal: 0, profit: 0, margin: 0, overBudget: false, client: null, expenses: [] };
  const progress = p.budget_total > 0 ? Math.min(100, (p.spentTotal / p.budget_total) * 100) : 0;
  return <div className="p-4 md:p-8 max-w-2xl mx-auto">
    <div className="flex items-center gap-3 mb-6"><Link href="/projects" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link><div className="flex-1 min-w-0"><h1 className="text-lg font-bold truncate">{p.name}</h1><p className="text-sm text-slate-500">{p.client?.name || "—"}</p></div><ProjectStatusBadge status={p.status} /></div>
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para ver datos reales.</div>}
    <div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{t("contractValue")}</p><p className="text-xl font-bold">{formatCurrency(Number(p.contract_value))}</p></div><div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{t("profit")}</p><p className={`text-xl font-bold ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(p.profit)}</p><p className="text-[11px] text-slate-400">{t("margin")} {p.margin.toFixed(1)}%</p></div></div>
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4"><h2 className="font-semibold mb-3">{t("budgetVsExpenses")}</h2><div className="flex justify-between text-sm"><span className="text-slate-500">{t("budget")}</span><span className="font-medium">{formatCurrency(Number(p.budget_total))}</span></div><div className="flex justify-between text-sm mt-2"><span className="text-slate-500">{t("spent")}</span><span className={`font-medium ${p.overBudget ? "text-red-600" : ""}`}>{formatCurrency(p.spentTotal)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3"><div className={`h-full rounded-full ${p.overBudget ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${progress}%` }} /></div><div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div><p className="text-slate-400">{t("materials")}</p><p className="font-medium">{formatCurrency(Number(p.budget_materials))}</p></div><div><p className="text-slate-400">{t("labor")}</p><p className="font-medium">{formatCurrency(Number(p.budget_labor))}</p></div><div><p className="text-slate-400">{t("other")}</p><p className="font-medium">{formatCurrency(Number(p.budget_other))}</p></div></div></div>
    <div className="flex gap-2 mb-4"><Link href="/expenses/new"><Button size="sm"><Plus className="w-4 h-4" />{t("newExpense")}</Button></Link><Link href="/pos/new"><Button size="sm" variant="outline"><Plus className="w-4 h-4" />{t("newPO")}</Button></Link></div>
    <h2 className="font-semibold mb-2">{t("projectExpenses")}</h2><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{(p.expenses || []).length === 0 ? <div className="px-4 py-8 text-sm text-slate-400 text-center">{t("noResults")}</div> : p.expenses?.map((e) => <div key={e.id} className="flex justify-between px-4 py-3 text-sm"><div><p className="font-medium">{e.vendor_name || t("vendor")}</p><p className="text-xs text-slate-500">{e.category?.name || t("category")}</p></div><p className="font-semibold">{formatCurrency(Number(e.amount))}</p></div>)}</div>
  </div>;
}
