"use client";

import Link from "next/link";
import { Camera, MapPin, Package, Search } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { POStatusBadge } from "@/components/shared/StatusBadge";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";
import { APP_NAME } from "@/lib/constants";
import type { MyPO, MyRequest } from "@/lib/services/employee-home";

type Project = { id: string; name: string; address?: string | null };

// The field employee's own home: ask for material, buy, hand in receipts, follow their own orders. No money, reports or clients.
export default function EmployeeHome({ firstName, companyName, projects, myPOs, myRequests, pendingReceipts }: { firstName: string; companyName: string; projects: Project[]; myPOs: MyPO[]; myRequests: MyRequest[]; pendingReceipts: MyPO[] }) {
  const { t } = useI18n();
  const { permissions } = usePermissions();
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 19 ? "greetingAfternoon" : "greetingEvening";
  const big = "flex min-h-24 flex-col items-start justify-between rounded-2xl p-4 text-left font-semibold shadow-sm transition active:scale-[.98]";

  return <div className="mx-auto min-w-0 max-w-3xl p-4 pb-8 md:p-8">
    <header className="mb-5">
      <div className="mb-2 flex items-center gap-2"><Logo variant="mark" className="h-8 w-8 md:hidden" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{APP_NAME}</p></div>
      <h1 className="text-2xl font-bold tracking-tight">{firstName ? t(greetingKey, { name: firstName }) : t("navHome")}</h1>
      {companyName && <p className="mt-1 text-sm text-slate-500">{companyName}</p>}
    </header>

    <form action="/search" role="search" className="relative mb-5"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="q" autoComplete="off" aria-label={t("searchEverything")} placeholder={t("searchEverything")} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-base outline-none focus:border-brand-500" /></form>

    {pendingReceipts.length > 0 && <section aria-label={t("empReceiptsDue")} className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-red-800"><Camera className="h-5 w-5" />{t("empReceiptsDue")} ({pendingReceipts.length})</p>
      <p className="mt-1 text-sm text-red-700">{pendingReceipts.length >= 2 ? t("empReceiptsBlocked") : t("empReceiptsHint")}</p>
      <ul className="mt-3 space-y-2">{pendingReceipts.map((p) => <li key={p.id}><Link href={`/pos/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"><span className="min-w-0 truncate font-medium">{p.number} · {p.vendor_name}</span><span className="shrink-0 font-semibold text-red-700">{t("takeReceiptPhoto")}</span></Link></li>)}</ul>
    </section>}

    {(permissions.can_request_material || permissions.can_create_po) && <section aria-label={t("whatToDo")} className="mb-6">
      <Link href="/material" className={`${big} w-full bg-brand-600 text-white`}><Package className="h-6 w-6" /><span>{permissions.can_create_po ? t("empAskOrBuy") : t("empAskMaterial")}</span>{permissions.can_create_po && permissions.po_limit != null && <span className="text-xs font-normal text-white/80">{t("empBuyLimit", { amount: String(permissions.po_limit) })}</span>}</Link>
    </section>}

    <section className="mb-6">
      <h2 className="mb-2 font-semibold">{t("empMyOrders")}</h2>
      {myPOs.length === 0 && myRequests.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{t("empNoOrders")}</p> :
        <ul className="space-y-2">
          {myPOs.map((p) => <li key={`po-${p.id}`}><Link href={`/pos/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.number} · {p.vendor_name}</span>{p.project && <span className="block truncate text-xs text-slate-500">{p.project}</span>}</span><POStatusBadge status={p.status} /></Link></li>)}
          {myRequests.map((r) => <li key={`mr-${r.id}`}><Link href={`/projects/${r.project_id}/materials/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{r.number}</span>{r.project && <span className="block truncate text-xs text-slate-500">{r.project}</span>}</span><RequestStatusBadge status={r.status} /></Link></li>)}
        </ul>}
    </section>

    <section>
      <h2 className="mb-2 font-semibold">{t("navProjects")}</h2>
      {projects.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{t("noProjectsAssigned")}</p> :
        <ul className="space-y-2">{projects.map((p) => <li key={p.id}><Link href={`/projects/${p.id}`} className="block rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="truncate text-sm font-semibold">{p.name}</p>{p.address && <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.address}</p>}</Link></li>)}</ul>}
    </section>
  </div>;
}
