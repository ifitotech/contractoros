"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { updatePasswordAction } from "../actions";
import { useI18n } from "@/lib/i18n/provider";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updatePasswordAction(new FormData(event.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gradient-to-br from-brand-800 to-brand-900 text-white">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t("newPassword")}</h1>
        <p className="text-brand-100 text-sm mb-8">{t("newPasswordHint")}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="password" type="password" minLength={8} required placeholder="Nueva contraseña" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40" />
          {error && <div className="bg-red-500/20 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <Button type="submit" size="lg" loading={loading} className="w-full bg-white text-brand-800 hover:bg-brand-50">{t("savePassword")}</Button>
        </form>
        <Link href="/login" className="block text-center text-brand-200 text-sm mt-8 underline">{t("backToLogin")}</Link>
      </div>
    </div>
  );
}
