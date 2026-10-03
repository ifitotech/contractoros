import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getExpenses } from "@/lib/services/expenses";
import { readProjectFilter } from "@/lib/project-filter";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import ExpensesClient from "./ExpensesClient";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// The list only shows what the person may see (RLS): everything for Owner/Manager, their own otherwise.
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const c = await getActionContext().catch(logged("/expenses", null));
  if (!c) redirect("/dashboard");
  const canCreate = c.perms.can_upload_documents || c.role === "owner";
  try {
    const project = await readProjectFilter(c.companyId, projectId);
    return <>
      {project && <ProjectFilter name={project.name} clearHref="/expenses" />}
      <ExpensesClient expenses={await getExpenses(c.companyId, project ? { projectId: project.id } : undefined)} canCreate={canCreate} />
    </>;
  } catch (error) {
    logError("/expenses", error);
    return <ExpensesClient expenses={[]} canCreate={canCreate} error />;
  }
}
