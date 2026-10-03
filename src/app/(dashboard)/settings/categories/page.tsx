import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "./CategoriesClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const c = await getActionContext().catch(logged("/settings/categories", null));
  if (!c) redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.from("expense_categories").select("id,name,is_system,is_active").eq("company_id", c.companyId).order("sort_order").order("name");
  return <CategoriesClient categories={data ?? []} isOwner={c.role === "owner"} error={!!error} />;
}
