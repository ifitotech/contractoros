"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  CalendarDays,
  Users,
  FileText,
  UserCog,
  Settings,
  HardHat,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const workNav = [
    { href: "/dashboard", label: t("navHome"), icon: Home },
    { href: "/projects", label: t("navProjects"), icon: Briefcase },
    { href: "/clients", label: t("navClients"), icon: Users },
    { href: "/quotes", label: t("navQuotes"), icon: FileText },
  ];

  const operationsNav = [
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/files", label: "Files & Photos", icon: FolderOpen },
  ];

  const managementNav = [
    { href: "/employees", label: t("navEmployees"), icon: UserCog },
    { href: "/more", label: t("myCompany"), icon: Settings },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-30">
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{t("appName")}</h1>
            <p className="text-xs text-slate-500">ElectricPro LLC</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavSection label="Work" items={workNav} pathname={pathname} />
        <NavSection label="Operations" items={operationsNav} pathname={pathname} />
        {/* Keep management routes visible without removing any existing module. */}
        <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-5 mb-2">
          {t("managementSection")}
        </p>
        {managementNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
                active
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  active ? "text-brand-600" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Usuario</p>
            <p className="text-xs text-slate-500">Owner · {t("freePlan")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, items, pathname }: { label: string; items: { href: string; label: string; icon: typeof Home; badge?: number }[]; pathname: string }) {
  return <>
    <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-5 first:mt-0">{label}</p>
    {items.map((item) => {
      const active = pathname === item.href || pathname.startsWith(item.href + "/");
      return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-700 hover:bg-slate-50")}><item.icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />{item.label}{item.badge ? <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{item.badge}</span> : null}</Link>;
    })}
  </>;
}
