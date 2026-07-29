import { getCurrentMember } from "@/lib/auth";
import { getQuotes } from "@/lib/services/quotes";
import QuotesClient from "./QuotesClient";

export default async function QuotesPage() {
  try {
    const member = await getCurrentMember();
    if (member?.company_id) return <QuotesClient quotes={await getQuotes(member.company_id as string)} />;
  } catch {}
  return <QuotesClient demo />;
}
