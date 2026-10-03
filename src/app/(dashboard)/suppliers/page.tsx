import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { createClient } from "@/lib/supabase/server";
import SuppliersClient, { type SupplierRow } from "./SuppliersClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

// Suppliers of the company (Owner/Manager). A supplier connected to a Supply account receives Pricing Requests in the app.
export default async function SuppliersPage() {
  const c = await getActionContext().catch(logged("/suppliers", null));
  if (!c || !(c.role === "owner" || c.role === "manager")) redirect("/dashboard");
  const supabase = await createClient();
  const [sup, conn] = await Promise.all([
    supabase.from("suppliers").select("id, name, supply_company_id, contacts:supplier_contacts(id, name, email, phone, is_primary:is_default_quote_contact, is_active)").eq("company_id", c.companyId).eq("is_active", true).order("name"),
    supabase.from("supply_connections").select("id, supplier_id, supply_company_id, status").eq("contractor_company_id", c.companyId).eq("status", "active"),
  ]);
  const byId = new Map((conn.data ?? []).map((x) => [x.supplier_id as string, x.id as string]));
  const rows: SupplierRow[] = (sup.data ?? []).map((s) => ({ id: s.id as string, name: s.name as string, connected: Boolean(s.supply_company_id), connectionId: byId.get(s.id as string) ?? null, contacts: [...(((s as unknown as { contacts: (SupplierRow["contacts"][number] & { is_active: boolean })[] | null }).contacts) ?? [])].filter((c) => c.is_active).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name)) }));
  return <SuppliersClient rows={rows} error={Boolean(sup.error)} />;
}
