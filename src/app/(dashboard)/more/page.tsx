"use client";

import Link from "next/link";
import {
  Users,
  UserCog,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
  Receipt,
  LogOut,
  ChevronRight,
  HardHat,
  Briefcase,
  CalendarDays,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { logoutAction } from "@/app/(auth)/actions";

export default function MorePage() {
  const { t } = useI18n();

  const sections = [
    {
      title: "Work & sales",
      items: [
        { href: "/projects", label: t("navProjects"), icon: Briefcase },
        { href: "/quotes", label: t("navQuotes"), icon: FileText },
        { href: "/supply-requests", label: "Supply pricing requests", icon: ShoppingCart },
      ],
    },
    {
      title: t("myCompany"),
      items: [
        { href: "/expenses", label: t("navExpenses"), icon: Receipt },
        { href: "/pos", label: t("navPOs"), icon: CreditCard },
        { href: "/invoices", label: "Invoices", icon: CreditCard },
      ],
    },
    {
      title: "Operations",
      items: [
        { href: "/calendar", label: t("calendar"), icon: CalendarDays },
        { href: "/files", label: "Files & Photos", icon: FileText },
      ],
    },
    {
      title: t("managementSection"),
      items: [
        { href: "/clients", label: t("navClients"), icon: Users },
        { href: "/employees", label: t("navEmployees"), icon: UserCog },
        { href: "/reports", label: t("navReports"), icon: BarChart3 },
      ],
    },
    {
      title: t("settings"),
      items: [
        { href: "/notifications", label: t("navNotifications"), icon: Bell },
        { href: "/settings", label: t("navSettings"), icon: Settings },
        { href: "/settings", label: t("planAndBilling"), icon: CreditCard },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5">{t("myCompany")}</h1>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
          <HardHat className="w-7 h-7 text-brand-700" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Carlos Mendoza</h1>
          <p className="text-sm text-slate-500">Owner · ElectricPro LLC</p>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {section.title}
          </p>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
            {section.items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
              >
                <item.icon className="w-5 h-5 text-slate-400" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 text-red-600 text-sm font-medium py-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
