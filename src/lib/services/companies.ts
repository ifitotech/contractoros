import { createClient } from "@/lib/supabase/server";

export async function createCompanyWithOwner(params: {
  userId: string;
  fullName: string;
  email: string;
  companyName: string;
  phone?: string;
}) {
  const supabase = await createClient();

  // 1. Upsert profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: params.userId,
    full_name: params.fullName,
    email: params.email,
    phone: params.phone ?? null,
  });

  if (profileError) throw profileError;

  // 2. Create company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: params.companyName,
      phone: params.phone ?? null,
      email: params.email,
    })
    .select()
    .single();

  if (companyError) throw companyError;

  // 3. Add owner membership before settings so RLS can verify ownership.
  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: params.userId,
    role: "owner",
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  if (memberError) throw memberError;

  // 4. Create company settings
  const { error: settingsError } = await supabase.from("company_settings").insert({
    company_id: company.id,
  });
  if (settingsError) throw settingsError;

  // 5. Create Free subscription
  const { data: freePlan } = await supabase
    .from("plans")
    .select("id")
    .eq("name", "free")
    .single();

  if (freePlan) {
    await supabase.from("subscriptions").insert({
      company_id: company.id,
      plan_id: freePlan.id,
      status: "active",
    });
  }

  // 6. Seed default expense categories
  const defaultCategories = [
    "Materiales",
    "Herramientas",
    "Combustible",
    "Permisos",
    "Subcontratistas",
    "Equipos",
    "Alquiler",
    "Comidas",
    "Transporte",
    "Oficina",
    "Otros",
  ];

  await supabase.from("expense_categories").insert(
    defaultCategories.map((name, i) => ({
      company_id: company.id,
      name,
      is_system: true,
      is_active: true,
      sort_order: i,
    }))
  );

  return company;
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
