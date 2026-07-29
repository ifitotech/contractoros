"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Menu, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    { href: "/dashboard", label: t("navHome"), icon: Home },
    { href: "/clients", label: t("navClients"), icon: Users },
    { href: "/quotes", label: t("navQuotes"), icon: FileText },
    { href: "/my-company", label: t("myCompany"), icon: Building2 },
    { href: "/more", label: "More", icon: Menu },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 w-full max-w-full overflow-x-clip bg-white border-t border-slate-200 z-40 safe-bottom">
      <div className="flex justify-around py-2">
        {items.map((item) => {
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
