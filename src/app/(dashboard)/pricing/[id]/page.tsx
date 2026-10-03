import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getPricingInvitations, getPricingRequestById, getSuppliers } from "@/lib/services/pricing-requests";
import { getPOsForPricingRequest } from "@/lib/services/purchase-orders";
import PricingDetail from "./PricingDetail";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PricingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/pricing/[id]", null));
  if (!c) redirect("/dashboard");
  const request = await getPricingRequestById(id, c.companyId).catch(logged("/pricing/[id]", null));
  if (!request) notFound();
  const isReviewer = c.role === "owner" || c.role === "manager";
  const suppliers = isReviewer ? await getSuppliers(c.companyId).catch(logged("/pricing/[id]", [])) : [];
  const links = isReviewer ? await getPricingInvitations(c.companyId, id).catch(() => ({ invitations: [], questions: [] })) : { invitations: [], questions: [] };
  const pos = await getPOsForPricingRequest(c.companyId, id).catch(logged("/pricing/[id]", []));
  // RLS already returns no responses to people without view-costs; the flag only drives the notice.
  return <PricingDetail request={request} suppliers={suppliers} pos={pos} invitations={links.invitations} questions={links.questions} canManage={isReviewer} pricesVisible={isReviewer || c.perms.can_view_costs} />;
}
