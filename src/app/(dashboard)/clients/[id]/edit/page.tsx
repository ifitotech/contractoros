"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateClientAction, archiveClientAction } from "@/app/(dashboard)/actions";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    data.set("id", params.id);
    const result = await updateClientAction(data);
    if (result.error) setMessage(result.error);
    else router.push(`/clients/${params.id}`);
    setSaving(false);
  }

  async function archive() {
    setSaving(true);
    const data = new FormData();
    data.set("id", params.id);
    const result = await archiveClientAction(data);
    if (result.error) { setMessage(result.error); setSaving(false); return; }
    router.push("/clients");
  }

  return <div className="p-4 md:p-8 max-w-lg mx-auto">
    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 mb-6"><ArrowLeft className="w-4 h-4" /> Volver</button>
    <h1 className="text-xl font-bold mb-6">Editar cliente</h1>
    <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <Input name="name" label="Nombre" defaultValue="Juan Rivera" required />
      <Input name="contactName" label="Persona de contacto" defaultValue="Juan Rivera" />
      <Input name="email" label="Email" type="email" defaultValue="juan@email.com" />
      <Input name="phone" label="Teléfono" defaultValue="(305) 555-0101" />
      <Input name="address" label="Dirección" defaultValue="742 Evergreen Terrace, Miami FL" />
      <textarea name="notes" rows={3} defaultValue="Prefiere WhatsApp." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
      {message && <p className="text-sm text-red-600">{message}</p>}
      <Button type="submit" size="lg" className="w-full" loading={saving}>Guardar cambios</Button>
      <button type="button" onClick={archive} disabled={saving} className="w-full py-2 text-sm text-red-600">Archivar cliente</button>
    </form>
  </div>;
}
