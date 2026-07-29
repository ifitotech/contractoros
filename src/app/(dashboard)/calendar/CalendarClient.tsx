"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";

type Project = { id: string; name: string; status: string; start_date?: string | null; end_date?: string | null; client?: { name?: string } | null };
export default function CalendarClient({ projects = [], demo = false }: { projects?: Project[]; demo?: boolean }) {
  const { t } = useI18n();
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(new Date());
  const month = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const scheduled = projects.filter((p) => p.start_date);
  return <div className="p-4 md:p-8"><div className="flex flex-wrap items-center gap-3 mb-6"><div className="flex-1"><h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-brand-600" />{t("calendar")}</h1><p className="text-sm text-slate-500">{month}</p></div><Link href="/projects/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="w-4 h-4" />{t("newProject")}</Link></div>
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">{t("demoMode")}: la agenda mostrará jobs reales cuando tengan fecha de inicio.</div>}
    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-1"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCursor(new Date())} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">Today</button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button></div><div className="flex rounded-lg border border-slate-200 bg-white p-1"><button onClick={() => setView("day")} className={`px-3 py-1.5 text-xs rounded-md ${view === "day" ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-500"}`}>Day</button><button onClick={() => setView("week")} className={`px-3 py-1.5 text-xs rounded-md ${view === "week" ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-500"}`}>Week</button><button onClick={() => setView("month")} className={`px-3 py-1.5 text-xs rounded-md ${view === "month" ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-500"}`}>Month</button></div></div>
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="bg-slate-50 px-2 py-3 text-center text-xs font-semibold text-slate-500">{day}</div>)}{Array.from({ length: 35 }, (_, index) => <div key={index} className="min-h-20 bg-white p-2 text-xs"><span className="text-slate-400">{index + 1 <= 31 ? index + 1 : ""}</span></div>)}</div>
    <section className="mt-5"><h2 className="font-semibold mb-2">Scheduled jobs</h2>{scheduled.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">No scheduled jobs yet. Add a start date when creating a project.</div> : <div className="space-y-2">{scheduled.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"><div className="flex-1"><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.client?.name || "No client"} · {p.start_date}</p></div><ProjectStatusBadge status={p.status} /></Link>)}</div>}</section>
  </div>;
}
