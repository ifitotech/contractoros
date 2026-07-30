"use client";
import Link from "next/link";
import { Building2, ChevronRight, CreditCard, Receipt, ShoppingCart, FileText, Users, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export default function MyCompanyPage() {
  const { t } = useI18n();
  const sections = [{ title: "Company operations", items: [{ href: "/settings", label: "Company profile", icon: Building2 }, { href: "/employees", label: t("navEmployees"), icon: Users }] }, { title: "Financial management", items: [{ href: "/expenses", label: t("navExpenses"), icon: Receipt }, { href: "/invoices", label: "Invoices", icon: FileText }, { href: "/pos", label: t("navPOs"), icon: ShoppingCart }] }, { title: "Company settings", items: [{ href: "/settings", label: t("navSettings"), icon: Settings }, { href: "/settings", label: t("planAndBilling"), icon: CreditCard }] }];
  return <div className="p-4 md:p-8 max-w-3xl mx-auto"><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Company workspace</p><h1 className="mt-1 text-2xl font-bold">{t("myCompany")}</h1><p className="mt-2 text-sm text-slate-500">Manage the company, team, money and business settings from one place.</p><div className="mt-6 space-y-6">{sections.map((section) => <section key={section.title}><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{section.title}</h2><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{section.items.map((item) => <Link key={item.href + item.label} href={item.href} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50"><item.icon className="w-5 h-5 text-slate-400" /><span className="flex-1 text-sm font-medium">{item.label}</span><ChevronRight className="w-4 h-4 text-slate-300" /></Link>)}</div></section>)}</div></div>;
}
