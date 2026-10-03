import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getQuotes } from "@/lib/services/quotes";
import { readProjectFilter } from "@/lib/project-filter";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import QuotesClient from "./QuotesClient";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// Proposals (customer quotes). Prices are Owner/Manager information (or "create proposals" permission, enforced by RLS).
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const c = await getActionContext().catch(logged("/quotes", null));
  if (!c || !(c.role === "owner" || c.role === "manager" || c.perms.can_create_proposal)) redirect("/dashboard");
  try {
    const project = await readProjectFilter(c.companyId, projectId);
    return <>
      {project && <ProjectFilter name={project.name} clearHref="/quotes" />}
      <QuotesClient quotes={await getQuotes(c.companyId, undefined, project?.id)} canCreate={c.role === "owner" || c.role === "manager"} />
    </>;
  } catch (error) {
    logError("/quotes", error);
    return <QuotesClient quotes={[]} canCreate={false} error />;
  }
}
