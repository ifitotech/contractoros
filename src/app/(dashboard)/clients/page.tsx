import { getCurrentMember } from "@/lib/auth";
import { getClients } from "@/lib/services/clients";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <ClientsClient clients={await getClients(member.company_id as string)} />;
  } catch {}
  return <ClientsClient demo />;
}
