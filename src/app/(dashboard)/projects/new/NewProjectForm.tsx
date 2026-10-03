"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { createProjectAction } from "@/app/(dashboard)/projects/actions";

export default function NewProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients.length === 0 ? "new" : "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await createProjectAction(new FormData(e.currentTarget));
      // On success the server action redirects to /projects.
      if (result?.errorCode) {
        setError(t(result.errorCode as keyof Dictionary));
        setSaving(false);
      }
    } catch {
      setError(t("errGeneric"));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label={t("cancel")} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
          <X className="h-4 w-4 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold">{t("newProject")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <Input name="name" label={t("projectName")} placeholder="Miami Beach" required />

        {clients.length > 0 && (
          <Select
            label={t("clientLabel")}
            name="clientId"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[
              { value: "", label: t("selectClient") },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
              { value: "new", label: t("newClientOption") },
            ]}
          />
        )}
        {clientId === "new" && <Input name="newClientName" label={t("newClientName")} required />}

        <Input name="address" label={t("address")} placeholder="123 Main St, Miami FL" />

        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">{t("moreDetails")}</summary>
          <div className="mt-4 space-y-4">
        <Select
          label={t("statusLabel")}
          name="status"
          defaultValue="lead"
          options={[
            { value: "lead", label: t("statusLead") },
            { value: "quoted", label: t("statusQuoted") },
            { value: "approved", label: t("statusApproved") },
            { value: "active", label: t("statusActive") },
            { value: "on_hold", label: t("statusOnHold") },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label={t("contractValue")} name="contractValue" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" />
          <Input label={t("startDate")} name="startDate" type="date" />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">{t("budget")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input name="budgetMaterials" label={t("materials")} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" />
            <Input name="budgetLabor" label={t("labor")} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" />
            <Input name="budgetSubcontractors" label={t("subcontractors")} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" />
            <Input name="budgetOther" label={t("other")} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("notes")} ({t("optional")})
          </label>
          <textarea id="description" name="description" rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

          </div>
        </details>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {t("createProject")}
        </Button>
      </form>
    </div>
  );
}
