import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getPurchaseOrderById } from "@/lib/services/purchase-orders";
import PODetail from "./PODetail";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/pos/[id]", null));
  if (!c) redirect("/dashboard");
  // Company filter here, visibility rules (RLS) in the database.
  const po = await getPurchaseOrderById(id, c.companyId).catch(logged("/pos/[id]", null));
  if (!po) notFound();
  const reviewer = c.role === "owner" || c.role === "manager";
  return <PODetail po={po} isReviewer={reviewer} isCreator={po.created_by === c.userId} canSend={reviewer || c.perms.can_send_po} canUpload={c.perms.can_upload_documents} />;
}
