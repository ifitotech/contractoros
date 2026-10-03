"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { categoryLabel } from "@/lib/category-label";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { createExpenseAction } from "@/app/(dashboard)/expenses/actions";

const field = "w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function NewExpenseForm({ projects, categories, defaultProjectId, needsReview }: { projects: { id: string; name: string }[]; categories: { id: string; name: string }[]; defaultProjectId: string; needsReview: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const form = new FormData(e.currentTarget);
    form.set("categoryId", categoryId);
    // On success the server action redirects to the expense.
    const res = await createExpenseAction(form).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; error?: string }));
    if (res?.errorCode || res?.error) { setError(res.errorCode ? t(res.errorCode as keyof Dictionary) : String(res.error)); setSaving(false); }
  }

  return <div className="mx-auto max-w-lg p-4 md:p-8">
    <div className="mb-6 flex items-center gap-3">
      <button type="button" onClick={() => router.back()} aria-label={t("back")} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4 text-slate-600" /></button>
      <h1 className="text-lg font-bold">{t("newExpense")}</h1>
    </div>
    {needsReview && <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t("expenseNeedsReviewNote")}</p>}
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("navProjects")}
        <select name="projectId" defaultValue={defaultProjectId} className={field}><option value="">{t("noProjectOption")}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("category")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{categories.map((c) => <button key={c.id} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-medium transition ${categoryId === c.id ? "bg-brand-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>{categoryLabel(c.name, t)}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("vendor")}<input name="vendorName" maxLength={160} className={field} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("amount")}<input name="amount" inputMode="decimal" required placeholder="0.00" className={`${field} font-semibold`} /></label>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("expenseDate")}<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={field} /></label>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("document")}</p>
        <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50"><Camera className="h-6 w-6 text-brand-600" /></span>
          <span className="block text-sm font-medium">{fileName ?? t("takePhotoOrUpload")}</span>
          <span className="mt-1 block text-xs text-slate-400">{t("receiptHint")}</span>
          <input type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{t("notes")} ({t("optional")})<textarea name="notes" rows={2} maxLength={1000} className={`${field} resize-none`} /></label>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <Button type="submit" size="lg" className="w-full" loading={saving} disabled={!categoryId}>{t("saveExpense")}</Button>
    </form>
  </div>;
}
