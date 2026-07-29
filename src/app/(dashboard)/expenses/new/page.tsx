"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/provider";

const categories = [
  "Materiales",
  "Herramientas",
  "Combustible",
  "Subcontratistas",
  "Permisos",
  "Equipos",
  "Alquiler",
  "Comidas",
  "Transporte",
  "Oficina",
  "Otros",
];

export default function NewExpensePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [category, setCategory] = useState("Materiales");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    router.push("/expenses");
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
        <h1 className="text-lg font-bold">{t("newExpense")}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("navProjects")}
          </label>
          <select className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option>Casa Rivera</option>
            <option>Oficina Torres</option>
            <option>Residencial Los Pinos</option>
            <option>—</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
            {t("category")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-xl py-2.5 text-xs font-medium transition ${
                  category === cat
                    ? "bg-brand-600 text-white"
                    : "bg-slate-50 border border-slate-200 text-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("vendor")}
            </label>
            <input
              type="text"
              defaultValue="Home Depot"
              className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("amount")}
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                $
              </span>
              <input
                type="text"
                defaultValue="342.50"
                className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
            {t("document")}
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-brand-600" />
            </div>
            <p className="font-medium text-sm">{t("takePhotoOrUpload")}</p>
            <p className="text-xs text-slate-400 mt-1">{t("receiptHint")}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {t("notes")} ({t("optional")})
          </label>
          <textarea
            rows={2}
            className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <Button size="lg" className="w-full" loading={saving} onClick={handleSave}>
          {t("saveExpense")}
        </Button>
      </div>
    </div>
  );
}
