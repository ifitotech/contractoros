import { getCurrentMember } from "@/lib/auth";
import { getEmployees } from "@/lib/services/employees";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) {
      const rows = await getEmployees(member.company_id as string);
      return <EmployeesClient members={rows.map((row) => ({ ...row, profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile }))} />;
    }
  } catch {}
  return <EmployeesClient demo />;
}
