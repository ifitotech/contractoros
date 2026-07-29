"use client";

import { cn } from "@/lib/utils";

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition",
            value === opt.value
              ? "bg-brand-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="ml-1 opacity-70">({opt.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
