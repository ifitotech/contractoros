"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { POStatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/provider";

const po = {
  id: "1",
  number: "PO-2026-01842",
  vendor: "Home Depot",
  project: "Casa Rivera",
  category: "Materiales",
  description: "Breakers 20A y cable THHN 12 AWG",
  amount: 342.5,
  status: "pending_document",
  creator: "Luis Martínez",
  createdAt: "Hoy 09:14",
};

export default function PODetailPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState(po.status);
  const [showException, setShowException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setStatus("document_uploaded");
    setLoading(false);
    toast(t("documentUploaded"), "success");
  }

  async function handleComplete() {
    if (status === "pending_document") {
      toast(t("mustUploadDoc"), "error");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setStatus("completed");
    setLoading(false);
    toast(t("completed"), "success");
  }

  async function handleException() {
    if (!exceptionReason.trim()) {
      toast(t("exceptionReason"), "warning");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setStatus("exception_requested");
    setShowException(false);
    setLoading(false);
    toast(t("requestException"), "success");
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/pos"
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-slate-400">{po.number}</p>
          <h1 className="text-lg font-bold">{po.vendor}</h1>
        </div>
        <POStatusBadge status={status} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 mb-4">
        <Row label={t("navProjects")} value={po.project} />
        <Row label={t("category")} value={po.category} />
        <Row label={t("description")} value={po.description} />
        <Row label={t("amount")} value={formatCurrency(po.amount)} bold />
        <Row label={t("employees")} value={`${po.creator} · ${po.createdAt}`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="font-semibold mb-3">{t("document")}</h2>
        {status === "pending_document" || status === "exception_requested" ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">{t("uploadDocument")}</p>
            <p className="text-xs text-slate-400 mb-4">PDF, JPG o PNG · máx 10 MB</p>
            <Button size="sm" onClick={handleUpload} loading={loading}>
              <Upload className="w-4 h-4" /> {t("uploadDocument")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
            <FileText className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("documentUploaded")}</p>
              <p className="text-xs text-slate-500">invoice-home-depot.pdf</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {status !== "completed" && status !== "cancelled" && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleComplete}
            loading={loading}
            disabled={status === "pending_document"}
          >
            {t("completePO")}
          </Button>
        )}

        {status === "pending_document" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowException(true)}
          >
            <AlertTriangle className="w-4 h-4" />
            {t("requestException")}
          </Button>
        )}

        {status === "exception_requested" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {t("exceptionHint")}
          </div>
        )}
      </div>

      {showException && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowException(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-lg mb-2">{t("requestException")}</h3>
            <p className="text-sm text-slate-600 mb-4">{t("exceptionHint")}</p>
            <textarea
              rows={3}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder={t("exceptionReason")}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowException(false)}>
                {t("cancel")}
              </Button>
              <Button className="flex-1" onClick={handleException} loading={loading}>
                {t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-bold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
