"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LimitBanner({
  resource,
  used,
  limit,
}: {
  resource: string;
  used: number;
  limit: number;
}) {
  if (limit === -1) return null; // unlimited
  if (used < limit) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-900 text-sm">
          Límite de {resource} alcanzado
        </p>
        <p className="text-amber-700 text-xs mt-0.5">
          Has usado {used} de {limit} disponibles en el plan Free.
        </p>
      </div>
      <Link
        href="/settings"
        className="text-amber-800 text-xs font-semibold underline whitespace-nowrap"
      >
        Actualizar a Pro
      </Link>
    </div>
  );
}
