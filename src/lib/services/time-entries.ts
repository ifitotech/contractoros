import { createClient } from "@/lib/supabase/server";

export async function getOpenTimeEntry(companyId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").select("*").eq("company_id", companyId).eq("user_id", userId).is("clock_out", null).maybeSingle();
  if (error) throw error;
  return data;
}

export async function clockIn(companyId: string, userId: string, projectId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").insert({ company_id: companyId, user_id: userId, project_id: projectId || null }).select().single();
  if (error) throw error;
  return data;
}

export async function clockOut(companyId: string, userId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").update({ clock_out: new Date().toISOString() }).eq("id", entryId).eq("company_id", companyId).eq("user_id", userId).is("clock_out", null);
  if (error) throw error;
}
