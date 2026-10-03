"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import { updateProjectAction, archiveProjectAction } from "@/app/(dashboard)/projects/actions";

type EditableProject = { id: string; name: string; address: string; status: string; contract_value: number; description: string };

export default function EditProjectForm({ project }: { project: EditableProject }) {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("id", project.id);
    const result = await updateProjectAction(form).catch(() => ({ errorCode: "errGeneric" }));
    if ("errorCode" in result && result.errorCode) { setError(t(result.errorCode as never)); setSaving(false); return; }
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  async function archive() {
    setSaving(true);
    const form = new FormData();
    form.set("id", project.id);
    const result = await archiveProjectAction(form).catch(() => ({ errorCode: "errGeneric" }));
    if ("errorCode" in result && result.errorCode) { setError(t(result.errorCode as never)); setSaving(false); return; }
    router.push("/projects");
    router.refresh();
  }

  return <div className="mx-auto max-w-lg p-4 md:p-8">
    <button type="button" onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />{t("back")}</button>
    <h1 className="mb-6 text-xl font-bold">{t("editProject")}</h1>
    <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <Input name="name" label={t("projectName")} defaultValue={project.name} required />
      <Input name="address" label={t("address")} defaultValue={project.address} />
      <Input name="contractValue" label={t("contractValue")} type="number" inputMode="decimal" min="0" step="0.01" defaultValue={project.contract_value} />
      <Select name="status" label={t("statusLabel")} defaultValue={project.status} options={[
        { value: "lead", label: t("statusLead") }, { value: "quoted", label: t("statusQuoted") }, { value: "approved", label: t("statusApproved") },
        { value: "active", label: t("statusActive") }, { value: "on_hold", label: t("statusOnHold") }, { value: "completed", label: t("statusCompleted") }, { value: "cancelled", label: t("statusCancelled") },
      ]} />
      <div>
        <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("notes")}</label>
        <textarea id="description" name="description" defaultValue={project.description} rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base" />
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Button type="submit" className="w-full" loading={saving}>{t("saveChanges")}</Button>
      <button type="button" onClick={archive} disabled={saving} className="w-full py-2 text-sm text-red-600">{t("archiveProject")}</button>
    </form>
  </div>;
}
