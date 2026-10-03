import { getCurrentMember } from "@/lib/auth";
import { getPurchaseOrders } from "@/lib/services/purchase-orders";
import { readProjectFilter } from "@/lib/project-filter";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import POsClient from "./POsClient";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function POsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  try {
    const member = await getCurrentMember();
    if (member?.company_id) {
      const companyId = member.company_id as string;
      const project = await readProjectFilter(companyId, projectId);
      const rows = await getPurchaseOrders(companyId, undefined, project?.id);
      return <>
        {project && <ProjectFilter name={project.name} clearHref="/pos" />}
        <POsClient orders={(rows ?? []).map((r) => ({ ...r, project: one(r.project as { name?: string } | { name?: string }[] | null) })) as never} />
      </>;
    }
  } catch (error) { logError("/pos", error); }
  return <POsClient demo />;
}
