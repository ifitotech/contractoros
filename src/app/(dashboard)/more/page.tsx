"use client";
import Link from "next/link";
import { BarChart3, Bell, ChevronRight, LogOut, Settings, UserCog } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { logoutAction } from "@/app/(auth)/actions";

export default function MorePage() {
  const { t } = useI18n();
  const items = [{ href: "/employees", label: t("navEmployees"), icon: UserCog }, { href: "/reports", label: t("navReports"), icon: BarChart3 }, { href: "/notifications", label: t("navNotifications"), icon: Bell }, { href: "/settings", label: t("navSettings"), icon: Settings }];
  return <div className="p-4 md:p-8 max-w-lg mx-auto"><h1 className="text-xl font-bold mb-2">More</h1><p className="text-sm text-slate-500 mb-6">Additional tools and app settings.</p><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{items.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"><item.icon className="w-5 h-5 text-slate-400" /><span className="flex-1 text-sm font-medium">{item.label}</span><ChevronRight className="w-4 h-4 text-slate-300" /></Link>)}</div><form action={logoutAction} className="mt-6"><button type="submit" className="w-full flex items-center justify-center gap-2 text-red-600 text-sm font-medium py-3 rounded-xl border border-red-100 bg-red-50"><LogOut className="w-4 h-4" />{t("logout")}</button></form></div>;
}
