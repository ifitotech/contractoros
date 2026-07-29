"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { POStatusBadge } from "@/components/shared/StatusBadge";
import { FilterChips } from "@/components/ui/FilterChips";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type PO = { id: string; number: string; vendor_name: string; estimated_amount?: number | null; status: string; project?: { name?: string } | null };
export default function POsClient({ orders = [], demo = false }: { orders?: PO[]; demo?: boolean }) {
  const { t } = useI18n(); const [filter, setFilter] = useState("all"); const filtered = filter === "all" ? orders : orders.filter((po) => po.status === filter);
  return <div className="p-4 md:p-8"><PageHeader title={t("purchaseOrders")} action={<Link href="/pos/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white"><Plus className="w-4 h-4" />{t("newPO")}</Link>} />{demo && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{t("demoMode")}: configura Supabase para ver Purchase Orders reales.</div>}<FilterChips value={filter} onChange={setFilter} options={[{ value: "all", label: t("all") }, { value: "pending_document", label: t("pendingDocument") }, { value: "document_uploaded", label: t("documentUploaded") }, { value: "completed", label: t("completed") }]} /><div className="mt-4 space-y-2">{filtered.map((po) => <Link key={po.id} href={`/pos/${po.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 hover:border-brand-300"><div className="min-w-0"><p className="text-sm font-semibold">{po.vendor_name}</p><p className="text-xs text-slate-500">{po.number} · {po.project?.name || t("projects")}</p></div><div className="text-right"><p className="text-sm font-bold">{formatCurrency(Number(po.estimated_amount || 0))}</p><POStatusBadge status={po.status} /></div></Link>)}{filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">{t("noResults")}</p>}</div></div>;
}
