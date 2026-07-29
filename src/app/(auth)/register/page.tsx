"use client";

import { useState } from "react";
import Link from "next/link";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { registerAction } from "../actions";
import { useI18n } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function RegisterPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    formData.set("fullName", fullName);
    formData.set("email", email);
    formData.set("password", password);
    formData.set("companyName", companyName);
    formData.set("phone", phone);
    const result = await registerAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(result.success);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-800 to-brand-900 text-white">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{t("register")}</h1>
          <p className="text-brand-100 mt-1 text-sm">
            {t("stepOf", { current: step, total: 2 })} ·{" "}
            {step === 1 ? t("yourData") : t("yourCompany")}
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("fullName")}</label>
                <input
                  type="text"
                  required
                  defaultValue={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("email")}</label>
                <input
                  type="email"
                  required
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("password")}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("companyName")}</label>
                <input
                  name="companyNameField"
                  type="text"
                  required
                  autoComplete="off"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  data-form-type="other"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("phone")}</label>
                <input
                  name="phoneField"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-form-type="other"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-brand-200 mb-1 block">{t("businessType")}</label>
                <select
                  name="businessType"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="electrical" className="text-slate-900">Electricista</option>
                  <option value="hvac" className="text-slate-900">HVAC</option>
                  <option value="plumbing" className="text-slate-900">Plomería</option>
                  <option value="remodeling" className="text-slate-900">Remodelación</option>
                  <option value="construction" className="text-slate-900">Construcción</option>
                  <option value="general" className="text-slate-900">General Contractor</option>
                  <option value="other" className="text-slate-900">Otro</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-4 py-3 text-sm text-green-100">
              {success}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full bg-slate-900 text-slate-200 hover:bg-slate-800 mt-2"
          >
            {step === 1 ? t("continue") : t("register")}
          </Button>

          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-brand-200 text-sm py-2"
            >
              ← {t("back")}
            </button>
          )}
        </form>

        <p className="text-center text-brand-200 text-sm mt-8">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-white font-medium underline">
            {t("signIn")}
          </Link>
        </p>
      </div>

      <div className="pb-8 text-center text-brand-300 text-xs">
        {t("freeTrialNote")}
      </div>
    </div>
  );
}
