"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Package, Zap, ClipboardList, FileText, FolderOpen, MapPin, Pencil, Plus, Receipt, ShoppingCart, User } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { categoryLabel } from "@/lib/category-label";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { setProjectAssignmentAction } from "@/app/(dashboard)/employees/actions";
import type { ProjectMoney, TimelineItem, WaitingItem } from "@/lib/services/project-control";
import { ActivityPanel, MoneyPanel, WaitingPanel } from "./ProjectControl";

type Project = {
  id: string; name: string; status: string; description?: string | null; address?: string | null; start_date?: string | null;
  contract_value: number; budget_total: number; budget_materials: number; budget_labor: number; budget_subcontractors: number; budget_other: number;
  spentTotal: number; profit: number; margin: number; overBudget: boolean; costsHidden?: boolean; profitHidden?: boolean;
  client?: { name?: string; contact_name?: string | null; phone?: string | null } | null;
  expenses?: { id: string; amount: number; vendor_name?: string | null; category?: { name?: string } | null }[];
};

type TeamPerson = { userId: string; name: string; role: string; assigned: boolean };

function ProjectTeam({ projectId, people }: { projectId: string; people: TeamPerson[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(person: TeamPerson) {
    setBusy(person.userId);
    setError(null);
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("userId", person.userId);
    form.set("assigned", String(!person.assigned));
    const result = await setProjectAssignmentAction(form).catch(() => ({ errorCode: "errGeneric" }));
    if (result.errorCode) setError(t(result.errorCode as keyof Dictionary));
    setBusy(null);
    router.refresh();
  }

  return <section className="mt-4">
    <h2 className="mb-2 font-semibold">{t("projectTeam")}</h2>
    {error && <div role="alert" className="mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {people.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noTeamCandidates")}</p> : people.map((person) => <div key={person.userId} className="flex items-center gap-3 px-4 py-3 text-sm">
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{person.name}</p><p className="text-xs text-slate-500">{person.role === "manager" ? t("manager") : t("employee")}</p></div>
        <button type="button" disabled={busy === person.userId} onClick={() => toggle(person)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${person.assigned ? "border-slate-200 text-slate-600" : "border-brand-500 bg-brand-50 text-brand-700"}`}>{person.assigned ? t("unassignMember") : t("assignMember")}</button>
      </div>)}
    </div>
  </section>;
}

export default function ProjectDetailClient({ project: p, error, team = [], canManageTeam = false, money = null, waiting = [], timeline = [], billing = null }: { billing?: { invoiced: number; collected: number; owed: number } | null; project?: Project; error?: "errNoSupabase" | "errLoadProject"; team?: TeamPerson[]; canManageTeam?: boolean; money?: ProjectMoney | null; waiting?: WaitingItem[]; timeline?: TimelineItem[] }) {
  const { t, locale } = useI18n();
  const { isManagerOrAbove, permissions } = usePermissions();
  const back = <Link href="/projects" aria-label={t("projects")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>;

  if (!p) {
    return <div className="mx-auto max-w-4xl p-4 md:p-8"><div className="mb-6">{back}</div>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(error)}</div>}</div>;
  }

  const tools = [
    ...(isManagerOrAbove || permissions.can_create_pricing_request ? [{ href: `/projects/${p.id}/takeoff`, label: t("takeoffs"), icon: Zap }] : []),
    ...(permissions.can_request_material || isManagerOrAbove ? [{ href: `/projects/${p.id}/materials`, label: t("materialRequests"), icon: Package }] : []),
    { href: `/expenses?projectId=${p.id}`, label: t("expenses"), icon: Receipt },
    { href: `/pos?projectId=${p.id}`, label: t("toolPOs"), icon: ShoppingCart },
    ...(isManagerOrAbove ? [
      { href: `/quotes?projectId=${p.id}`, label: t("toolQuotes"), icon: FileText },
      { href: `/invoices?projectId=${p.id}`, label: t("toolInvoices"), icon: ClipboardList },
    ] : []),
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
  ];
  const costsHidden = Boolean(p.costsHidden);
  const profitHidden = Boolean(p.profitHidden);

  return <div className="mx-auto max-w-4xl p-4 md:p-8">
    <div className="mb-6 flex items-start gap-3">
      {back}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold">{p.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <ProjectStatusBadge status={p.status} />
          {p.client?.name && <span className="inline-flex min-w-0 items-center gap-1"><User className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.client.name}</span></span>}
          {p.address && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.address}</span></span>}
        </div>
      </div>
      {isManagerOrAbove && <Link href={`/projects/${p.id}/edit`} aria-label={t("editProject")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><Pencil className="h-4 w-4" /></Link>}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">{t("projectInfo")}</h2>
        <dl className="space-y-2 text-sm">
          {!costsHidden && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("contractValue")}</dt><dd className="font-semibold">{formatCurrency(Number(p.contract_value))}</dd></div>}
          {!profitHidden && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("profit")}</dt><dd className={`font-semibold ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(p.profit)} · {p.margin.toFixed(1)}%</dd></div>}
          {billing && billing.invoiced > 0 && <>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("invBilled")}</dt><dd className="font-semibold">{formatCurrency(billing.invoiced)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("projCollected")}</dt><dd className="font-semibold text-green-600">{formatCurrency(billing.collected)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("projOwed")}</dt><dd className="font-semibold text-amber-600">{formatCurrency(billing.owed)}</dd></div>
          </>}
          {p.start_date && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("startDate")}</dt><dd className="font-medium">{formatDate(p.start_date, locale)}</dd></div>}
          {p.client?.contact_name && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("contactPerson")}</dt><dd className="font-medium">{p.client.contact_name}</dd></div>}
          {p.client?.phone && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("phone")}</dt><dd className="font-medium">{p.client.phone}</dd></div>}
        </dl>
        {p.description && <div className="mt-4 border-t border-slate-100 pt-3"><p className="mb-1 text-xs font-semibold uppercase text-slate-400">{t("notes")}</p><p className="whitespace-pre-line text-sm text-slate-700">{p.description}</p></div>}
      </section>

      {money && <MoneyPanel money={money} budgetSplit={[{ label: t("materials"), value: Number(p.budget_materials) }, { label: t("labor"), value: Number(p.budget_labor) }, { label: t("subcontractors"), value: Number(p.budget_subcontractors) }, { label: t("other"), value: Number(p.budget_other) }]} />}
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-2"><WaitingPanel items={waiting} /><ActivityPanel items={timeline} /></div>

    <section className="mt-4">
      <h2 className="mb-2 font-semibold">{t("projectTools")}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tools.map((tool) => <Link key={tool.href} href={tool.href} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium transition hover:border-brand-300"><tool.icon className="h-5 w-5 shrink-0 text-brand-600" /><span className="truncate">{tool.label}</span></Link>)}
      </div>
    </section>

    {canManageTeam && <ProjectTeam projectId={p.id} people={team} />}

    {!costsHidden && <section className="mt-4">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">{t("projectExpenses")}</h2><Link href={`/expenses/new?projectId=${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Plus className="h-3.5 w-3.5" />{t("newExpense")}</Link></div>
      <div className="divide-y divide-slate-50 rounded-xl border border-slate-200 bg-white">
        {(p.expenses || []).length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">{t("noResults")}</div> : p.expenses?.map((e) => <div key={e.id} className="flex justify-between gap-3 px-4 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{e.vendor_name || t("vendor")}</p><p className="truncate text-xs text-slate-500">{categoryLabel(e.category?.name, t) || t("category")}</p></div><p className="font-semibold">{formatCurrency(Number(e.amount))}</p></div>)}
      </div>
    </section>}
  </div>;
}
