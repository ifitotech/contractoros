import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getEmployees, getPendingInvitations } from "@/lib/services/employees";
import EmployeesClient from "./EmployeesClient";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const member = await getCurrentMember();
  // Team management is owner-only (RLS enforces it too).
  if (!member?.company_id || member.role !== "owner") redirect("/dashboard");
  try {
    const companyId = member.company_id as string;
    const [rows, invitations] = await Promise.all([getEmployees(companyId), getPendingInvitations(companyId)]);
    return (
      <EmployeesClient
        members={rows.map((row) => ({ ...row, profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile }))}
        invitations={invitations}
      />
    );
  } catch (error) {
    logError("/employees", error);
    return <EmployeesClient members={[]} invitations={[]} error />;
  }
}
