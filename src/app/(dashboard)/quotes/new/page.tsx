"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { createQuoteAction } from "@/app/(dashboard)/actions";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  part_number: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, part_number: "" },
  ]);
  const [quoteType, setQuoteType] = useState("complete");
  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get("type");
    if (["service", "materials", "plan_estimate", "complete"].includes(requestedType || "")) {
      setQuoteType(requestedType as string);
      window.history.replaceState(null, "", "/quotes/new");
    }
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 1, unit_price: 0, part_number: "" },
    ]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("items", JSON.stringify(
      items.map(({ description, quantity, unit_price, part_number }) => ({ description, quantity, unit_price, part_number }))
    ));
    const result = await createQuoteAction(formData);
    // Keep the local demo flow usable when Supabase is not configured.
    if (result?.error && process.env.NODE_ENV !== "development") {
      setError(result.error);
      setSaving(false);
      return;
    }
    setSaving(false);
    router.push("/quotes");
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold">{t("newQuote")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">Quote type</h2>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "service", label: "Service Quote", hint: "Labor and service" }, { value: "materials", label: "Material Quote", hint: "Parts for supply house" }, { value: "plan_estimate", label: "Plan Estimate", hint: "From a PDF or plan" }, { value: "complete", label: "Complete Quote", hint: "Materials + labor + profit" }].map((type) => <button key={type.value} type="button" onClick={() => setQuoteType(type.value)} className={`text-left rounded-xl p-3 border transition ${quoteType === type.value ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}><p className="text-sm font-semibold">{type.label}</p><p className="text-xs text-slate-500 mt-1">{type.hint}</p></button>)}
          </div>
          <input type="hidden" name="quoteType" value={quoteType} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <Select
            label={t("clients")}
            name="clientId"
            required
            options={[
              { value: "", label: "..." },
              { value: "1", label: "Juan Rivera" },
              { value: "2", label: "María Torres" },
            ]}
          />
          <Select
            label={`${t("navProjects")} (${t("optional")})`}
            name="projectId"
            options={[
              { value: "", label: "—" },
              { value: "1", label: "Casa Rivera" },
              { value: "2", label: "Oficina Torres" },
            ]}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t("lineItems")}</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-brand-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> {t("addLine")}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-end border-b border-slate-50 pb-3 last:border-0"
              >
                <div className="col-span-12 sm:col-span-5">
                  {idx === 0 && (
                    <label className="text-[10px] text-slate-400 uppercase">
                      {t("description")}
                    </label>
                  )}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div className="col-span-12 sm:col-span-3">
                  {idx === 0 && <label className="text-[10px] text-slate-400 uppercase">Part Number</label>}
                  <input type="text" value={item.part_number} onChange={(e) => updateItem(item.id, "part_number", e.target.value)} placeholder="E.g. BR120" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && (
                    <label className="text-[10px] text-slate-400 uppercase">
                      {t("quantity")}
                    </label>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-5 sm:col-span-3">
                  {idx === 0 && (
                    <label className="text-[10px] text-slate-400 uppercase">
                      {t("unitPrice")}
                    </label>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end pb-1">
                  <span className="text-sm font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm text-slate-500">{t("subtotal")}</span>
            <span className="text-lg font-bold">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <Input name="terms" label={`${t("terms")} (${t("optional")})`} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              {t("notes")}
            </label>
            <textarea
              rows={2}
              name="notes"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {t("create")} Quote
        </Button>
      </form>
    </div>
  );
}
