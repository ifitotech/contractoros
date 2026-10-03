import { getCurrentMember } from "@/lib/auth";
import { getClients } from "@/lib/services/clients";
import ClientsClient from "./ClientsClient";
import { logError } from "@/lib/log";

export default async function ClientsPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <ClientsClient clients={await getClients(member.company_id as string)} />;
  } catch (error) { logError("/clients", error); }
  return <ClientsClient demo />;
}
