"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/provider";
import { categoryLabel } from "@/lib/category-label";
import { addExpenseCategoryAction, setExpenseCategoryActiveAction } from "@/app/(dashboard)/settings/actions";

type Category = { id: string; name: string; is_system: boolean; is_active: boolean };

// Real categories of the company: what is saved here is what the expense form offers.
export default function CategoriesClient({ categories, isOwner, error = false }: { categories: Category[]; isOwner: boolean; error?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<{ errorCode?: string; success?: boolean }>) {
    setBusy(true);
    setMessage(null);
    const r = await action().catch(() => ({ errorCode: "errGeneric" }));
    setBusy(false);
    if (r.errorCode) { setMessage(t(r.errorCode as never)); return; }
    router.refresh();
  }
  const add = async () => {
    if (!name.trim()) return;
    const form = new FormData();
    form.set("name", name.trim());
    await run(() => addExpenseCategoryAction(form));
    setName("");
  };
  const toggle = (c: Category) => {
    const form = new FormData();
    form.set("id", c.id);
    form.set("active", String(!c.is_active));
    return run(() => setExpenseCategoryActiveAction(form));
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" aria-label={t("back")} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-lg font-bold">{t("expenseCategories")}</h1>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("errLoadData")}</div>}
      {isOwner ? (
        <div className="flex gap-2 mb-4">
          <input type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t("categoryNamePh")} aria-label={t("categoryNamePh")} className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add} size="md" disabled={busy || !name.trim()} aria-label={t("create")}><Plus className="w-4 h-4" /></Button>
        </div>
      ) : <p className="mb-4 text-sm text-slate-500">{t("catOwnerOnly")}</p>}
      {message && <p role="alert" className="mb-3 text-sm text-red-600">{message}</p>}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`flex-1 text-sm ${!cat.is_active ? "text-slate-400 line-through" : ""}`}>{categoryLabel(cat.name, t)}{cat.is_system && <span className="ml-2 text-[10px] uppercase text-slate-400">{t("catSystemBadge")}</span>}</span>
            {isOwner && <button type="button" disabled={busy} onClick={() => toggle(cat)} className={`text-xs font-medium px-2.5 py-1 rounded-lg ${cat.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{cat.is_active ? t("catActive") : t("catInactive")}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
