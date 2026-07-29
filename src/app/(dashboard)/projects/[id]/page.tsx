import { getCurrentMember } from "@/lib/auth";
import { getProjectById } from "@/lib/services/projects";
import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <ProjectDetailClient project={await getProjectById(id, member.company_id as string)} />;
  } catch {}
  return <ProjectDetailClient demo />;
}
