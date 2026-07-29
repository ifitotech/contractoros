"use client";

import Link from "next/link";
import { Plus, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { useI18n } from "@/lib/i18n/provider";
import { useState } from "react";

type Client = { id: string; name: string; contact_name?: string | null; phone?: string | null; email?: string | null; projectCount?: number; is_active?: boolean };

export default function ClientsClient({ clients, demo = false }: { clients?: Client[]; demo?: boolean }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const data = clients ?? [
    { id: "demo-1", name: "Example client", contact_name: "", phone: "", email: "", projectCount: 0 },
  ];
  const filtered = data.filter((client) => `${client.name} ${client.contact_name || ""} ${client.email || ""}`.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || (filter === "active" ? client.is_active !== false : client.is_active === false)));
  return <div className="p-4 md:p-8">
    <PageHeader title={t("clients")} action={<Link href="/clients/new" className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus className="w-4 h-4" />{t("newClient")}</Link>} />
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para guardar clientes reales.</div>}
    <div className="flex gap-2 mb-4"><SearchInput value={search} onChange={setSearch} placeholder={t("search")} className="flex-1" /><select aria-label={t("active")} value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="active">{t("active")}</option><option value="inactive">{t("inactive")}</option><option value="all">{t("all")}</option></select></div>
    <div className="space-y-2">{filtered.map((client) => <Link key={client.id} href={`/clients/${client.id}`} className="block bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:border-brand-300 transition"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{client.name}</p><p className="text-xs text-slate-500">{client.contact_name || "—"}</p><div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">{client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}{client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}</div></div><span className="text-xs text-slate-400 whitespace-nowrap">{client.projectCount ?? 0} {t("projects").toLowerCase()}</span></div></Link>)}{filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">{t("noResults")}</p>}</div>
  </div>;
}
