"use client";

import Link from "next/link";
import { AlertTriangle, Search, Briefcase, ChevronRight, Clock3, FileText, MapPin, Package, Plus, Receipt } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/shared/Logo";
import { usePermissions } from "@/lib/permissions-context";
import { WaitingOn } from "@/components/shared/RequestStatusBadge";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { AttentionItem } from "@/lib/services/project-control";
import type { OnboardingStep } from "@/lib/services/dashboard";
import { OnboardingChecklist } from "@/components/shared/OnboardingChecklist";
import { POStatusBadge } from "@/components/shared/StatusBadge";
import type { OverdueReceipts, TeamPO } from "@/lib/services/team-purchases";

type HomeProject = { id: string; name: string; status: string; address?: string | null; clientName?: string | null };

export default function DashboardClient({
  firstName,
  companyName,
  projects,
  totalProjects = projects.length,
  attention,
  items = [],
  onboarding = [],
  team,
  error,
}: {
  firstName: string;
  companyName: string;
  projects: HomeProject[];
  totalProjects?: number;
  attention: { invoices: number; quotes: number };
  items?: AttentionItem[];
  onboarding?: OnboardingStep[];
  team?: { recent: TeamPO[]; overdue: OverdueReceipts[] };
  error?: "errNoSupabase" | "errLoadProjects";
}) {
  const { t } = useI18n();
  const { isManagerOrAbove, permissions } = usePermissions();
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 19 ? "greetingAfternoon" : "greetingEvening";
  const attentionItems = [
    { href: "/invoices", icon: <Receipt className="h-4 w-4" />, title: t("attentionInvoices"), count: attention.invoices },
    { href: "/quotes", icon: <Clock3 className="h-4 w-4" />, title: t("attentionQuotes"), count: attention.quotes },
  ].filter((item) => item.count > 0);

  return (
    <div className="mx-auto min-w-0 max-w-5xl p-4 pb-8 md:p-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2"><Logo variant="mark" className="h-8 w-8 md:hidden" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{APP_NAME}</p></div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{firstName ? t(greetingKey, { name: firstName }) : t("navHome")}</h1>
        {companyName && <p className="mt-1 text-sm text-slate-500">{companyName}</p>}
      </header>


      <form action="/search" role="search" className="relative mb-5"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="q" autoComplete="off" aria-label={t("searchEverything")} placeholder={t("searchEverything")} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-base outline-none focus:border-brand-500" /></form>
      {error && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(error)}</div>}

      {!error && (() => {
        const quick = [
          ...(isManagerOrAbove ? [{ href: "/projects/new", label: t("newProject"), icon: Briefcase }] : []),
          ...(permissions.can_request_material ? [{ href: "/material", label: t("navMaterial"), icon: Package }] : []),
          ...(isManagerOrAbove ? [{ href: "/quotes/new", label: t("createProposal"), icon: FileText }] : []),
          ...(isManagerOrAbove || permissions.can_upload_documents ? [{ href: "/expenses/new", label: t("newExpense"), icon: Receipt }] : []),
        ];
        return quick.length > 0 ? <section className="mb-6" aria-label={t("whatToDo")}><h2 className="mb-2 text-sm font-bold">{t("whatToDo")}</h2><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{quick.map((q) => <Link key={q.href} href={q.href} className="flex min-h-20 flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-300"><q.icon className="h-5 w-5 text-brand-600" /><span className="text-sm font-semibold">{q.label}</span></Link>)}</div></section> : null;
      })()}

      {onboarding.length > 0 && <OnboardingChecklist steps={onboarding} />}

      {team && (team.overdue.length > 0 || team.recent.length > 0) && (
        <section className="mb-6" aria-label={t("teamPurchases")}>
          <h2 className="mb-2 text-sm font-bold">{t("teamPurchases")}</h2>
          {team.overdue.length > 0 && <ul className="mb-2 space-y-2">{team.overdue.map((o) => <li key={o.who} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><Receipt className="h-4 w-4 shrink-0" />{t("teamReceiptsOverdue", { name: o.who, count: String(o.count), days: String(o.days) })}</li>)}</ul>}
          {team.recent.length > 0 && <ul className="space-y-2">{team.recent.map((p) => <li key={p.id}><Link href={`/pos/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{t("teamBought", { name: p.who ?? "—", vendor: p.vendor })}</span><span className="block truncate text-xs text-slate-500">{[p.number, p.project, p.amount != null ? formatCurrency(p.amount) : null].filter(Boolean).join(" · ")}</span></span><POStatusBadge status={p.status} /></Link></li>)}</ul>}
        </section>
      )}

      {(attentionItems.length > 0 || items.length > 0) && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold">{t("needsAttention")}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <Link key={item.id} href={item.href} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 transition ${item.severity === "high" ? "border-amber-200 bg-amber-50/70 hover:border-amber-300" : "border-slate-200 bg-white hover:border-brand-300"}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.severity === "high" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}><AlertTriangle className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t(item.titleKey as keyof Dictionary, item.params)}</span><span className="block text-xs text-slate-400">{t("waitingOn")}: <WaitingOn value={item.waitingOn} /></span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
            {attentionItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 transition hover:border-amber-300">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-slate-700">{item.count}<ChevronRight className="h-4 w-4 text-slate-400" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {attentionItems.length === 0 && items.length === 0 && !error && projects.length > 0 && <p className="mb-6 text-sm text-slate-400">{t("attnNone")}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("projects")}</h2>
          <div className="flex items-center gap-3">
            {totalProjects > projects.length && <Link href="/projects" className="text-xs font-semibold text-brand-600">{t("viewAll")} ({totalProjects})</Link>}
            {isManagerOrAbove && <Link href="/projects/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Plus className="h-4 w-4" />{t("newProject")}</Link>}
          </div>
        </div>

        {projects.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <p className="font-semibold">{isManagerOrAbove ? t("noProjectsYet") : t("noProjectsAssigned")}</p>
            <p className="mt-1 text-sm text-slate-500">{isManagerOrAbove ? t("noProjectsHint") : t("noProjectsAssignedHint")}</p>
            {isManagerOrAbove && <Link href="/projects/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"><Plus className="h-4 w-4" />{t("newProject")}</Link>}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.clientName || "—"}</p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>
                {p.address && <p className="mt-2 flex items-center gap-1 truncate text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.address}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
