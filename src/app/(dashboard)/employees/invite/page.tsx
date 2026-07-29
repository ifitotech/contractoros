"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/provider";
import { inviteEmployeeAction } from "@/app/(dashboard)/actions";

export default function InviteEmployeePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const result = await inviteEmployeeAction(new FormData(e.currentTarget));
    setSaving(false);
    if (result.error) { toast(result.error, "error"); return; }
    toast(t("inviteEmployee"), "success");
    router.push("/employees");
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
        <h1 className="text-lg font-bold">{t("inviteEmployee")}</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <Input name="fullName" label={t("fullName")} placeholder="Luis Martínez" required />
        <Input name="email" label={t("email")} type="email" placeholder="luis@empresa.com" required />
        <Select
          label={t("role")}
          name="role"
          options={[
            { value: "employee", label: `${t("employee")} – ${t("roleEmployeeHint")}` },
            { value: "manager", label: `${t("manager")} – ${t("roleManagerHint")}` },
          ]}
        />

        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <p>
            <strong>{t("employee")}:</strong> {t("roleEmployeeHint")}
          </p>
          <p>
            <strong>{t("manager")}:</strong> {t("roleManagerHint")}
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {t("inviteEmployee")}
        </Button>
      </form>
    </div>
  );
}
