"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Plus, FileText, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const [createOpen, setCreateOpen] = useState(false);
  const items = [
    { href: "/dashboard", label: t("navHome"), icon: Home },
    { href: "/projects", label: t("navProjects"), icon: Briefcase },
    { href: "#create", label: t("create"), icon: Plus, isMain: true },
    { href: "/quotes", label: t("navQuotes"), icon: FileText },
    { href: "/more", label: t("myCompany"), icon: Menu },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 w-full max-w-full overflow-x-clip bg-white border-t border-slate-200 z-40 safe-bottom">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          if (item.isMain) {
            return <div key={item.href} className="relative flex flex-col items-center -mt-5">
              {createOpen && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("create")}</p>
                {[{ href: "/quotes/new", label: t("createServiceQuote") }, { href: "/quotes/estimator", label: t("createPlanEstimator") }, { href: "/supply-requests", label: t("createSupplyRequest") }, { href: "/projects/new", label: t("newProject") }, { href: "/clients/new", label: t("newClient") }, { href: "/expenses/new", label: t("newExpense") }].map((action) => <Link key={action.href} href={action.href} onClick={() => setCreateOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-brand-50">{action.label}</Link>)}
              </div>}
              <button type="button" onClick={() => setCreateOpen((open) => !open)} aria-label={t("create")} aria-expanded={createOpen} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
                  <Plus className="w-6 h-6" />
                </div>
              </button>
            </div>;
          }

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-1 px-3",
                active ? "text-brand-600" : "text-slate-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span
                className={cn("text-[10px] mt-0.5", active && "font-medium")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
