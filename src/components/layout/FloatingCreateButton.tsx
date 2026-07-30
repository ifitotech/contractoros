"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, ClipboardList, FileText, Plus, ShoppingCart, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function FloatingCreateButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const actions = [
    { href: "/quotes/new", label: t("createServiceQuote"), icon: FileText },
    { href: "/supply-requests", label: t("createSupplyRequest"), icon: ShoppingCart },
    { href: "/pos/new", label: "New purchase order", icon: ClipboardList },
    { href: "/projects/new", label: t("newProject"), icon: CalendarPlus },
  ];

  return <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-4 z-50 md:bottom-6 md:right-6">
    {open && <div className="absolute bottom-16 right-0 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t("create")}</p>
      {actions.map((action) => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"><action.icon className="h-4 w-4 text-brand-600" />{action.label}</Link>)}
    </div>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={t("create")} aria-expanded={open} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-700 active:scale-95">
      {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
    </button>
  </div>;
}
