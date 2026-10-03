import { getActionContext } from "@/lib/action-context";
import { getCurrentMember, getCurrentProfile } from "@/lib/auth";
import { getDashboardMetrics, getOnboardingProgress } from "@/lib/services/dashboard";
import { getProjects } from "@/lib/services/projects";
import { getNeedsAttention } from "@/lib/services/project-control";
import { getEmployeeHome } from "@/lib/services/employee-home";
import { getTeamPurchases } from "@/lib/services/team-purchases";
import DashboardClient from "./DashboardClient";
import EmployeeHome from "./EmployeeHome";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <DashboardClient error="errNoSupabase" firstName="" companyName="" projects={[]} attention={{ invoices: 0, quotes: 0 }} items={[]} />;
  }

  try {
    const member = await getCurrentMember();
    if (!member?.company_id) throw new Error("no-company");
    const companyId = member.company_id as string;
    if (member.role === "employee") {
      // Field staff get their own home: the same login, a different first screen.
      const c = await getActionContext();
      const [profile, projects, mine] = await Promise.all([getCurrentProfile(), getProjects(companyId), getEmployeeHome(c)]);
      const company = member.company as { name?: string } | null;
      return <EmployeeHome firstName={(profile?.fullName || profile?.email || "").split(/[\s@]/)[0]} companyName={company?.name ?? ""} projects={projects.map((p) => ({ id: p.id, name: p.name, address: p.address }))} myPOs={mine.myPOs} myRequests={mine.myRequests} pendingReceipts={mine.pendingReceipts} />;
    }
    const isReviewer = member.role === "owner" || member.role === "manager";
    const [profile, projects, metrics, items, onboarding, team] = await Promise.all([
      getCurrentProfile(),
      getProjects(companyId),
      // Attention data is optional context; the project list must still render without it.
      getDashboardMetrics(companyId).catch(logged("/dashboard", null)),
      getActionContext().then((c) => getNeedsAttention(c)).catch(logged("/dashboard", [])),
      member.role === "owner" ? getOnboardingProgress(companyId).catch(logged("/dashboard", [])) : Promise.resolve([]),
      isReviewer ? getActionContext().then((c) => getTeamPurchases({ companyId, userId: c.userId, canCosts: member.role === "owner" || c.perms.can_view_costs })).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    const company = member.company as { name?: string } | null;
    const firstName = (profile?.fullName || profile?.email || "").split(/[\s@]/)[0];
    return (
      <DashboardClient
        firstName={firstName}
        companyName={company?.name ?? ""}
        projects={projects.slice(0, 6).map((p) => ({ id: p.id, name: p.name, status: p.status, address: p.address, clientName: p.client?.name ?? null }))}
        totalProjects={projects.length}
        attention={{ invoices: metrics?.pendingInvoices ?? 0, quotes: metrics?.pendingQuotes ?? 0 }}
        items={items}
        onboarding={onboarding}
        team={team}
      />
    );
  } catch (error) {
    logError("/dashboard", error);
    return <DashboardClient error="errLoadProjects" firstName="" companyName="" projects={[]} attention={{ invoices: 0, quotes: 0 }} items={[]} />;
  }
}
