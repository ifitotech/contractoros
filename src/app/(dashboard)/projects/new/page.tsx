import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getClients } from "@/lib/services/clients";
import NewProjectForm from "./NewProjectForm";
import { logError } from "@/lib/log";

export default async function NewProjectPage() {
  let clients: { id: string; name: string }[] = [];
  let role = "";
  try {
    const member = await getCurrentMember();
    role = (member?.role as string | undefined) ?? "";
    if (member?.company_id && role !== "employee") {
      const rows = await getClients(member.company_id as string);
      clients = (rows ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
    }
  } catch (error) {
    logError("/projects/new", error);
    // The form still works: the user can type a new client.
  }
  // Only owners and managers create projects (redirect must run outside try/catch).
  if (role === "employee") redirect("/projects");
  return <NewProjectForm clients={clients} />;
}
