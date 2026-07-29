"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

const steps = [
  { id: "company", label: "Crear tu empresa", href: "/settings", done: true },
  { id: "client", label: "Agregar tu primer cliente", href: "/clients/new", done: false },
  { id: "project", label: "Crear un proyecto", href: "/projects/new", done: false },
  { id: "quote", label: "Enviar un quote", href: "/quotes/new", done: false },
  { id: "expense", label: "Registrar un gasto", href: "/expenses/new", done: false },
  { id: "employee", label: "Invitar a un empleado", href: "/employees/invite", done: false },
];

export function OnboardingChecklist() {
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Primeros pasos</h3>
        <span className="text-xs text-slate-500">
          {completed}/{steps.length}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-center gap-3 py-1.5 text-sm hover:text-brand-600 transition"
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
              )}
              <span className={step.done ? "text-slate-400 line-through" : ""}>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
