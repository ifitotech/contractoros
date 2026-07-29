"use client";

import Link from "next/link";
import { AlertTriangle, TrendingUp, DollarSign, Briefcase, FileText } from "lucide-react";
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

export default function DashboardClient({
  metrics,
  companyName,
  isDemo,
  activity = [],
}: {
  metrics?: Metrics;
  activity?: { id: string; action: string; entity_type: string; created_at: string; user?: { full_name?: string } | null }[];
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

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-sm text-slate-500">{companyName || t("demoMode")}</p>
      </div>

      {isDemo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800"><strong>{t("demoMode")}.</strong> {t("demoModeHint")}</div>}

      {data.posWithoutDoc > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
        <div className="flex-1"><p className="font-semibold text-amber-900 text-sm">{data.posWithoutDoc} {t("posWithoutDoc")}</p><p className="text-amber-700 text-xs mt-0.5">{t("posWithoutDocHint")}</p></div>
        <Link href="/pos" className="text-amber-800 text-xs font-semibold underline whitespace-nowrap">{t("viewPOs")}</Link>
      </div>}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
        <Kpi title={t("activeProjects")} value={String(data.activeProjectsCount)} subtitle={formatCurrency(data.totalContractValue)} icon={<Briefcase className="w-4 h-4" />} />
        <Kpi title={t("estimatedProfit")} value={formatCurrency(data.totalProfit)} subtitle={`${t("margin")} ${Math.round(data.margin)}%`} icon={<TrendingUp className="w-4 h-4" />} valueClass="text-green-600" />
        <Kpi title={t("monthExpenses")} value={formatCurrency(data.expensesThisMonth)} subtitle="" icon={<DollarSign className="w-4 h-4" />} />
        <Kpi title={t("pendingQuotes")} value={String(data.pendingQuotes)} subtitle="" icon={<FileText className="w-4 h-4" />} />
        <Kpi title="Completed jobs" value={String(data.completedProjectsCount)} subtitle="" icon={<Briefcase className="w-4 h-4" />} valueClass="text-green-600" />
        <Kpi title="Employees working" value={String(data.employeesWorking)} subtitle="" icon={<Briefcase className="w-4 h-4" />} />
        <Kpi title="Pending invoices" value={String(data.pendingInvoices)} subtitle="" icon={<FileText className="w-4 h-4" />} valueClass={data.pendingInvoices > 0 ? "text-amber-600" : undefined} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <EmptyPanel title={t("recentQuotes")} href="/quotes" label={t("viewAll")} empty={isDemo} />
        <EmptyPanel title={t("activeProjects")} href="/projects" label={t("viewAll")} empty={isDemo} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 mt-4">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold">{t("recentActivity")}</h2></div>
        {activity.length === 0 ? <div className="px-5 py-8 text-sm text-slate-400 text-center">Sin movimientos todavía</div> : <div className="divide-y divide-slate-100">{activity.map((item) => <div key={item.id} className="px-5 py-3 text-sm flex justify-between gap-3"><span>{item.user?.full_name || "Usuario"} · {item.action} · {item.entity_type}</span><span className="text-xs text-slate-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</span></div>)}</div>}
      </div>
    </div>
  );
}

function EmptyPanel({ title, href, label, empty }: { title: string; href: string; label: string; empty: boolean }) {
  return <div className="bg-white rounded-xl border border-slate-200"><div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center"><h2 className="font-semibold">{title}</h2><Link href={href} className="text-brand-600 text-sm font-medium">{label}</Link></div><div className="px-5 py-8 text-sm text-slate-400 text-center">{empty ? "Sin datos todavía" : "Sin registros recientes"}</div></div>;
}

function Kpi({ title, value, subtitle, icon, valueClass }: { title: string; value: string; subtitle: string; icon: React.ReactNode; valueClass?: string }) {
  return <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5"><div className="flex items-center gap-2 text-slate-500 mb-1">{icon}<p className="text-xs">{title}</p></div><p className={`text-xl md:text-2xl font-bold ${valueClass || ""}`}>{value}</p>{subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}</div>;
}
