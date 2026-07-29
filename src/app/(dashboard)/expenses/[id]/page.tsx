"use client";

import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

const expense = {
  id: "1",
  title: "Breakers + cable THHN",
  vendor: "Home Depot",
  project: "Casa Rivera",
  category: "Materiales",
  amount: 342.5,
  date: "2026-07-27",
  notes: "Breakers 20A y 50 ft de cable 12 AWG",
  createdBy: "Luis Martínez",
  hasDocument: true,
};

export default function ExpenseDetailPage() {
  const { t } = useI18n();

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/expenses"
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{expense.title}</h1>
          <p className="text-xs text-slate-500">{expense.vendor}</p>
        </div>
        <Badge variant="success">{t("approved")}</Badge>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 mb-4">
        <Row label={t("navProjects")} value={expense.project} />
        <Row label={t("category")} value={expense.category} />
        <Row label={t("amount")} value={formatCurrency(expense.amount)} bold />
        <Row label={t("employees")} value={expense.createdBy} />
        {expense.notes && <Row label={t("notes")} value={expense.notes} />}
      </div>

      {expense.hasDocument && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
            <Paperclip className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t("document")}</p>
            <p className="text-xs text-slate-500">receipt-home-depot.pdf</p>
          </div>
          <button className="text-brand-600 text-sm font-medium">{t("viewAll")}</button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
