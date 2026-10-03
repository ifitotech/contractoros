import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getProjectBasic } from "@/lib/services/material-requests";
import { getProjectTakeoffs } from "@/lib/services/takeoffs";
import TakeoffList from "./TakeoffList";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectTakeoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/projects/[id]/takeoff", null));
  if (!c || !(c.role === "owner" || c.role === "manager" || c.perms.can_create_pricing_request)) redirect(`/projects/${id}`);
  const project = await getProjectBasic(id, c.companyId).catch(logged("/projects/[id]/takeoff", null));
  if (!project) notFound();
  const takeoffs = await getProjectTakeoffs(id, c.companyId).catch(logged("/projects/[id]/takeoff", []));
  return <TakeoffList projectId={id} projectName={project.name} takeoffs={takeoffs} />;
}
