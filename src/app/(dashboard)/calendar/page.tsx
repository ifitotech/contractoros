import { getCurrentMember } from "@/lib/auth";
import { getProjects } from "@/lib/services/projects";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <CalendarClient projects={await getProjects(member.company_id as string)} />;
  } catch {}
  return <CalendarClient demo />;
}
