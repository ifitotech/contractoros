"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type Metrics = {
  activeProjectsCount: number;
  completedProjectsCount: number;
  employeesWorking: number;
  pendingInvoices: number;
  totalContractValue: number;
  totalSpent: number;
  totalProfit: number;
  margin: number;
  pendingQuotes: number;
  posWithoutDoc: number;
  expensesThisMonth: number;
};

type Activity = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user?: { full_name?: string } | null;
};

export default function DashboardClient({
  metrics,
  companyName,
  isDemo,
  activity = [],
}: {
  metrics?: Metrics;
  activity?: Activity[];
  companyName: string;
  isDemo: boolean;
}) {
  const { t } = useI18n();
  const data = metrics ?? {
    activeProjectsCount: 0,
    completedProjectsCount: 0,
    employeesWorking: 0,
    pendingInvoices: 0,
    totalContractValue: 0,
    totalSpent: 0,
    totalProfit: 0,
    margin: 0,
    pendingQuotes: 0,
    posWithoutDoc: 0,
    expensesThisMonth: 0,
  };
  const attentionCount = data.pendingInvoices + data.pendingQuotes + data.posWithoutDoc;

  return (
    <div className="min-w-0 p-4 pb-8 md:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-600">Business overview</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("dashboard")}</h1>
          <p className="mt-1 text-sm text-slate-500">{companyName || t("demoMode")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand-300">
            <Plus className="h-4 w-4" /> New job
          </Link>
          <Link href="/quotes/new" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700">
            <FileText className="h-4 w-4" /> New quote
          </Link>
        </div>
      </header>

      {isDemo && <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><strong>{t("demoMode")}.</strong> {t("demoModeHint")}</div>}

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10 md:p-7">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-300">Active work value</p>
            <p className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{formatCurrency(data.totalContractValue)}</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">Your current active and approved jobs, before expenses.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat label="Estimated profit" value={formatCurrency(data.totalProfit)} detail={`${Math.round(data.margin)}% margin`} positive />
            <SummaryStat label="Spent to date" value={formatCurrency(data.totalSpent)} detail="Across active jobs" />
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi title={t("activeProjects")} value={String(data.activeProjectsCount)} detail={`${data.completedProjectsCount} completed`} icon={<Briefcase className="h-4 w-4" />} href="/projects" />
        <Kpi title="Invoices to collect" value={String(data.pendingInvoices)} detail="Sent, partial or overdue" icon={<Receipt className="h-4 w-4" />} href="/invoices" alert={data.pendingInvoices > 0} />
        <Kpi title={t("pendingQuotes")} value={String(data.pendingQuotes)} detail="Waiting for a decision" icon={<FileText className="h-4 w-4" />} href="/quotes" />
        <Kpi title={t("monthExpenses")} value={formatCurrency(data.expensesThisMonth)} detail={`${data.employeesWorking} active members`} icon={<DollarSign className="h-4 w-4" />} href="/expenses" />
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="font-bold">Needs attention</h2><p className="mt-0.5 text-xs text-slate-500">Items that may need action today</p></div>
            {attentionCount > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">{attentionCount}</span>}
          </div>
          <div className="space-y-2">
            <AttentionRow href="/invoices" icon={<Receipt className="h-4 w-4" />} title="Invoices to collect" detail={`${data.pendingInvoices} invoice${data.pendingInvoices === 1 ? "" : "s"} need follow-up`} count={data.pendingInvoices} />
            <AttentionRow href="/quotes" icon={<Clock3 className="h-4 w-4" />} title="Quotes awaiting response" detail={`${data.pendingQuotes} customer quote${data.pendingQuotes === 1 ? "" : "s"} still pending`} count={data.pendingQuotes} />
            <AttentionRow href="/pos" icon={<AlertTriangle className="h-4 w-4" />} title="Purchase orders missing documents" detail={`${data.posWithoutDoc} receipt${data.posWithoutDoc === 1 ? "" : "s"} required to close`} count={data.posWithoutDoc} />
            {attentionCount === 0 && <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />Everything is up to date.</div>}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Quick actions</h2><p className="mt-0.5 text-xs text-slate-500">Common tasks for the owner</p></div><ArrowUpRight className="h-4 w-4 text-slate-400" /></div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/supply-requests" icon={<Receipt className="h-4 w-4" />} label="Request supply pricing" />
            <QuickAction href="/invoices/new" icon={<DollarSign className="h-4 w-4" />} label="Create invoice" />
            <QuickAction href="/pos/new" icon={<Briefcase className="h-4 w-4" />} label="New purchase order" />
            <QuickAction href="/employees/invite" icon={<Users className="h-4 w-4" />} label="Invite team member" />
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActivityPanel activity={activity} />
        <EmptyPanel title={t("activeProjects")} href="/projects" label={t("viewAll")} empty={isDemo} />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, detail, positive = false }: { label: string; value: string; detail: string; positive?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="truncate text-xs text-slate-400">{label}</p><p className={`mt-1 truncate text-lg font-bold ${positive ? "text-emerald-400" : "text-white"}`}>{value}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{detail}</p></div>;
}

function Kpi({ title, value, detail, icon, href, alert = false }: { title: string; value: string; detail: string; icon: React.ReactNode; href: string; alert?: boolean }) {
  return <Link href={href} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><div className="mb-3 flex items-center justify-between gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${alert ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-600"}`}>{icon}</span><ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" /></div><p className="truncate text-xs font-medium text-slate-500">{title}</p><p className={`mt-1 truncate text-2xl font-bold tracking-tight ${alert ? "text-amber-700" : "text-slate-900"}`}>{value}</p><p className="mt-1 truncate text-[11px] text-slate-400">{detail}</p></Link>;
}

function AttentionRow({ href, icon, title, detail, count }: { href: string; icon: React.ReactNode; title: string; detail: string; count: number }) {
  return <Link href={href} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">{icon}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="block truncate text-xs text-slate-500">{detail}</span></span><span className="flex items-center gap-1 text-sm font-bold text-slate-700">{count}<ChevronRight className="h-4 w-4 text-slate-400" /></span></Link>;
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex min-h-20 flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"><span className="text-brand-600">{icon}</span><span>{label}</span></Link>;
}

function ActivityPanel({ activity }: { activity: Activity[] }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">Recent activity</h2><p className="mt-0.5 text-xs text-slate-500">Latest changes in your company</p></div><Link href="/reports" className="text-xs font-semibold text-brand-600">View reports</Link></div>{activity.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-400">No activity yet</div> : <div className="divide-y divide-slate-100">{activity.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-3 px-5 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100"><Clock3 className="h-4 w-4 text-slate-500" /></span><p className="min-w-0 flex-1 truncate text-sm"><strong>{item.user?.full_name || "Team member"}</strong> · {item.action} · {item.entity_type}</p><time className="shrink-0 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</time></div>)}</div>}</section>;
}

function EmptyPanel({ title, href, label, empty }: { title: string; href: string; label: string; empty: boolean }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="truncate font-bold">{title}</h2><Link href={href} className="shrink-0 text-xs font-semibold text-brand-600">{label}</Link></div><div className="px-5 py-10 text-center text-sm text-slate-400">{empty ? "No data yet" : "No recent records"}</div></section>;
}
