"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { revokeInvitationAction } from "@/app/(dashboard)/employees/actions";

type Member = { id: string; role: string; is_active: boolean; profile?: { full_name?: string | null; email?: string | null } | null };
type Invitation = { id: string; email: string; full_name: string | null; role: string; expires_at: string };

export default function EmployeesClient({ members, invitations, error = false }: { members: Member[]; invitations: Invitation[]; error?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [busy, setBusy] = useState<string | null>(null);
  const roleLabel = (role: string) => (role === "owner" ? t("owner") : role === "manager" ? t("manager") : t("employee"));
  const filtered = useMemo(() => members.filter((m) => {
    const text = `${m.profile?.full_name || ""} ${m.profile?.email || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || (filter === "active" ? m.is_active : !m.is_active));
  }), [members, filter, query]);

  async function revoke(id: string) {
    setBusy(id);
    const form = new FormData();
    form.set("invitationId", id);
    await revokeInvitationAction(form).catch(() => undefined);
    setBusy(null);
    router.refresh();
  }

  return <div className="mx-auto max-w-3xl p-4 md:p-8">
    <PageHeader title={t("employees")} action={<Link href="/employees/invite" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Plus className="h-4 w-4" />{t("inviteEmployee")}</Link>} />
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("errGeneric")}</div>}
    <p className="mb-4 text-sm text-slate-500">{t("employeeSeesOnly")}</p>

    {invitations.length > 0 && <section className="mb-6">
      <h2 className="mb-2 text-sm font-bold">{t("pendingInvites")}</h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-amber-100 bg-amber-50/50">
        {invitations.map((i) => <div key={i.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.full_name || i.email}</p><p className="truncate text-xs text-slate-500">{i.email} · {roleLabel(i.role)} · {t("expiresOn", { date: new Date(i.expires_at).toLocaleDateString(locale) })}</p></div>
          <button type="button" disabled={busy === i.id} onClick={() => revoke(i.id)} className="text-xs font-semibold text-red-600">{t("revoke")}</button>
        </div>)}
      </div>
    </section>}

    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="w-full bg-transparent text-sm outline-none" /></label>
      <select aria-label={t("statusLabel")} value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="active">{t("active")}</option><option value="inactive">{t("inactive")}</option><option value="all">{t("all")}</option></select>
    </div>

    <div className="space-y-2">
      {filtered.map((m) => {
        const row = <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50"><User className="h-5 w-5 text-brand-600" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.profile?.full_name || m.profile?.email || "—"}</p><p className="truncate text-xs text-slate-500">{m.profile?.email || "—"}</p></div>
          <Badge variant={m.role === "owner" ? "info" : "default"}>{roleLabel(m.role)}</Badge>
          {!m.is_active && <Badge variant="warning">{t("inactive")}</Badge>}
          {m.role !== "owner" && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
        </div>;
        return m.role === "owner" ? <div key={m.id}>{row}</div> : <Link key={m.id} href={`/employees/${m.id}`} className="block hover:[&>div]:border-brand-300">{row}</Link>;
      })}
      {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">{t("noResults")}</p>}
    </div>
  </div>;
}

export type { Dictionary };
