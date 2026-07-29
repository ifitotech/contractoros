import { getCurrentMember } from "@/lib/auth";
import { getQuoteById } from "@/lib/services/quotes";
import QuoteDetailClient from "./QuoteDetailClient";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const member = await getCurrentMember(); if (member?.company_id) return <QuoteDetailClient quote={await getQuoteById(id, member.company_id as string)} />; } catch {}
  return <QuoteDetailClient demo />;
}
