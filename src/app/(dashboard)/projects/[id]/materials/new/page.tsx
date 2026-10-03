import { notFound, redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getMaterials, getSavedLists } from "@/lib/services/materials";
import { getProjectBasic } from "@/lib/services/material-requests";
import RequestBuilder from "./RequestBuilder";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewMaterialRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const c = await getActionContext().catch(logged("/projects/[id]/materials/new", null));
  if (!c) redirect("/dashboard");
  if (!c.perms.can_request_material) redirect(`/projects/${id}`);
  const project = await getProjectBasic(id, c.companyId).catch(logged("/projects/[id]/materials/new", null));
  if (!project) notFound();
  const [items, lists] = await Promise.all([getMaterials(c.companyId).catch(logged("/projects/[id]/materials/new", [])), getSavedLists(c.companyId).catch(logged("/projects/[id]/materials/new", []))]);
  return <RequestBuilder projectId={id} projectName={project.name} items={items} lists={lists} />;
}
