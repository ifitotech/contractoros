"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { loginAction, signInWithGoogleAction } from "../actions";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invite, setInvite] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    // Keep only the invitation token, then remove the query string from the address bar.
    setInvite(new URLSearchParams(window.location.search).get("invite") ?? "");
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await loginAction(formData);
      if (result?.errorCode || result?.error) {
        setError(result.errorCode ? t(result.errorCode as keyof Dictionary) : (result.error as string));
        setLoading(false);
      }
      // On success the server action redirects to /dashboard.
    } catch {
      setError(t("errGeneric"));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogleAction();
      if (result?.errorCode) { setError(t(result.errorCode as never)); setLoading(false); }
    } catch {
      setError(t("errGeneric"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0B2A5C] to-[#07152B] text-white">
      <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <div className="text-center mb-10">
          <Logo variant="full" tone="dark" className="mx-auto mb-2 w-64 max-w-full" />
          <h1 className="sr-only">{t("appName")}</h1>
          <p className="text-brand-100 mt-2 text-sm">{t("appTagline")}</p>
          <p className="text-brand-200 mt-1 text-xs">{t("loginWho")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="invite" value={invite} />
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="text-xs text-brand-200 mb-1 block">{t("email")}</label>
            <input
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          <div className="text-right -mt-2">
            <Link href="/forgot-password" className="text-brand-200 text-xs underline">
              {t("forgotPassword")}
            </Link>
          </div>
          <div>
            <label className="text-xs text-brand-200 mb-1 block">{t("password")}</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full bg-slate-900 text-slate-200 hover:bg-slate-800 mt-2"
          >
            {t("login")}
          </Button>

          {/* Google sign-in shows only when the provider is enabled in Supabase (NEXT_PUBLIC_GOOGLE_AUTH=true). */}
          {process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true" && <>
          <div className="flex items-center gap-3 my-4"><div className="h-px bg-white/20 flex-1" /><span className="text-xs text-brand-200">{t("orDivider")}</span><div className="h-px bg-white/20 flex-1" /></div>
          <button type="button" onClick={handleGoogle} disabled={loading} className="w-full rounded-xl bg-white text-slate-700 py-3.5 font-medium text-sm flex items-center justify-center gap-3 hover:bg-slate-100 disabled:opacity-60">
            <span className="font-bold text-lg">G</span> {t("continueWithGoogle")}
          </button>
          </>}
        </form>

        <p className="text-center text-brand-200 text-sm mt-8">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-white font-medium underline">
            {t("register")}
          </Link>
        </p>
      </div>

      <div className="pb-8 text-center text-brand-300 text-xs">
        {t("freeTrialNote")}
      </div>
    </div>
  );
}
