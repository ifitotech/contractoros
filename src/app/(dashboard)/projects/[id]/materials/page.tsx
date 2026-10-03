import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getProjectBasic, getProjectRequests } from "@/lib/services/material-requests";
import RequestList from "./RequestList";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/projects/[id]/materials", null));
  if (!c) redirect("/dashboard");
  const project = await getProjectBasic(id, c.companyId).catch(logged("/projects/[id]/materials", null));
  if (!project) notFound();
  try {
    const requests = await getProjectRequests(id, c.companyId);
    return <RequestList requests={requests} projectId={id} projectName={project.name} />;
  } catch (error) {
    logError("/projects/[id]/materials", error);
    return <RequestList requests={[]} projectId={id} projectName={project.name} error />;
  }
}
