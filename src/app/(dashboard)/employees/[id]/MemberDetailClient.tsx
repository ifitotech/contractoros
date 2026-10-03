"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import {
  PERMISSION_TEMPLATES, type PermissionKey, type PermissionTemplate, type Permissions,
} from "@/lib/permissions";
import { setMemberActiveAction, setProjectAssignmentAction, updateMemberPermissionsAction, updateMemberRoleAction } from "@/app/(dashboard)/employees/actions";

type Member = {
  id: string; userId: string; role: string; isActive: boolean;
  profile: { full_name?: string | null; email?: string | null } | null;
  permissions: Permissions; template: string | null; assignedProjectIds: string[];
};

const TOGGLES: { key: PermissionKey; label: keyof Dictionary }[] = [
  { key: "can_request_material", label: "permRequestMaterial" },
  { key: "can_upload_documents", label: "permUploadDocuments" },
  { key: "can_manage_library", label: "permManageLibrary" },
  { key: "can_create_pricing_request", label: "permCreatePricingRequest" },
  { key: "can_create_po", label: "permCreatePO" },
  { key: "can_send_po", label: "permSendPO" },
  { key: "can_view_costs", label: "permViewCosts" },
  { key: "can_view_profit", label: "permViewProfit" },
  { key: "can_create_proposal", label: "permCreateProposal" },
];

const TEMPLATE_LABEL: Record<string, keyof Dictionary> = {
  employee_basic: "tplEmployeeBasic", employee_purchasing: "tplEmployeePurchasing", manager: "tplManager",
};

export default function MemberDetailClient({ member, projects }: { member: Member; projects: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [perms, setPerms] = useState<Permissions>(member.permissions);
  const [template, setTemplate] = useState<string | null>(member.template);
  const [assigned, setAssigned] = useState<Set<string>>(new Set(member.assignedProjectIds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const name = member.profile?.full_name || member.profile?.email || "—";

  const report = (result: { errorCode?: string } | undefined, okText?: string) => {
    if (result?.errorCode) setMessage({ kind: "error", text: t(result.errorCode as keyof Dictionary) });
    else setMessage(okText ? { kind: "ok", text: okText } : null);
    return !result?.errorCode;
  };

  function applyTemplate(name: PermissionTemplate) {
    setPerms({ ...PERMISSION_TEMPLATES[name] });
    setTemplate(name);
  }

  function toggle(key: PermissionKey, value: boolean) {
    setPerms((p) => ({ ...p, [key]: value, ...(key === "can_create_po" && !value ? { can_send_po: false, po_limit: null } : {}) }));
    setTemplate(null);
  }

  async function savePermissions() {
    setSaving(true);
    const form = new FormData();
    form.set("memberId", member.id);
    form.set("template", template ?? "");
    for (const { key } of TOGGLES) if (perms[key]) form.set(key, "on");
    form.set("po_limit", perms.po_limit === null ? "" : String(perms.po_limit));
    const result = await updateMemberPermissionsAction(form).catch(() => ({ errorCode: "errGeneric" }));
    report(result, t("permissionsSaved"));
    setSaving(false);
    router.refresh();
  }

  async function changeRole(role: string) {
    setSaving(true);
    const form = new FormData();
    form.set("memberId", member.id);
    form.set("role", role);
    const result = await updateMemberRoleAction(form).catch(() => ({ errorCode: "errGeneric" }));
    if (report(result)) { setPerms({ ...PERMISSION_TEMPLATES[role === "manager" ? "manager" : "employee_basic"] }); setTemplate(role === "manager" ? "manager" : "employee_basic"); }
    setSaving(false);
    router.refresh();
  }

  async function setActive(active: boolean) {
    setSaving(true);
    const form = new FormData();
    form.set("memberId", member.id);
    form.set("active", String(active));
    const result = await setMemberActiveAction(form).catch(() => ({ errorCode: "errGeneric" }));
    report(result);
    setSaving(false);
    router.refresh();
  }

  async function toggleProject(projectId: string, value: boolean) {
    const apply = (on: boolean) => setAssigned((prev) => { const next = new Set(prev); if (on) next.add(projectId); else next.delete(projectId); return next; });
    apply(value); // optimistic; reverted if the server refuses
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("userId", member.userId);
    form.set("assigned", String(value));
    const result = await setProjectAssignmentAction(form).catch(() => ({ errorCode: "errGeneric" }));
    if (!report(result)) apply(!value);
  }

  const roleName = member.role === "manager" ? t("manager") : t("employee");

  return <div className="mx-auto max-w-2xl p-4 md:p-8">
    <div className="mb-6 flex items-start gap-3">
      <Link href="/employees" aria-label={t("employees")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-bold">{name}</h1><p className="truncate text-sm text-slate-500">{member.profile?.email}</p></div>
      <Badge variant={member.isActive ? "success" : "warning"}>{member.isActive ? t("active") : t("inactive")}</Badge>
    </div>

    {message && <div role="alert" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message.text}</div>}

    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">{t("role")}</h2>
      <div className="flex gap-2">
        {(["employee", "manager"] as const).map((r) => <button key={r} type="button" disabled={saving || member.role === r} onClick={() => changeRole(r)} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium ${member.role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700"}`}>{r === "manager" ? t("manager") : t("employee")}</button>)}
      </div>
    </section>

    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold">{t("permissionsTitle")}</h2>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("permTemplate")}: {template && TEMPLATE_LABEL[template] ? t(TEMPLATE_LABEL[template]) : t("tplCustom")}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["employee_basic", "employee_purchasing", "manager"] as const).map((tpl) => <button key={tpl} type="button" onClick={() => applyTemplate(tpl)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${template === tpl ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>{t(TEMPLATE_LABEL[tpl])}</button>)}
      </div>
      <div className="divide-y divide-slate-100">
        {TOGGLES.map(({ key, label }) => <label key={key} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2 text-sm"><span>{t(label)}</span><input type="checkbox" checked={perms[key]} onChange={(e) => toggle(key, e.target.checked)} disabled={key === "can_send_po" && !perms.can_create_po} className="h-5 w-5 rounded accent-brand-600" /></label>)}
      </div>
      {perms.can_create_po && <div className="mt-3">
        <label htmlFor="po_limit" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("poLimit")}</label>
        <input id="po_limit" type="number" inputMode="decimal" min="0" step="0.01" value={perms.po_limit ?? ""} onChange={(e) => { setPerms((p) => ({ ...p, po_limit: e.target.value === "" ? null : Number(e.target.value) })); setTemplate(null); }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base" />
        <p className="mt-1 text-xs text-slate-500">{t("poLimitHint")}</p>
      </div>}
      <Button type="button" className="mt-4 w-full" loading={saving} onClick={savePermissions}>{t("saveChanges")}</Button>
    </section>

    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">{t("assignedProjects")}</h2>
      <p className="mb-3 text-xs text-slate-500">{roleName === t("manager") ? t("manager") : t("employeeSeesOnly")}</p>
      {projects.length === 0 ? <p className="text-sm text-slate-400">{t("noResults")}</p> : <div className="divide-y divide-slate-100">
        {projects.map((p) => <label key={p.id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2 text-sm"><span className="truncate">{p.name}</span><input type="checkbox" checked={assigned.has(p.id)} onChange={(e) => toggleProject(p.id, e.target.checked)} disabled={!member.isActive} className="h-5 w-5 rounded accent-brand-600" /></label>)}
      </div>}
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">{t("memberAccess")}</h2>
      <p className="mb-3 text-xs text-slate-500">{t("deactivateHint")}</p>
      {member.isActive
        ? <button type="button" disabled={saving} onClick={() => setActive(false)} className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-700">{t("deactivateMember")}</button>
        : <button type="button" disabled={saving} onClick={() => setActive(true)} className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700">{t("reactivateMember")}</button>}
    </section>
  </div>;
}
