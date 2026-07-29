"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PlanCards } from "@/components/shared/PlanCard";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/provider";
import { updateCompanyAction, updateProfileAction } from "@/app/(dashboard)/actions";
import { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/lib/theme/provider";

export default function SettingsPage() {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [defaults, setDefaults] = useState({ tax: "0", quoteTerms: "Payment terms for customer quotes", invoiceTerms: "Payment due within 15 days", quotePrefix: "QT-", invoicePrefix: "INV-" });
  useEffect(() => { const saved = localStorage.getItem("contractoros:settings-defaults"); if (saved) { try { setDefaults(JSON.parse(saved)); } catch {} } }, []);
  function saveDefaults() { localStorage.setItem("contractoros:settings-defaults", JSON.stringify(defaults)); setMessage("Defaults saved for this device."); }

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await updateCompanyAction(new FormData(event.currentTarget));
    setMessage(result.success || result.error || null);
    setSaving(false);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateProfileAction(new FormData(event.currentTarget));
    setProfileMessage(result.success || result.error || null);
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader title={t("settings")} subtitle={t("companyData")} />

      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">Perfil del propietario</h3>
          <form onSubmit={saveProfile} className="space-y-3 max-w-lg">
            <div>
              <label className="text-xs text-slate-500">{t("fullName")}</label>
              <input name="fullName" defaultValue="" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("phone")}</label>
              <input name="profilePhone" type="tel" defaultValue="" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            {profileMessage && <p className="text-sm text-slate-600">{profileMessage}</p>}
            <Button type="submit" size="sm">{t("save")}</Button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">Tema</h3>
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="w-full max-w-lg border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="system">Auto (según el dispositivo)</option>
          </select>
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">{t("language")}</h3>
          <LanguageSwitcher />
          <p className="text-xs text-slate-400 mt-2">
            ES · EN · PT
          </p>
        </div>

        {/* Company data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">{t("companyData")}</h3>
          <form onSubmit={saveCompany} className="space-y-3 max-w-lg" encType="multipart/form-data">
            <div>
              <label className="text-xs text-slate-500">{t("companyName")}</label>
              <input
                name="name"
                type="text"
                defaultValue="ElectricPro LLC"
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">{t("phone")}</label>
                <input
                  name="phone"
                  type="text"
                  defaultValue="(305) 555-0142"
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">{t("currency")}</label>
                <select name="currency" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>MXN</option>
                </select>
              </div>
            </div>
            <input name="email" type="email" placeholder="correo@empresa.com" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input name="address" placeholder="Dirección de la empresa" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <div>
              <label className="text-xs text-slate-500">Logo de la empresa</label>
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="w-full mt-1 text-sm" />
              <p className="text-xs text-slate-400 mt-1">PNG, JPG o WEBP · máximo 5 MB</p>
            </div>
            <select name="timezone" defaultValue="America/New_York" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
            {message && <p className="text-sm text-slate-600">{message}</p>}
            <Button type="submit" size="sm" loading={saving}>{t("save")}</Button>
          </form>
        </div>

        {/* Plans */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">Quotes & invoices defaults</h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-3"><div><label className="text-xs text-slate-500">Default tax %</label><input value={defaults.tax} onChange={(e) => setDefaults({ ...defaults, tax: e.target.value })} type="number" min="0" step="0.01" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div><div><label className="text-xs text-slate-500">Quote prefix</label><input value={defaults.quotePrefix} onChange={(e) => setDefaults({ ...defaults, quotePrefix: e.target.value })} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div><div><label className="text-xs text-slate-500">Invoice prefix</label><input value={defaults.invoicePrefix} onChange={(e) => setDefaults({ ...defaults, invoicePrefix: e.target.value })} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div></div>
          <textarea value={defaults.quoteTerms} onChange={(e) => setDefaults({ ...defaults, quoteTerms: e.target.value })} placeholder="Default quote terms" rows={2} className="w-full mb-3 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /><textarea value={defaults.invoiceTerms} onChange={(e) => setDefaults({ ...defaults, invoiceTerms: e.target.value })} placeholder="Default invoice terms" rows={2} className="w-full mb-3 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /><Button type="button" size="sm" onClick={saveDefaults}>{t("save")}</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5"><h3 className="font-semibold mb-2">Plan Estimator</h3><p className="text-sm text-slate-500">AI analysis usage is tracked locally until an analysis provider is connected.</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full w-0 rounded-full bg-brand-500" /></div><p className="mt-2 text-xs text-slate-400">0 analyses completed</p><Button type="button" variant="outline" size="sm" className="mt-3" disabled>Upgrade plan</Button></div>

        {/* Plans */}
        <div>
          <h3 className="font-semibold mb-3">{t("planAndBilling")}</h3>
          <PlanCards />
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-2">{t("expenseCategories")}</h3>
          <p className="text-xs text-slate-500 mb-3">
            Materiales, Herramientas, Combustible, Permisos, Subcontratistas...
          </p>
          <a href="/settings/categories">
            <Button variant="outline" size="sm">
              {t("manageCategories")}
            </Button>
          </a>
        </div>

        {/* Notifications prefs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">{t("notifications")}</h3>
          <div className="space-y-3 text-sm max-w-md">
            {[
              "PO sin documento",
              "Quote aprobado o rechazado",
              "Proyecto cerca de presupuesto",
              "Límite de plan cercano",
            ].map((item) => (
              <label key={item} className="flex items-center justify-between gap-4">
                <span>{item}</span>
                <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
