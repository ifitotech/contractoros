import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getPricingRequests } from "@/lib/services/pricing-requests";
import PricingList from "./PricingList";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const c = await getActionContext().catch(logged("/pricing", null));
  if (!c || !(c.role === "owner" || c.role === "manager" || c.perms.can_create_pricing_request)) redirect("/dashboard");
  try {
    return <PricingList requests={await getPricingRequests(c.companyId)} />;
  } catch (error) {
    logError("/pricing", error);
    return <PricingList requests={[]} error />;
  }
}
