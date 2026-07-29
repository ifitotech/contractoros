"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, FileText, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type Client = { id: string; name: string; contact_name?: string | null; company?: string | null; email?: string | null; phone?: string | null; address?: string | null; notes?: string | null; is_active?: boolean; projects?: { id: string; name: string; status: string; contract_value?: number }[]; quotes?: { id: string; number: string; status: string; total?: number; notes?: string | null }[] };

export default function ClientDetailClient({ client }: { client?: Client | null }) {
  const { t } = useI18n();
  const c = client ?? { id: "demo", name: "Example client", contact_name: "", email: "", phone: "", address: "", notes: "", is_active: true, projects: [], quotes: [] };
  return <div className="p-4 md:p-8 max-w-3xl">
    <div className="flex items-center gap-3 mb-6"><Link href="/clients" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link><div className="flex-1"><h1 className="text-xl font-bold">{c.name}</h1><p className="text-sm text-slate-500">{c.company || c.contact_name || t("clients")}</p></div><Badge variant={c.is_active === false ? "warning" : "success"}>{c.is_active === false ? t("inactive") : t("active")}</Badge></div>
    <Link href={`/clients/${c.id}/edit`} className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium mb-5"><Pencil className="w-4 h-4" />{t("edit")}</Link>
    <div className="grid md:grid-cols-3 gap-4 mb-6">{[[Phone, c.phone || t("phone")], [Mail, c.email || t("email")], [MapPin, c.address || t("address")]].map(([Icon, value], index) => { const I = Icon as typeof Phone; return <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><I className="w-4 h-4 text-slate-400" /><span className="text-sm truncate">{value as string}</span></div>; })}</div>
    {c.notes && <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-900">{c.notes}</div>}
    <div className="flex flex-wrap gap-2 mb-6"><Link href={`/projects/new?clientId=${c.id}`}><Button size="sm"><Briefcase className="w-4 h-4" />{t("newProject")}</Button></Link><Link href={`/quotes/new?clientId=${c.id}`}><Button size="sm" variant="outline"><FileText className="w-4 h-4" />{t("newQuote")}</Button></Link></div>
    <section className="space-y-4"><div><h2 className="font-semibold mb-2">{t("projects")}</h2><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{(c.projects || []).length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-400">{t("noResults")}</p> : c.projects?.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50"><div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.status}</p></div><p className="text-sm font-semibold">{formatCurrency(Number(p.contract_value || 0))}</p></Link>)}</div></div><div><h2 className="font-semibold mb-2">{t("quotes")}</h2><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{(c.quotes || []).length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-400">{t("noResults")}</p> : c.quotes?.map((q) => <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50"><div><p className="text-sm font-medium">{q.number}</p><p className="text-xs text-slate-500">{q.status}</p></div><p className="text-sm font-semibold">{formatCurrency(Number(q.total || 0))}</p></Link>)}</div></div></section>
  </div>;
}
