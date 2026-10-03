import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getExpenseCategories } from "@/lib/services/expenses";
import { getProjects } from "@/lib/services/projects";
import NewExpenseForm from "./NewExpenseForm";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Projects and categories are the company's own (RLS limits projects to the ones the person can see).
export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const c = await getActionContext().catch(logged("/expenses/new", null));
  if (!c) redirect("/dashboard");
  if (!c.perms.can_upload_documents && c.role !== "owner") redirect("/expenses");
  const [projects, categories] = await Promise.all([getProjects(c.companyId).catch(logged("/expenses/new", [])), getExpenseCategories(c.companyId).catch(logged("/expenses/new", []))]);
  return <NewExpenseForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} categories={(categories ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))} defaultProjectId={projectId && UUID.test(projectId) ? projectId : ""} needsReview={c.role === "employee"} />;
}
