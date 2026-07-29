"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateProjectAction, archiveProjectAction } from "@/app/(dashboard)/actions";

export default function EditProjectPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); form.set("id", params.id); const result = await updateProjectAction(form); if (result.error) { setError(result.error); setSaving(false); return; } router.push(`/projects/${params.id}`); }
  async function archive() { setSaving(true); const form = new FormData(); form.set("id", params.id); const result = await archiveProjectAction(form); if (result.error) { setError(result.error); setSaving(false); return; } router.push("/projects"); }
  return <div className="p-4 md:p-8 max-w-lg mx-auto"><button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" />Back</button><h1 className="mb-6 text-xl font-bold">Edit project</h1><form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><Input name="name" label="Project name" required /><Input name="address" label="Job address" /><Input name="contractValue" label="Contract value" type="number" step="0.01" /><Select name="status" label="Status" options={[{ value: "lead", label: "Lead" }, { value: "quoted", label: "Quoted" }, { value: "approved", label: "Approved" }, { value: "active", label: "In progress" }, { value: "on_hold", label: "On hold" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }]} /><textarea name="description" placeholder="Internal notes and description" rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />{error && <p className="text-sm text-red-600">{error}</p>}<Button type="submit" className="w-full" loading={saving}>Save changes</Button><button type="button" onClick={archive} disabled={saving} className="w-full py-2 text-sm text-red-600">Archive project</button></form></div>;
}
