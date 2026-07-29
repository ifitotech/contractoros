"use client";

import Link from "next/link";
import { Plus, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/provider";
import { updateMemberRoleAction, deactivateMemberAction } from "@/app/(dashboard)/actions";

type Member = { id: string; role: string; is_active: boolean; profile?: { full_name?: string; email?: string } | null };

export default function EmployeesClient({ members, demo = false }: { members?: Member[]; demo?: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const data = members ?? [
    { id: "demo-owner", role: "owner", is_active: true, profile: { full_name: "Owner", email: "owner@example.com" } },
    { id: "demo-manager", role: "manager", is_active: true, profile: { full_name: "Manager", email: "manager@example.com" } },
  ];
  const roleLabel = (role: string) => role === "owner" ? t("owner") : role === "manager" ? t("manager") : t("employee");
  const filtered = useMemo(() => data.filter((m) => {
    const text = `${m.profile?.full_name || ""} ${m.profile?.email || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || (filter === "active" ? m.is_active : !m.is_active));
  }), [data, filter, query]);

  async function changeRole(memberId: string, role: string) {
    setBusy(memberId);
    const form = new FormData();
    form.set("memberId", memberId);
    form.set("role", role);
    await updateMemberRoleAction(form);
    window.location.reload();
  }

  async function deactivate(memberId: string) {
    setBusy(memberId);
    const form = new FormData();
    form.set("memberId", memberId);
    await deactivateMemberAction(form);
    window.location.reload();
  }

  return <div className="p-4 md:p-8">
    <PageHeader title={t("employees")} action={<Link href="/employees/invite" aria-label={t("inviteEmployee")} className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus className="w-4 h-4" />{t("inviteEmployee")}</Link>} />
    {demo && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para ver empleados reales.</div>}
    <div className="flex flex-col sm:flex-row gap-2 mb-4"><label className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search className="w-4 h-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${t("search")} ${t("employees").toLowerCase()}`} className="w-full bg-transparent text-sm outline-none" /></label><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="active">{t("active")}</option><option value="inactive">{t("inactive")}</option><option value="all">{t("all")}</option></select></div>
    <div className="space-y-2">{filtered.map((m) => <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50"><User className="h-5 w-5 text-brand-600" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.profile?.full_name || "—"}</p><p className="truncate text-xs text-slate-500">{m.profile?.email || "—"}</p></div><div className="flex items-center gap-2">{m.role !== "owner" && !demo ? <><select value={m.role} disabled={busy === m.id} onChange={(e) => changeRole(m.id, e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option value="employee">{t("employee")}</option><option value="manager">{t("manager")}</option></select><button disabled={busy === m.id} onClick={() => deactivate(m.id)} className="text-xs text-red-600">{t("inactive")}</button></> : <Badge variant={m.role === "owner" ? "info" : "default"}>{roleLabel(m.role)}</Badge>}{!m.is_active && <Badge variant="warning">{t("inactive")}</Badge>}</div></div>)}{filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">{t("noResults")}</p>}</div>
  </div>;
}
