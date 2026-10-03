import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { createClient } from "@/lib/supabase/server";
import AccountingClient from "./AccountingClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

// Owner, or a Manager who may view costs. The database function is the authority; the page only mirrors it.
export default async function AccountingPage() {
  const c = await getActionContext().catch(logged("/accounting", null));
  if (!c) redirect("/dashboard");
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_export_accounting", { p_company: c.companyId });
  if (allowed !== true) redirect("/dashboard");
  const [projects, log] = await Promise.all([
    supabase.from("projects").select("id,name,number").eq("company_id", c.companyId).order("created_at", { ascending: false }),
    supabase.from("accounting_export_log").select("id,dataset,format,date_from,date_to,row_count,created_at,exporter:profiles!accounting_export_log_exported_by_fkey(full_name)").eq("company_id", c.companyId).order("created_at", { ascending: false }).limit(20),
  ]);
  return <AccountingClient projects={projects.data ?? []} log={(log.data ?? []) as never[]} error={!!(projects.error || log.error)} />;
}
