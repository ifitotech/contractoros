"use client";

import Link from "next/link";
import { Briefcase, ChevronRight, ClipboardList, Library } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export default function MaterialDoor({ projects, canCreateProject, canNewList = true, canReviewLists = false, canLibrary = false }: { canNewList?: boolean; canReviewLists?: boolean; canLibrary?: boolean; projects: { id: string; name: string; client: string | null }[]; canCreateProject: boolean }) {
  const { t } = useI18n();
  const secondary = "flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-brand-300";
  return <div className="mx-auto max-w-lg p-4 md:p-8">
    <h1 className="text-xl font-bold">{t("navMaterial")}</h1>
    {canNewList && <section className="mb-6">
      <p className="mb-3 text-sm text-slate-500">{projects.length === 0 ? (canCreateProject ? t("materialNeedProject") : t("materialNoProjects")) : t("materialWhichProject")}</p>
    {projects.length > 0 && <ul className="space-y-2">{projects.map((p) => <li key={p.id}><Link href={`/projects/${p.id}/materials/new`} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-brand-300"><Briefcase className="h-5 w-5 shrink-0 text-brand-600" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span>{p.client && <span className="block truncate text-xs text-slate-500">{p.client}</span>}</span><ChevronRight className="h-4 w-4 text-slate-300" /></Link></li>)}</ul>}
      {projects.length === 0 && canCreateProject && <Link href="/projects/new" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white">{t("newProject")}</Link>}
    </section>}
    {(canReviewLists || canLibrary) && <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("materialMore")}</h2>
      <ul className="space-y-2">
        {canReviewLists && <li><Link href="/materials/requests" className={secondary}><ClipboardList className="h-5 w-5 shrink-0 text-brand-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("materialRequests")}</span><span className="block text-xs text-slate-500">{t("materialListsHint")}</span></span><ChevronRight className="h-4 w-4 text-slate-300" /></Link></li>}
        {canLibrary && <li><Link href="/materials" className={secondary}><Library className="h-5 w-5 shrink-0 text-brand-600" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("materialsLibrary")}</span><span className="block text-xs text-slate-500">{t("materialLibraryHint")}</span></span><ChevronRight className="h-4 w-4 text-slate-300" /></Link></li>}
      </ul>
    </section>}
  </div>;
}
