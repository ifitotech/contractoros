import { getCurrentMember } from "@/lib/auth";
import { getClientById } from "@/lib/services/clients";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await getCurrentMember();
    if (member?.company_id) return <ClientDetailClient client={await getClientById(id, member.company_id as string)} />;
  } catch {}
  return <ClientDetailClient />;
}
