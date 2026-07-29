"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInvoiceAction } from "@/app/(dashboard)/actions";
import { useState } from "react";

export default function NewInvoicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const result = await createInvoiceAction(new FormData(event.currentTarget)); if (result?.error) { setError(result.error); setSaving(false); } }
  return <div className="p-4 md:p-8 max-w-lg mx-auto"><div className="flex items-center gap-3 mb-6"><button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button><h1 className="text-lg font-bold">New invoice</h1></div><form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><Input name="number" label="Invoice number" placeholder="INV-0001" required /><Input name="clientId" label="Client ID" placeholder="Client UUID" /><Input name="dueDate" label="Due date" type="date" /><Input name="description" label="Description" placeholder="Work completed" required /><Input name="amount" label="Amount" type="number" step="0.01" placeholder="0.00" required /><Input name="notes" label="Notes" /><p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">The invoice will be saved in Supabase after the migration is executed.</p>{error && <p className="text-sm text-red-600">{error}</p>}<Button type="submit" className="w-full" loading={saving}>Save draft</Button></form></div>;
}
