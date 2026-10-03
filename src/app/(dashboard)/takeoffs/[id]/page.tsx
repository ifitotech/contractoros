import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getTakeoff } from "@/lib/services/takeoffs";
import TakeoffDetail from "./TakeoffDetail";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TakeoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/takeoffs/[id]", null));
  if (!c) redirect("/dashboard");
  const takeoff = await getTakeoff(id, c.companyId).catch(logged("/takeoffs/[id]", null));
  if (!takeoff) notFound();
  return <TakeoffDetail takeoff={takeoff} isReviewer={c.role === "owner" || c.role === "manager"} canRequest={c.perms.can_request_material} canUpload={c.perms.can_upload_documents} />;
}
