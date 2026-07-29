import { getCurrentMember } from "@/lib/auth";
import { getProjects } from "@/lib/services/projects";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <ProjectsClient projects={await getProjects(member.company_id as string)} />;
  } catch {}
  return <ProjectsClient demo />;
}
