import { getProjects } from "@/lib/services/projects";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads ?projectId= from a list page and returns it only when it is a real project of the company. */
export async function readProjectFilter(companyId: string, raw: string | undefined): Promise<{ id: string; name: string } | null> {
  if (!raw || !UUID.test(raw)) return null;
  const projects = await getProjects(companyId).catch(() => []);
  const hit = projects.find((p: { id: string }) => p.id === raw) as { id: string; name: string } | undefined;
  return hit ? { id: hit.id, name: hit.name } : null;
}
