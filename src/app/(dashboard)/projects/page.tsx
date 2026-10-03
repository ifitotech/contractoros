import { getCurrentMember } from "@/lib/auth";
import { getProjects } from "@/lib/services/projects";
import ProjectsClient from "./ProjectsClient";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <ProjectsClient error="errNoSupabase" />;
  }
  try {
    const member = await getCurrentMember();
    if (!member?.company_id) throw new Error("no-company");
    return <ProjectsClient projects={await getProjects(member.company_id as string)} />;
  } catch (error) {
    logError("/projects", error);
    return <ProjectsClient error="errLoadProjects" />;
  }
}
