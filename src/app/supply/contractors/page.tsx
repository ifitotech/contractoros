import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import ContractorsView, { type ContractorRow } from "./ContractorsView";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function SupplyContractorsPage() {
  const member = await getCurrentMember().catch(logged("/supply/contractors", null));
  const companyId = member?.company_id as string | undefined;
  if (!companyId) return <ContractorsView rows={[]} error />;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supply_contractors", { p_company: companyId });
  return <ContractorsView rows={(data ?? []) as ContractorRow[]} error={Boolean(error)} />;
}
