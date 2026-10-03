"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ProjectStatusBadge } from "@/components/shared/StatusBadge";
import type { CalendarEvent } from "@/lib/services/calendar";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type Project = { id: string; name: string; status: string; start_date?: string | null; end_date?: string | null; client?: { name?: string } | null };
const KIND_STYLE: Record<CalendarEvent["kind"], string> = { delivery: "bg-amber-50 text-amber-800", collect: "bg-green-50 text-green-800", quote: "bg-sky-50 text-sky-800", proposal: "bg-violet-50 text-violet-800", end: "bg-slate-100 text-slate-700" };

export default function CalendarClient({ projects = [], events = [], demo = false }: { projects?: Project[]; events?: CalendarEvent[]; demo?: boolean }) {
  const { t, locale } = useI18n();
  // The current month is only known in the browser; rendering it after mount avoids a server/client mismatch.
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  useEffect(() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }, []);
  const scheduled = projects.filter((p) => p.start_date);
  const shift = (delta: number) => setCursor((c) => { if (!c) return c; const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pad = (n: number) => String(n).padStart(2, "0");

  let monthLabel = "";
  const cells: { day: number | null; iso: string }[] = [];
  let weekdays: string[] = [];
  if (cursor) {
    monthLabel = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
    weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 7 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }));
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    for (let i = 0; i < first; i++) cells.push({ day: null, iso: "" });
    for (let d = 1; d <= days; d++) cells.push({ day: d, iso: `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}` });
    while (cells.length % 7) cells.push({ day: null, iso: "" });
  }
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return <div className="p-4 md:p-8"><div className="flex flex-wrap items-center gap-3 mb-6"><div className="flex-1"><h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-brand-600" />{t("calendar")}</h1><p className="text-sm text-slate-500 capitalize">{monthLabel || "\u00A0"}</p></div><Link href="/projects/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="w-4 h-4" />{t("newProject")}</Link></div>
    {demo && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-800">{t("errLoadData")}</div>}
    <div className="flex items-center gap-1 mb-4"><button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label={t("prevMonth")}><ChevronLeft className="w-4 h-4" /></button><button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">{t("today")}</button><button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label={t("nextMonth")}><ChevronRight className="w-4 h-4" /></button></div>
    {cursor && <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">{weekdays.map((day) => <div key={day} className="bg-slate-50 px-1 py-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}{cells.map((c, index) => { const here = c.day ? scheduled.filter((p) => p.start_date === c.iso) : []; return <div key={index} className={`min-h-16 md:min-h-20 bg-white p-1 md:p-2 text-xs ${c.iso === todayIso ? "ring-2 ring-inset ring-brand-400" : ""}`}><span className="text-slate-400">{c.day ?? ""}</span>{here.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="mt-1 block truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] font-medium text-brand-700">{p.name}</Link>)}{(c.day ? events.filter((e) => e.date === c.iso) : []).slice(0, 3).map((e) => <Link key={e.id} href={e.href} className={`mt-1 block truncate rounded px-1 py-0.5 text-[10px] font-medium ${KIND_STYLE[e.kind]}`}>{t(e.titleKey as keyof Dictionary, e.params)}</Link>)}</div>; })}</div>}
    {cursor && (() => {
      const prefix = `${cursor.y}-${pad(cursor.m + 1)}`;
      const list = events.filter((e) => e.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
      return <section className="mt-5" aria-label={t("calThisMonth")}><h2 className="mb-2 font-semibold">{t("calThisMonth")}</h2>
        {list.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">{t("calNothingMonth")}</div> :
          <ul className="space-y-2">{list.map((e) => <li key={e.id}><Link href={e.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300"><span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${KIND_STYLE[e.kind]}`}>{e.date.slice(8)}</span><span className="min-w-0 truncate text-sm">{t(e.titleKey as keyof Dictionary, e.params)}</span></Link></li>)}</ul>}
      </section>;
    })()}
    <section className="mt-5"><h2 className="font-semibold mb-2">{t("scheduledJobs")}</h2>{scheduled.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">{t("noScheduledJobs")}</div> : <div className="space-y-2">{scheduled.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"><div className="flex-1"><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.client?.name || t("noClient")} · {p.start_date}</p></div><ProjectStatusBadge status={p.status} /></Link>)}</div>}</section>
  </div>;
}
