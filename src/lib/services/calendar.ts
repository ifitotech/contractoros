import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export type CalendarEvent = { id: string; date: string; kind: "delivery" | "collect" | "quote" | "proposal" | "end"; titleKey: string; params: Record<string, string>; href: string };

/**
 * What lands on a date, from live records: deliveries, money to collect, quote answers due, proposals about to expire.
 * Owners and managers see the company; everybody else only sees their own purchases arriving.
 */
export async function getCalendarEvents(ctx: { companyId: string; userId: string; role: string }): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const reviewer = ctx.role === "owner" || ctx.role === "manager";
  const events: CalendarEvent[] = [];

  let po = supabase.from("purchase_orders").select("id, number, vendor_name, expected_delivery").eq("company_id", ctx.companyId).in("status", ["approved", "sent"]).not("expected_delivery", "is", null).limit(100);
  if (!reviewer) po = po.eq("created_by", ctx.userId);
  const poRows = await po;
  for (const r of poRows.data ?? []) events.push({ id: `po-${r.id}`, date: r.expected_delivery as string, kind: "delivery", titleKey: "calDelivery", params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}` });
  if (!reviewer) return events;

  const [inv, pr, qs, pj] = await Promise.all([
    supabase.from("invoices").select("id, number, total, amount_paid, due_date").eq("company_id", ctx.companyId).in("status", ["sent", "partial", "overdue"]).not("due_date", "is", null).limit(100),
    supabase.from("supply_quote_requests").select("id, number, response_due_date").eq("company_id", ctx.companyId).in("status", ["draft", "sent", "question_open"]).not("response_due_date", "is", null).limit(100),
    supabase.from("quotes").select("id, number, valid_until").eq("company_id", ctx.companyId).in("status", ["sent", "pending"]).not("valid_until", "is", null).limit(100),
    supabase.from("projects").select("id, name, estimated_end_date").eq("company_id", ctx.companyId).in("status", ["approved", "active"]).not("estimated_end_date", "is", null).limit(100),
  ]);
  for (const r of inv.data ?? []) {
    const owed = Math.round((Number(r.total) - Number(r.amount_paid ?? 0)) * 100) / 100;
    if (owed > 0.01) events.push({ id: `inv-${r.id}`, date: r.due_date as string, kind: "collect", titleKey: "calCollect", params: { number: r.number as string, amount: formatCurrency(owed) }, href: `/invoices/${r.id}` });
  }
  for (const r of pr.data ?? []) events.push({ id: `pr-${r.id}`, date: r.response_due_date as string, kind: "quote", titleKey: "calQuoteDue", params: { number: r.number as string }, href: `/pricing/${r.id}` });
  for (const r of qs.data ?? []) events.push({ id: `qs-${r.id}`, date: r.valid_until as string, kind: "proposal", titleKey: "calProposalExpires", params: { number: r.number as string }, href: `/quotes/${r.id}` });
  for (const r of pj.data ?? []) events.push({ id: `pj-${r.id}`, date: r.estimated_end_date as string, kind: "end", titleKey: "calProjectEnd", params: { name: r.name as string }, href: `/projects/${r.id}` });
  return events;
}
