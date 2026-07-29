import { getCurrentMember } from "@/lib/auth";
import { getDashboardMetrics, getRecentActivity } from "@/lib/services/dashboard";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) {
      const metrics = await getDashboardMetrics(member.company_id as string);
      const activity = await getRecentActivity(member.company_id as string, 5).catch(() => []);
      const company = member.company as { name?: string } | null;
      return <DashboardClient metrics={metrics} activity={activity} companyName={company?.name || ""} isDemo={false} />;
    }
  } catch {
    // Supabase is optional for the local demo environment.
  }

  return <DashboardClient companyName="" isDemo />;
}
