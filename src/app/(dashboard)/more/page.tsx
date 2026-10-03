"use client";
import Link from "next/link";
import { BarChart3, Package, Send, ShoppingCart, Building2, ChevronRight, LogOut, Settings, UserCog, FileSpreadsheet, Users, CalendarDays, MessageSquare, Receipt } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";
import { InstallHint } from "@/components/shared/InstallHint";
import { logoutAction } from "@/app/(auth)/actions";

// Everything that is not in the bottom bar, grouped like the desktop menu.
export default function MorePage() {
  const { t } = useI18n();
  const { permissions, isManagerOrAbove, isOwner, role } = usePermissions();
  const isEmployee = role === "employee";
  const canCosts = isOwner || (role === "manager" && permissions.can_view_costs);
  const groups: { title: string; items: { href: string; label: string; icon: typeof Package }[] }[] = [
    { title: t("areaSales"), items: isEmployee ? [] : [{ href: "/invoices", label: t("navInvoices"), icon: FileSpreadsheet }] },
    { title: t("areaPurchasing"), items: [
      ...(permissions.can_request_material || permissions.can_manage_library ? [{ href: "/material", label: t("navMaterial"), icon: Package }] : []),
      ...(isManagerOrAbove || permissions.can_create_pricing_request ? [{ href: "/pricing", label: t("navPricing"), icon: Send }] : []),
      ...(isManagerOrAbove || permissions.can_create_po ? [{ href: "/pos", label: t("navPurchaseOrders"), icon: ShoppingCart }] : []),
    ] },
    { title: t("areaMoney"), items: [
      ...(isManagerOrAbove ? [{ href: "/reports", label: t("navReports"), icon: BarChart3 }] : []),
      ...(canCosts ? [{ href: "/accounting", label: t("accounting"), icon: FileSpreadsheet }] : []),
      ...(!isEmployee ? [{ href: "/expenses", label: t("navExpenses"), icon: Receipt }] : []),
    ] },
    { title: t("areaConnections"), items: isEmployee ? [] : [
      { href: "/clients", label: t("navClients"), icon: Users },
      ...(isManagerOrAbove ? [{ href: "/suppliers", label: t("navSuppliers"), icon: Building2 }] : []),
      ...(isOwner ? [{ href: "/employees", label: t("navTeam"), icon: UserCog }] : []),
    ] },
    { title: t("navProjects"), items: [{ href: "/calendar", label: t("calendar"), icon: CalendarDays }] },
    { title: t("areaCompany"), items: [
      ...(isOwner ? [{ href: "/settings", label: t("navSettings"), icon: Settings }] : []),
      { href: "/feedback", label: t("navHelp"), icon: MessageSquare },
    ] },
  ].filter((g) => g.items.length > 0);
  return <div className="p-4 md:p-8 max-w-lg mx-auto"><h1 className="text-xl font-bold mb-2">{t("navMore")}</h1><p className="text-sm text-slate-500 mb-6">{t("moreHint")}</p>
    <InstallHint />
    {groups.map((g) => <section key={g.title} className="mb-5"><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.title}</h2><div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">{g.items.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"><item.icon className="w-5 h-5 text-slate-400" /><span className="flex-1 text-sm font-medium">{item.label}</span><ChevronRight className="w-4 h-4 text-slate-300" /></Link>)}</div></section>)}
    <form action={logoutAction} className="mt-6"><button type="submit" className="w-full flex items-center justify-center gap-2 text-red-600 text-sm font-medium py-3 rounded-xl border border-red-100 bg-red-50"><LogOut className="w-4 h-4" />{t("logout")}</button></form></div>;
}
