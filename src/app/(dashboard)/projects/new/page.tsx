"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import { createProjectAction } from "@/app/(dashboard)/actions";

export default function NewProjectPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const result = await createProjectAction(new FormData(e.currentTarget));
    if (result?.error && process.env.NODE_ENV !== "development") {
      setSaving(false);
      return;
    }
    setSaving(false);
    router.push("/projects");
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold">{t("newProject")}</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <Input name="name" label={t("projectName")} placeholder="Casa Rivera – Panel eléctrico" required />

        <Select
          label={t("clients")}
          name="clientId"
          required
          options={[
            { value: "", label: "..." },
            { value: "1", label: "Juan Rivera" },
            { value: "2", label: "María Torres" },
            { value: "3", label: "Pedro Sánchez" },
          ]}
        />

        <Input label={t("address")} placeholder="123 Main St, Miami FL" />

        <Input
          label={t("contractValue")}
          name="contractValue"
          type="number"
          step="0.01"
          placeholder="0.00"
          required
        />

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
            {t("budget")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input name="budgetMaterials" label={t("materials")} type="number" step="0.01" placeholder="0" />
            <Input name="budgetLabor" label={t("labor")} type="number" step="0.01" placeholder="0" />
            <Input name="budgetSubcontractors" label={t("subcontractors")} type="number" step="0.01" placeholder="0" />
            <Input name="budgetOther" label={t("other")} type="number" step="0.01" placeholder="0" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            {t("description")} ({t("optional")})
          </label>
          <textarea
            name="description"
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {t("create")} {t("projects")}
        </Button>
      </form>
    </div>
  );
}
