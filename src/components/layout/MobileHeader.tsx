"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

export function MobileHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between safe-top">
      <div className="min-w-0">
        <h1 className="text-lg font-bold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
      <Link
        href="/notifications"
        className="relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
      </Link>
    </header>
  );
}
