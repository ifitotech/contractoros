"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { createQuoteAction } from "@/app/(dashboard)/quotes/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { searchLibrary, splitQuantity, type LibraryItem } from "@/lib/materials";

const QUOTE_UNIT: Record<string, string> = { EA: "each", FT: "ft", BOX: "box", ROLL: "roll", LOT: "lot" };

/** Description field that suggests items from the company library while typing; picking one fills part number and unit. */
function DescriptionField({ value, library, onText, onPick }: { value: string; library: LibraryItem[]; onText: (v: string) => void; onPick: (item: LibraryItem) => void }) {
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(0);
  const query = splitQuantity(value).text;
  const results = query.trim().length >= 2 ? searchLibrary(library, query, 6) : [];
  const open = focus && results.length > 0;
  return <div className="relative">
    <input type="text" value={value} autoComplete="off" required onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 120)}
      onChange={(e) => { onText(e.target.value); setActive(0); }}
      onKeyDown={(e) => {
        if (!open) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); onPick(results[active]); setFocus(false); }
        else if (e.key === "Escape") setFocus(false);
      }}
      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
    {open && <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
      {results.map((r, i) => <li key={r.id} role="option" aria-selected={i === active}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(r); setFocus(false); }} className={`flex min-h-12 w-full flex-col items-start px-3 py-2 text-left text-sm ${i === active ? "bg-brand-50" : "hover:bg-slate-50"}`}><span className="w-full truncate font-medium">{r.description}</span>{(r.manufacturer || r.catalog_number) && <span className="w-full truncate text-xs text-slate-400">{[r.manufacturer, r.catalog_number].filter(Boolean).join(" · ")}</span>}</button></li>)}
    </ul>}
  </div>;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  part_number: string;
  unit: string;
  notes: string;
}

export default function NewQuoteForm({ library = [], clients, projects, defaultProjectId, defaultClientId }: { library?: LibraryItem[]; clients: { id: string; name: string }[]; projects: { id: string; name: string; client_id: string | null }[]; defaultProjectId: string; defaultClientId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, part_number: "", unit: "each", notes: "" },
  ]);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [clientId, setClientId] = useState(defaultClientId);
  const [taxRate, setTaxRate] = useState("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 1, unit_price: 0, part_number: "", unit: "each", notes: "" },
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
      items.map(({ description, quantity, unit_price, part_number, unit, notes }) => ({ description, quantity, unit_price, part_number, unit, notes }))
    ));
    // On success the server action redirects to the new Proposal.
    const result = await createQuoteAction(formData).catch(() => ({ errorCode: "errGeneric" } as { errorCode?: string; error?: string }));
    if (result?.errorCode || result?.error) {
      setError(result.errorCode ? t(result.errorCode as keyof Dictionary) : String(result.error));
      setSaving(false);
    }
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
        <input type="hidden" name="quoteType" value="complete" />
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <Select
            label={t("clients")}
            name="clientId"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[{ value: "", label: "..." }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label={`${t("navProjects")} (${t("optional")})`}
            name="projectId"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); const p = projects.find((x) => x.id === e.target.value); if (p?.client_id) setClientId(p.client_id); }}
            options={[{ value: "", label: "—" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Input name="taxRate" label={t("taxRatePct")} inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
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
          <p className="text-xs text-slate-500 mb-3">{t("quoteLinesHint")}</p>

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
                  <DescriptionField value={item.description} library={library} onText={(v) => updateItem(item.id, "description", v)}
                    onPick={(m) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: m.description, part_number: m.catalog_number ?? x.part_number, unit: QUOTE_UNIT[m.unit] ?? "each" } : x)))} />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                    placeholder={t("itemNotesPh")}
                    className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3">
                  {idx === 0 && <label className="text-[10px] text-slate-400 uppercase">{t("partNumber")}</label>}
                  <input type="text" value={item.part_number} onChange={(e) => updateItem(item.id, "part_number", e.target.value)} placeholder={t("partNumberPh")} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  {idx === 0 && <label className="text-[10px] text-slate-400 uppercase">{t("unitLabel")}</label>}
                  <select value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="each">{t("unitEach")}</option><option value="ft">{t("unitFt")}</option><option value="box">{t("unitBox")}</option><option value="roll">{t("unitRoll")}</option><option value="hour">{t("unitHour")}</option><option value="lot">{t("unitLot")}</option>
                  </select>
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
          {t("newProposal")}
        </Button>
      </form>
    </div>
  );
}
