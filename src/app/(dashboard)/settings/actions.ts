"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { errCodeOf } from "@/lib/action-helpers";

export async function updateCompanyAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    const companyId = member.company_id as string;
    const supabase = (await import("@/lib/supabase/server")).createClient;
    const client = await supabase();
    const logo = formData.get("logo");
    let logoUrl: string | undefined;
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > 5 * 1024 * 1024) return { errorCode: "errLogoSize" };
      if (!["image/jpeg", "image/png", "image/webp"].includes(logo.type)) return { errorCode: "errLogoType" };
      const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/company-logo-${Date.now()}.${extension}`;
      const upload = await client.storage.from("documents").upload(path, logo, { upsert: true, contentType: logo.type });
      if (upload.error) return { errorCode: "errGeneric" };
      logoUrl = path;
    }
    const { error } = await client.from("companies").update({
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      currency: String(formData.get("currency") || "USD"),
      timezone: String(formData.get("timezone") || "America/New_York"),
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", companyId);
    if (error) return { errorCode: "errGeneric" };
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { errorCode: errCodeOf(err) };
  }
}

export async function updateProfileAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({
      full_name: String(formData.get("fullName") || "").trim() || null,
      phone: String(formData.get("profilePhone") || "").trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return { errorCode: "errGeneric" };
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { errorCode: errCodeOf(err) };
  }
}

// ---- Expense categories (Owner only; RLS enforces it again) ----
export async function addExpenseCategoryAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    const name = String(formData.get("name") || "").trim();
    if (!name || name.length > 60) return { errorCode: "errNameRequired" };
    const supabase = await (await import("@/lib/supabase/server")).createClient();
    const { error } = await supabase.from("expense_categories").insert({ company_id: member.company_id as string, name, is_system: false, is_active: true, sort_order: 100 });
    if (error) return { errorCode: "errGeneric" };
    revalidatePath("/settings/categories");
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}

export async function setExpenseCategoryActiveAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    const supabase = await (await import("@/lib/supabase/server")).createClient();
    const { error } = await supabase.from("expense_categories").update({ is_active: formData.get("active") === "true" }).eq("id", String(formData.get("id") || "")).eq("company_id", member.company_id as string);
    if (error) return { errorCode: "errGeneric" };
    revalidatePath("/settings/categories");
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}
