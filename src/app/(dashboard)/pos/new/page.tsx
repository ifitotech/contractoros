"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import { createPOAction } from "@/app/(dashboard)/actions";

export default function NewPOPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const result = await createPOAction(new FormData(e.currentTarget));
    if (result?.error && process.env.NODE_ENV !== "development") {
      setSaving(false);
      return;
    }
    setSaving(false);
    router.push("/pos");
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
        <h1 className="text-lg font-bold">{t("newPO")}</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>{t("mustUploadDoc")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <Select
          label={t("navProjects")}
          name="projectId"
          required
          options={[
            { value: "", label: "..." },
            { value: "1", label: "Casa Rivera" },
            { value: "2", label: "Oficina Torres" },
            { value: "3", label: "Los Pinos" },
          ]}
        />
        <Input name="vendorName" label={t("vendor")} placeholder="Home Depot" required />
        <Select
          label={t("category")}
          name="category"
          options={[
            { value: "materials", label: t("materials") },
            { value: "tools", label: "Herramientas" },
            { value: "sub", label: t("subcontractors") },
            { value: "other", label: t("other") },
          ]}
        />
        <Input
          label={t("estimatedAmount")}
          name="estimatedAmount"
          type="number"
          step="0.01"
          placeholder="0.00"
        />
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            {t("description")}
          </label>
          <textarea
            name="description"
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {t("create")} PO
        </Button>
      </form>
    </div>
  );
}
