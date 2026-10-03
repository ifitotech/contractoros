"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { SearchHit } from "@/lib/services/search";

const GROUP_KEY: Record<SearchHit["group"], keyof Dictionary> = {
  projects: "navProjects", clients: "navClients", proposals: "proposals", invoices: "navInvoices", purchaseOrders: "navPurchaseOrders",
  materialLists: "materialRequests", quoteRequests: "navPricing", materials: "materialsLibrary", suppliers: "navSuppliers",
};

export default function SearchClient({ query, hits }: { query: string; hits: SearchHit[] }) {
  const { t } = useI18n();
  const groups = (Object.keys(GROUP_KEY) as SearchHit["group"][]).map((g) => ({ g, rows: hits.filter((h) => h.group === g) })).filter((x) => x.rows.length > 0);
  return <div className="mx-auto max-w-2xl p-4 md:p-8">
    <form action="/search" role="search" className="relative mb-5">
      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
      <input name="q" defaultValue={query} autoFocus={!query} autoComplete="off" aria-label={t("searchEverything")} placeholder={t("searchEverything")} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-base outline-none focus:border-brand-500" />
    </form>
    {query.trim().length < 2 ? <p className="py-10 text-center text-sm text-slate-400">{t("searchHint")}</p> :
      groups.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">{t("searchNothing", { query })}</p> :
      groups.map(({ g, rows }) => <section key={g} className="mb-5"><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t(GROUP_KEY[g])}</h2>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{rows.map((h) => <li key={h.id}><Link href={h.href} className="block min-h-12 px-4 py-3 hover:bg-slate-50"><p className="truncate text-sm font-semibold">{h.title}</p>{h.subtitle && <p className="truncate text-xs text-slate-500">{h.subtitle}</p>}</Link></li>)}</ul></section>)}
  </div>;
}
