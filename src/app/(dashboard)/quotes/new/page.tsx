import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getClients } from "@/lib/services/clients";
import { getProjects } from "@/lib/services/projects";
import { getMaterials } from "@/lib/services/materials";
import NewQuoteForm from "./NewQuoteForm";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Proposals are Owner/Manager work. Clients and projects come from the company, never from sample data.
export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ projectId?: string; type?: string }> }) {
  const { projectId } = await searchParams;
  const c = await getActionContext().catch(logged("/quotes/new", null));
  if (!c || !(c.role === "owner" || c.role === "manager")) redirect("/dashboard");
  const [clients, projects, library] = await Promise.all([getClients(c.companyId).catch(logged("/quotes/new", [])), getProjects(c.companyId).catch(logged("/quotes/new", [])), getMaterials(c.companyId).catch(logged("/quotes/new", []))]);
  const items = library.map((m) => ({ id: m.id, description: m.description, unit: m.unit, category: m.category, manufacturer: m.manufacturer, catalog_number: m.catalog_number, is_favorite: m.is_favorite, use_count: m.use_count, last_used_at: m.last_used_at, aliases: m.aliases }));
  const list = projects.map((p) => ({ id: p.id, name: p.name, client_id: (p as { client_id?: string | null }).client_id ?? null }));
  const chosen = projectId && UUID.test(projectId) ? list.find((p) => p.id === projectId) : undefined;
  return <NewQuoteForm library={items} clients={(clients ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))} projects={list} defaultProjectId={chosen?.id ?? ""} defaultClientId={chosen?.client_id ?? ""} />;
}
