import { getActionContext } from "@/lib/action-context";
import { getProjects } from "@/lib/services/projects";
import { getCalendarEvents } from "@/lib/services/calendar";
import CalendarClient from "./CalendarClient";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  try {
    const c = await getActionContext();
    const [projects, events] = await Promise.all([getProjects(c.companyId), getCalendarEvents(c).catch(logged("/calendar", []))]);
    return <CalendarClient projects={projects} events={events} />;
  } catch (error) { logError("/calendar", error); }
  return <CalendarClient demo />;
}
