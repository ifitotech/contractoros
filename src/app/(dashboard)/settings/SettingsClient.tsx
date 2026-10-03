"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PlanCards } from "@/components/shared/PlanCard";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/provider";
import { updateCompanyAction, updateProfileAction } from "@/app/(dashboard)/settings/actions";
import { useState } from "react";
import { useTheme, type Theme } from "@/lib/theme/provider";

type Company = { name: string | null; phone: string | null; email: string | null; address: string | null; currency: string | null; timezone: string | null };
type Profile = { full_name: string | null; phone: string | null };
const field = "w-full mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-base md:text-sm";

export default function SettingsClient({ isOwner, company, profile }: { isOwner: boolean; company: Company | null; profile: Profile | null }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const say = (r: { success?: boolean; errorCode?: string }) => (r.success ? t("savedOk") : t((r.errorCode ?? "errGeneric") as never));

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await updateCompanyAction(new FormData(event.currentTarget)).catch(() => ({ errorCode: "errGeneric" }) as { errorCode: string; success?: undefined });
    setMessage(say(result));
    setSaving(false);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateProfileAction(new FormData(event.currentTarget)).catch(() => ({ errorCode: "errGeneric" }) as { errorCode: string; success?: undefined });
    setProfileMessage(say(result));
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader title={t("settings")} subtitle={t("companyData")} />

      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">{t("ownerProfile")}</h3>
          <form onSubmit={saveProfile} className="space-y-3 max-w-lg">
            <div>
              <label className="text-xs text-slate-500">{t("fullName")}</label>
              <input name="fullName" defaultValue={profile?.full_name ?? ""} className={field} />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("phone")}</label>
              <input name="profilePhone" type="tel" defaultValue={profile?.phone ?? ""} className={field} />
            </div>
            {profileMessage && <p role="status" className="text-sm text-slate-600">{profileMessage}</p>}
            <Button type="submit" size="sm">{t("save")}</Button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">{t("themeTitle")}</h3>
          <select aria-label={t("themeTitle")} value={theme} onChange={(e) => setTheme(e.target.value as Theme)} className="w-full max-w-lg border border-slate-200 rounded-lg px-3 py-2.5 text-base md:text-sm">
            <option value="light">{t("themeLight")}</option>
            <option value="dark">{t("themeDark")}</option>
            <option value="system">{t("themeAuto")}</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">{t("language")}</h3>
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">{t("companyData")}</h3>
          {!isOwner && <p className="text-sm text-slate-500 mb-3">{t("ownerOnlyCompany")}</p>}
          <form onSubmit={saveCompany} className="space-y-3 max-w-lg" encType="multipart/form-data">
            <fieldset disabled={!isOwner} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">{t("companyName")}</label>
                <input name="name" type="text" required defaultValue={company?.name ?? ""} className={`${field} focus:outline-none focus:ring-2 focus:ring-brand-500`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">{t("phone")}</label>
                  <input name="phone" type="text" defaultValue={company?.phone ?? ""} className={field} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">{t("currency")}</label>
                  <select name="currency" defaultValue={company?.currency ?? "USD"} className={field}>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>MXN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">{t("email")}</label>
                <input name="email" type="email" defaultValue={company?.email ?? ""} className={field} />
              </div>
              <div>
                <label className="text-xs text-slate-500">{t("address")}</label>
                <input name="address" defaultValue={company?.address ?? ""} className={field} />
              </div>
              <div>
                <label className="text-xs text-slate-500">{t("companyLogo")}</label>
                <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="w-full mt-1 text-sm" />
                <p className="text-xs text-slate-400 mt-1">{t("logoHint")}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">{t("timezone")}</label>
                <select name="timezone" defaultValue={company?.timezone ?? "America/New_York"} className={field}>
                  <option value="America/New_York">{t("tzEastern")}</option>
                  <option value="America/Chicago">{t("tzCentral")}</option>
                  <option value="America/Denver">{t("tzMountain")}</option>
                  <option value="America/Los_Angeles">{t("tzPacific")}</option>
                </select>
              </div>
            </fieldset>
            {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
            {isOwner && <Button type="submit" size="sm" loading={saving}>{t("save")}</Button>}
          </form>
        </div>

        <div>
          <h3 className="font-semibold mb-3">{t("planAndBilling")}</h3>
          <PlanCards />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">{t("expenseCategories")}</h3>
          <a href="/settings/categories">
            <Button variant="outline" size="sm">{t("manageCategories")}</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
