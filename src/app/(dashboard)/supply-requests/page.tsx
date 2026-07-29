"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, PackageCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type SupplyRequest = { id: string; supplier: string; project: string; items: number; partNumber: string; description: string; status: string; date: string };
const initialRequests: SupplyRequest[] = [
  { id: "SR-001", supplier: "Graybar Electric", project: "Casa Rivera", items: 8, partNumber: "QO120GFI", description: "20A GFCI breaker", status: "Waiting for pricing", date: "Jul 28, 2026" },
  { id: "SR-002", supplier: "Ferguson", project: "Office Torres", items: 4, partNumber: "LITH-2x4-40K", description: "2x4 LED panels", status: "Pricing received", date: "Jul 27, 2026" },
];

export default function SupplyRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("contractoros:supply-requests");
    if (saved) {
      try { setRequests(JSON.parse(saved) as SupplyRequest[]); } catch { window.localStorage.removeItem("contractoros:supply-requests"); }
    }
  }, []);
  const filtered = useMemo(() => requests.filter((r) => `${r.supplier} ${r.project} ${r.id} ${r.partNumber} ${r.description}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || r.status === status)), [requests, query, status]);

  function addRequest(formData: FormData) {
    const next = { id: `SR-${String(requests.length + 1).padStart(3, "0")}`, supplier: String(formData.get("supplier") || "New supplier"), project: String(formData.get("project") || "No project"), items: Number(formData.get("items") || 1), partNumber: String(formData.get("partNumber") || "Not specified"), description: String(formData.get("description") || "Material description pending"), status: "Waiting for pricing", date: "Today" };
    const updated = [next, ...requests];
    setRequests(updated);
    window.localStorage.setItem("contractoros:supply-requests", JSON.stringify(updated));
    setOpen(false);
  }

  return <div className="p-4 md:p-8 max-w-4xl mx-auto">
    <div className="flex items-center gap-3 mb-6"><Link href="/quotes" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link><div className="flex-1"><h1 className="text-xl font-bold">Supply Requests</h1><p className="text-sm text-slate-500">Request material pricing from your supply house</p></div><Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />New request</Button></div>
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-5 text-sm text-brand-800"><strong>Separate from Customer Quotes.</strong> Use this area to request pricing and availability before preparing a customer quote.</div>
    <div className="flex flex-col sm:flex-row gap-2 mb-5"><label className="flex-1 bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 text-sm"><Search className="w-4 h-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier, part number or project" className="w-full outline-none" /></label><select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 text-sm"><option value="all">All statuses</option><option>Waiting for pricing</option><option>Pricing received</option></select></div>
    <div className="space-y-3">{filtered.map((request) => <div key={request.id} className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><PackageCheck className="w-5 h-5" /></div><div className="flex-1"><div className="flex justify-between gap-3"><div><p className="font-semibold text-sm">{request.supplier}</p><p className="text-xs text-slate-500">{request.id} · {request.project}</p></div><span className={`text-xs rounded-full px-2.5 py-1 ${request.status === "Pricing received" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{request.status}</span></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs"><p><span className="text-slate-500">Part number:</span> <strong>{request.partNumber}</strong></p><p className="mt-1 text-slate-600">{request.description}</p></div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>{request.items} material items</span><span>{request.date}</span></div></div></div></div>)}{filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-12">No supply requests found.</p>}</div>
    {open && <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 flex items-end sm:items-center justify-center"><form action={addRequest} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">New Supply Request</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="w-5 h-5" /></button></div><div className="space-y-3"><input name="supplier" required placeholder="Supplier name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input name="project" required placeholder="Project or client" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input name="partNumber" placeholder="Part number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input name="description" placeholder="Material description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input name="items" type="number" min="1" defaultValue="1" required placeholder="Number of items" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div><Button type="submit" className="w-full mt-5">Create request</Button></form></div>}
  </div>;
}
