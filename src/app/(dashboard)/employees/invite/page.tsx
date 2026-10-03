"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { inviteEmployeeAction } from "@/app/(dashboard)/employees/actions";

export default function InviteEmployeePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await inviteEmployeeAction(new FormData(e.currentTarget));
      if (result.errorCode) setError(t(result.errorCode as keyof Dictionary));
      else if (result.token) setLink(`${window.location.origin}/invite/${result.token}`);
    } catch {
      setError(t("errGeneric"));
    }
    setSaving(false);
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the link stays visible to copy manually */ }
  }

  return (
    <div className="mx-auto max-w-lg p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.push("/employees")} aria-label={t("cancel")} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4 text-slate-600" /></button>
        <h1 className="text-lg font-bold">{t("inviteEmployee")}</h1>
      </div>

      {link ? (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-900">{t("inviteLinkReady")}</p>
          <p className="break-all rounded-lg border border-green-200 bg-white p-3 text-xs text-slate-700">{link}</p>
          <p className="text-xs text-green-800">{t("inviteLinkWarning")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={copy} className="flex-1">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t("copied") : t("copyLink")}</Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium"><MessageCircle className="h-4 w-4" />{t("shareWhatsApp")}</a>
          </div>
          <button type="button" onClick={() => setLink(null)} className="w-full text-sm font-medium text-brand-700">{t("inviteAnother")}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Input name="fullName" label={t("fullName")} placeholder="Luis Martínez" required />
          <Input name="email" label={t("email")} type="email" placeholder="name@example.com" required />
          <Select label={t("permTemplate")} name="template" defaultValue="employee_basic" options={[
            { value: "employee_basic", label: t("tplEmployeeBasic") },
            { value: "employee_purchasing", label: t("tplEmployeePurchasing") },
            { value: "manager", label: t("tplManager") },
          ]} />
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{t("inviteHint")}</p>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" size="lg" className="w-full" loading={saving}>{t("inviteEmployee")}</Button>
        </form>
      )}
    </div>
  );
}
