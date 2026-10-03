import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getProjectById } from "@/lib/services/projects";
import { getProjectTeam } from "@/lib/services/employees";
import { getProjectMoney, getProjectTimeline, getProjectWaiting } from "@/lib/services/project-control";
import { getMyPermissions } from "@/lib/auth";
import { getProjectBilling } from "@/lib/services/invoices";
import ProjectDetailClient from "./ProjectDetailClient";
import { logged, logError } from "@/lib/log";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <ProjectDetailClient error="errNoSupabase" />;
  }

  let project;
  try {
    const member = await getCurrentMember();
    if (!member?.company_id) throw new Error("no-company");
    // Filtered by company_id here and by RLS in the database.
    project = await getProjectById(id, member.company_id as string);
  } catch (error) {
    logError("/projects/[id]", error);
    return <ProjectDetailClient error="errLoadProject" />;
  }
  if (!project) notFound();

  // Owners and managers assign people to the project.
  let team: Awaited<ReturnType<typeof getProjectTeam>> = [];
  let canManageTeam = false;
  try {
    const member = await getCurrentMember();
    if (member?.company_id && (member.role === "owner" || member.role === "manager")) {
      canManageTeam = true;
      team = await getProjectTeam(id, member.company_id as string);
    }
  } catch (error) {
    logError("/projects/[id]", error);
    // The rest of the project still renders.
  }
  // Project control: money (only with view-costs), who everything waits on, and the activity timeline.
  // Each part is optional context; the project itself must still render if one of them fails.
  const member = await getCurrentMember().catch(logged("/projects/[id]", null));
  const perms = await getMyPermissions(member ?? undefined).catch(logged("/projects/[id]", null));
  const companyId = (member?.company_id as string | undefined) ?? "";
  const [money, waiting, timeline] = await Promise.all([
    perms && companyId ? getProjectMoney(id, companyId, Number(project.contract_value), Number(project.budget_total), perms).catch(logged("/projects/[id]", null)) : Promise.resolve(null),
    companyId ? getProjectWaiting(id, companyId).catch(logged("/projects/[id]", [])) : Promise.resolve([]),
    companyId ? getProjectTimeline(id, companyId).catch(logged("/projects/[id]", [])) : Promise.resolve([]),
  ]);
  const billing = canManageTeam && companyId ? await getProjectBilling(id, companyId).catch(logged("/projects/[id]", null)) : null;
  return <ProjectDetailClient project={project} team={team} canManageTeam={canManageTeam} money={money} waiting={waiting} timeline={timeline} billing={billing} />;
}
