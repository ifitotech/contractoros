"use client";

import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type Expense = { id: string; vendor_name?: string | null; amount: number; date: string; notes?: string | null; category?: { name?: string } | null; project?: { name?: string } | null };
export default function ExpensesClient({ expenses = [], demo = false }: { expenses?: Expense[]; demo?: boolean }) {
  const { t } = useI18n(); const [search, setSearch] = useState(""); const data = expenses; const filtered = data.filter((e) => `${e.vendor_name || ""} ${e.notes || ""} ${e.category?.name || ""} ${e.project?.name || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="p-4 md:p-8"><PageHeader title={t("expenses")} action={<Link href="/expenses/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="w-4 h-4" />{t("newExpense")}</Link>} />{demo && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para ver gastos reales.</div>}<SearchInput value={search} onChange={setSearch} placeholder={t("search")} className="mb-4" /><div className="space-y-2">{filtered.map((e) => <Link key={e.id} href={`/expenses/${e.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 hover:border-brand-300"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Receipt className="h-5 w-5 text-amber-600" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.vendor_name || t("vendor")}</p><p className="truncate text-xs text-slate-500">{e.project?.name || t("projects")} · {e.category?.name || t("category")} · {e.date}</p></div><p className="text-sm font-bold">{formatCurrency(Number(e.amount))}</p></Link>)}{filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">{t("noResults")}</p>}</div></div>;
}
