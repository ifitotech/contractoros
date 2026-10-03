"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileSpreadsheet,
  Briefcase,
  Users,
  FileText,
  UserCog,
  Settings,
  Receipt,
  BarChart3,
  MessageSquare,
  Package,
  ShoppingCart,
  Send,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";
import { Logo } from "@/components/shared/Logo";
import { logoutAction } from "@/app/(auth)/actions";

const roleLabel: Record<string, "owner" | "manager" | "employee"> = { owner: "owner", manager: "manager", employee: "employee" };

export function Sidebar({ companyName = "", userName = "", role = "" }: { companyName?: string; userName?: string; role?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { permissions, isManagerOrAbove } = usePermissions();

  const isEmployee = role === "employee";
  const canCosts = role === "owner" || (role === "manager" && permissions.can_view_costs);
  // One area per question the person asks: what am I selling, buying, spending, who do I work with.
  const sections: { label: string | null; items: { href: string; label: string; icon: typeof Home; also?: string[] }[] }[] = [
    { label: null, items: [
      { href: "/dashboard", label: t("navHome"), icon: Home },
      { href: "/projects", label: t("navProjects"), icon: Briefcase },
    ] },
    ...(isEmployee ? [] : [{ label: t("areaSales"), items: [
      { href: "/quotes", label: t("proposals"), icon: FileText },
      { href: "/invoices", label: t("navInvoices"), icon: FileSpreadsheet },
    ] }]),
    { label: t("areaPurchasing"), items: [
      // Material is one place: lists and the library hang from its page, not from the menu.
      ...(permissions.can_request_material || permissions.can_manage_library ? [{ href: "/material", label: t("navMaterial"), icon: Package, also: ["/materials"] }] : []),
      ...(isManagerOrAbove || permissions.can_create_pricing_request ? [{ href: "/pricing", label: t("navPricing"), icon: Send }] : []),
      ...(isManagerOrAbove || permissions.can_create_po ? [{ href: "/pos", label: t("navPurchaseOrders"), icon: ShoppingCart }] : []),
    ] },
    { label: t("areaMoney"), items: [
      { href: "/expenses", label: t("navExpenses"), icon: Receipt },
      ...(isManagerOrAbove ? [{ href: "/reports", label: t("navReports"), icon: BarChart3 }] : []),
      ...(canCosts ? [{ href: "/accounting", label: t("accounting"), icon: FileSpreadsheet }] : []),
    ] },
    ...(isEmployee ? [] : [{ label: t("areaConnections"), items: [
      { href: "/clients", label: t("navClients"), icon: Users },
      ...(isManagerOrAbove ? [{ href: "/suppliers", label: t("navSuppliers"), icon: Users }] : []),
      ...(role === "owner" ? [{ href: "/employees", label: t("navTeam"), icon: UserCog }] : []),
    ] }]),
    { label: t("areaCompany"), items: [
      ...(role === "owner" ? [{ href: "/settings", label: t("navSettings"), icon: Settings }] : []),
      { href: "/feedback", label: t("navHelp"), icon: MessageSquare },
    ] },
  ].filter((sec) => sec.items.length > 0);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-30">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Logo variant="mark" className="h-10 w-10 shrink-0" />
          <div>
            <p className="font-bold text-lg leading-tight">{t("appName")}</p>
            <p className="max-w-[9.5rem] truncate text-xs text-slate-500">{companyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sections.map((sec, k) => <NavSection key={k} label={sec.label} items={sec.items} pathname={pathname} />)}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
            {(userName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName || t("userFallback")}</p>
            <p className="text-xs text-slate-500 truncate">{role && roleLabel[role] ? t(roleLabel[role]) : ""}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" aria-label={t("logout")} title={t("logout")} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, items, pathname }: { label: string | null; items: { href: string; label: string; icon: typeof Home; badge?: number; also?: string[] }[]; pathname: string }) {
  return <>
    {label && <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-5 first:mt-0">{label}</p>}
    {items.map((item) => {
      const active = [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(h + "/"));
      return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-700 hover:bg-slate-50")}><item.icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />{item.label}{item.badge ? <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{item.badge}</span> : null}</Link>;
    })}
  </>;
}
