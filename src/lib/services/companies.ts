import { createClient } from "@/lib/supabase/server";

/**
 * Creates the company for the signed-in user (profile, company, owner
 * membership, settings, Free plan and default categories) atomically through
 * the `create_company_with_owner` database function. RLS stays enabled; the
 * function only ever acts for auth.uid() and is idempotent.
 */
export async function createCompanyWithOwner(params: {
  fullName?: string;
  companyName: string;
  phone?: string;
  kind?: "contractor" | "supply";
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company_with_owner", {
    p_company_name: params.companyName,
    p_full_name: params.fullName ?? null,
    p_phone: params.phone ?? null,
    p_kind: params.kind ?? "contractor",
  });
  if (error) throw error;
  return data as string;
}

export async function getCompanyById(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, settings:company_settings(*)")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data;
}

/** Today's date (YYYY-MM-DD) in the company's own time zone. The server runs in UTC, which is already "tomorrow" in the evening in the Americas. */
export async function getCompanyToday(companyId: string): Promise<string> {
  let timezone = "America/New_York";
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("companies").select("timezone").eq("id", companyId).maybeSingle();
    if (data?.timezone) timezone = data.timezone as string;
  } catch { /* keep the default */ }
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
