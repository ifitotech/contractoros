import { createClient } from "@/lib/supabase/server";

export async function getClients(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, projects(id)")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((c) => ({
    ...c,
    projectCount: c.projects?.length ?? 0,
  }));
}

export async function createClientRecord(
  companyId: string,
  data: {
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_id: companyId,
      name: data.name,
      contact_name: data.contact_name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return client;
}

export async function getClientById(clientId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, projects(*), quotes(*)")
    .eq("id", clientId)
    .eq("company_id", companyId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientRecord(clientId: string, companyId: string, data: Partial<{
  name: string; contact_name: string; email: string; phone: string; address: string; notes: string;
}>) {
  const supabase = await createClient();
  const { data: client, error } = await supabase.from("clients").update({ ...data, updated_at: new Date().toISOString() }).eq("id", clientId).eq("company_id", companyId).select().single();
  if (error) throw error;
  return client;
}

export async function archiveClient(clientId: string, companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", clientId).eq("company_id", companyId);
  if (error) throw error;
}
