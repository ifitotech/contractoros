import { formatCurrency } from "@/lib/utils";
import { getCompanyToday } from "@/lib/services/companies";
import { createClient } from "@/lib/supabase/server";
import { getControlFinancials } from "@/lib/finance";
import type { Permissions } from "@/lib/permissions";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export type WaitingKind = "material_request" | "pricing_request" | "purchase_order" | "proposal" | "change_order" | "change_request";
export type WaitingItem = { kind: WaitingKind; id: string; label: string; href: string; waitingOn: string };
export type TimelineItem = { kind: string; refType: string; refId: string; label: string; detail: string | null; actor: string | null; at: string; href: string | null };

const OPEN_PR = ["draft", "sent", "question_open", "responded"];
const OPEN_PO_STATUSES = ["pending_approval", "rejected", "approved", "sent", "received", "pending_document", "document_uploaded", "pending_review", "exception_requested"];

/** Everything on the project that is waiting on somebody, grouped by who has the next action. */
export async function getProjectWaiting(projectId: string, companyId: string): Promise<WaitingItem[]> {
  const supabase = await createClient();
  const [mr, pr, po, q, co, cr] = await Promise.all([
    supabase.from("material_requests").select("id, number, waiting_on").eq("project_id", projectId).eq("company_id", companyId).in("status", ["requested", "rejected"]),
    supabase.from("supply_quote_requests").select("id, number, waiting_on").eq("project_id", projectId).eq("company_id", companyId).in("status", OPEN_PR),
    supabase.from("purchase_orders").select("id, number, waiting_on").eq("project_id", projectId).eq("company_id", companyId).in("status", OPEN_PO_STATUSES),
    supabase.from("quotes").select("id, number, waiting_on").eq("project_id", projectId).eq("company_id", companyId).in("status", ["draft", "sent", "pending", "changes_requested"]),
    supabase.from("change_orders").select("id, number, quote_id, waiting_on").eq("project_id", projectId).eq("company_id", companyId).in("status", ["draft", "sent"]),
    supabase.from("change_requests").select("id, quote_id, requested_by_name").eq("project_id", projectId).eq("company_id", companyId).eq("status", "open"),
  ]);
  for (const r of [mr, pr, po, q, co, cr]) if (r.error) throw r.error;
  const out: WaitingItem[] = [];
  for (const r of mr.data ?? []) out.push({ kind: "material_request", id: r.id, label: r.number, href: `/projects/${projectId}/materials/${r.id}`, waitingOn: r.waiting_on });
  for (const r of pr.data ?? []) out.push({ kind: "pricing_request", id: r.id, label: r.number ?? "", href: `/pricing/${r.id}`, waitingOn: r.waiting_on });
  for (const r of po.data ?? []) out.push({ kind: "purchase_order", id: r.id, label: r.number, href: `/pos/${r.id}`, waitingOn: r.waiting_on });
  for (const r of q.data ?? []) out.push({ kind: "proposal", id: r.id, label: r.number, href: `/quotes/${r.id}`, waitingOn: r.waiting_on });
  for (const r of co.data ?? []) out.push({ kind: "change_order", id: r.id, label: r.number, href: `/quotes/${r.quote_id}`, waitingOn: r.waiting_on });
  for (const r of cr.data ?? []) out.push({ kind: "change_request", id: r.id, label: r.requested_by_name ?? "", href: `/quotes/${r.quote_id}`, waitingOn: "owner" });
  return out.filter((i) => i.waitingOn && i.waitingOn !== "none");
}

const HREFS: Record<string, (projectId: string, id: string) => string> = {
  material_request: (p, id) => `/projects/${p}/materials/${id}`,
  pricing_request: (_p, id) => `/pricing/${id}`,
  purchase_order: (_p, id) => `/pos/${id}`,
  proposal: (_p, id) => `/quotes/${id}`,
  change_order: () => "",
};

/** Latest events of the project, assembled from real records (no amounts). RLS decides what the caller may see. */
export async function getProjectTimeline(projectId: string, companyId: string, limit = 25): Promise<TimelineItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_timeline").select("kind, ref_type, ref_id, label, actor_id, detail, occurred_at")
    .eq("project_id", projectId).eq("company_id", companyId).not("occurred_at", "is", null).order("occurred_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of profiles ?? []) names.set(p.id as string, (p.full_name as string) ?? "");
  }
  return rows.map((r) => ({
    kind: r.kind as string, refType: r.ref_type as string, refId: r.ref_id as string, label: (r.label as string) ?? "", detail: r.detail as string | null,
    actor: r.actor_id ? names.get(r.actor_id as string) || null : null, at: r.occurred_at as string,
    href: HREFS[r.ref_type as string] ? HREFS[r.ref_type as string](projectId, r.ref_id as string) || null : null,
  }));
}

/**
 * Money of one project from the shared view. Returns null when the person cannot view costs; profit fields
 * are dropped without "view profit". Nothing is stored: it is always computed from expenses and POs.
 */
export async function getProjectMoney(projectId: string, companyId: string, contractValue: number, budgetTotal: number, perms: Permissions) {
  if (!perms.can_view_costs) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_cost_summary").select("actual_cost, committed_cost, pending_approval_cost, open_po_count").eq("project_id", projectId).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  const actual = Number(data?.actual_cost ?? 0), committed = Number(data?.committed_cost ?? 0);
  const f = getControlFinancials({ contractValue, budgetTotal, actualCost: actual, committedCost: committed });
  return {
    contractValue, budgetTotal, actualCost: actual, committedCost: committed, pendingApprovalCost: Number(data?.pending_approval_cost ?? 0), openPoCount: Number(data?.open_po_count ?? 0),
    forecastCost: f.forecastCost, budgetRemaining: f.budgetRemaining, budgetUsage: f.budgetUsage, overBudget: f.overBudget, nearBudget: f.nearBudget,
    ...(perms.can_view_profit ? { estimatedProfit: f.estimatedProfit, estimatedMargin: f.estimatedMargin } : {}),
  };
}
export type ProjectMoney = NonNullable<Awaited<ReturnType<typeof getProjectMoney>>> & { estimatedProfit?: number; estimatedMargin?: number };

// ---------------------------------------------------------------------------
// Needs Attention (Home)
// ---------------------------------------------------------------------------

export type AttentionItem = { id: string; titleKey: string; params: Record<string, string>; href: string; waitingOn: string; severity: "high" | "normal"; sort: number };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * What needs the person's action today, from live records: reviews and decisions for Owner/Manager;
 * rejections and missing documents for Employees. Every row links to the object.
 */
export async function getNeedsAttention(ctx: { companyId: string; userId: string; role: string; perms: Permissions }): Promise<AttentionItem[]> {
  const supabase = await createClient();
  const reviewer = ctx.role === "owner" || ctx.role === "manager";
  const items: AttentionItem[] = [];
  const add = (i: Omit<AttentionItem, "sort"> & { sort?: number }) => items.push({ ...i, sort: i.sort ?? 0 });
  // "Today" is the company's own date, not the server's (UTC).
  const today = new Date(`${await getCompanyToday(ctx.companyId)}T00:00:00Z`);
  const tomorrow = isoDay(new Date(today.getTime() + 86400000));
  const soon = isoDay(new Date(today.getTime() + 3 * 86400000));

  if (reviewer) {
    const [mr, pr, po, cr, qs, ex, projects] = await Promise.all([
      supabase.from("material_requests").select("id, number, project_id, created_at, project:projects(name)").eq("company_id", ctx.companyId).eq("status", "requested").order("created_at").limit(8),
      supabase.from("supply_quote_requests").select("id, number, status, response_due_date").eq("company_id", ctx.companyId).in("status", ["draft", "sent", "question_open", "responded"]).limit(60),
      supabase.from("purchase_orders").select("id, number, status, vendor_name, created_at, expected_delivery").eq("company_id", ctx.companyId).in("status", ["pending_approval", "received", "pending_document", "approved", "sent"]).order("created_at").limit(20),
      supabase.from("change_requests").select("id, quote_id, requested_by_name, created_at").eq("company_id", ctx.companyId).eq("status", "open").order("created_at").limit(8),
      supabase.from("quotes").select("id, number, valid_until").eq("company_id", ctx.companyId).in("status", ["sent", "pending"]).not("valid_until", "is", null).lte("valid_until", soon).limit(8),
      supabase.from("expenses").select("id, vendor_name").eq("company_id", ctx.companyId).eq("status", "pending_review").order("created_at").limit(8),
      ctx.perms.can_view_costs ? supabase.from("projects").select("id, name, budget_total").eq("company_id", ctx.companyId).gt("budget_total", 0).in("status", ["approved", "active"]) : Promise.resolve({ data: [] as { id: string; name: string; budget_total: number }[], error: null }),
    ]);
    for (const r of mr.data ?? []) add({ id: `mr-${r.id}`, titleKey: "attnMR", params: { number: r.number as string, project: (one(r.project as { name: string } | { name: string }[] | null)?.name) ?? "" }, href: `/projects/${r.project_id}/materials/${r.id}`, waitingOn: "owner", severity: "normal", sort: 3 });
    for (const r of pr.data ?? []) {
      const due = r.response_due_date as string | null;
      if (r.status === "responded") add({ id: `prr-${r.id}`, titleKey: "attnPRResponded", params: { number: r.number as string }, href: `/pricing/${r.id}`, waitingOn: "owner", severity: "high", sort: 1 });
      else if (r.status === "question_open") add({ id: `prq-${r.id}`, titleKey: "attnPRQuestion", params: { number: r.number as string }, href: `/pricing/${r.id}`, waitingOn: "owner", severity: "high", sort: 1 });
      if (due && r.status !== "responded" && due <= tomorrow) {
        const key = due < isoDay(today) ? "attnPROverdue" : due === isoDay(today) ? "attnPRDueToday" : "attnPRDueTomorrow";
        add({ id: `prd-${r.id}`, titleKey: key, params: { number: r.number as string }, href: `/pricing/${r.id}`, waitingOn: r.status === "draft" ? "owner" : "supplier", severity: key === "attnPRDueTomorrow" ? "normal" : "high", sort: key === "attnPRDueTomorrow" ? 2 : 0 });
      }
    }
    for (const r of po.data ?? []) {
      if (r.status === "pending_approval") add({ id: `poa-${r.id}`, titleKey: "attnPOApprove", params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}`, waitingOn: "owner", severity: "high", sort: 1 });
      else if (r.status === "approved" || r.status === "sent") {
        const d = r.expected_delivery as string | null;
        if (d && d <= tomorrow) {
          const key = d < isoDay(today) ? "attnPODeliveryLate" : d === isoDay(today) ? "attnPODeliveryToday" : "attnPODeliveryTomorrow";
          add({ id: `pol-${r.id}`, titleKey: key, params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}`, waitingOn: "supplier", severity: key === "attnPODeliveryTomorrow" ? "normal" : "high", sort: 0 });
        }
      }
      else add({ id: `pod-${r.id}`, titleKey: "attnPODoc", params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}`, waitingOn: "employee", severity: "normal", sort: 4 });
    }
    for (const r of cr.data ?? []) add({ id: `cr-${r.id}`, titleKey: "attnChange", params: { name: (r.requested_by_name as string) || "" }, href: `/quotes/${r.quote_id}`, waitingOn: "owner", severity: "high", sort: 1 });
    for (const r of ex.data ?? []) add({ id: `ex-${r.id}`, titleKey: "attnExpense", params: { vendor: (r.vendor_name as string) || "—" }, href: `/expenses/${r.id}`, waitingOn: "owner", severity: "normal", sort: 4 });
    for (const r of qs.data ?? []) add({ id: `qe-${r.id}`, titleKey: "attnProposalExpiring", params: { number: r.number as string, date: r.valid_until as string }, href: `/quotes/${r.id}`, waitingOn: "customer", severity: "normal", sort: 5 });

    // Money owed: approved proposals not yet fully billed, and invoices past their due date.
    const [approved, late] = await Promise.all([
      supabase.from("quotes").select("id, number, total").eq("company_id", ctx.companyId).eq("status", "approved").order("created_at", { ascending: false }).limit(30),
      supabase.from("invoices").select("id, number, total, amount_paid, due_date").eq("company_id", ctx.companyId).in("status", ["sent", "partial", "overdue"]).lt("due_date", isoDay(today)).order("due_date").limit(8),
    ]);
    const approvedIds = (approved.data ?? []).map((q) => q.id as string);
    if (approvedIds.length) {
      const { data: billed } = await supabase.from("invoices").select("quote_id, total, status").eq("company_id", ctx.companyId).in("quote_id", approvedIds);
      const sums = new Map<string, number>();
      for (const b of billed ?? []) if (b.status !== "cancelled") sums.set(b.quote_id as string, (sums.get(b.quote_id as string) ?? 0) + Number(b.total));
      for (const q of approved.data ?? []) {
        const left = Math.round((Number(q.total) - (sums.get(q.id as string) ?? 0)) * 100) / 100;
        if (left > 0.01 && Number(q.total) > 0) add({ id: `bill-${q.id}`, titleKey: "attnBillProposal", params: { number: q.number as string, amount: formatCurrency(left) }, href: `/invoices/new?quoteId=${q.id}`, waitingOn: "owner", severity: "normal", sort: 3 });
      }
    }
    for (const i of late.data ?? []) {
      const owed = Math.round((Number(i.total) - Number(i.amount_paid ?? 0)) * 100) / 100;
      if (owed > 0.01) add({ id: `inv-${i.id}`, titleKey: "attnInvoiceOverdue", params: { number: i.number as string, amount: formatCurrency(owed), date: i.due_date as string }, href: `/invoices/${i.id}`, waitingOn: "customer", severity: "high", sort: 2 });
    }

    if (ctx.perms.can_view_costs && (projects.data ?? []).length) {
      const ids = (projects.data ?? []).map((p) => p.id as string);
      const { data: sums } = await supabase.from("project_cost_summary").select("project_id, actual_cost, committed_cost").in("project_id", ids);
      const bySum = new Map((sums ?? []).map((s) => [s.project_id as string, Number(s.actual_cost) + Number(s.committed_cost)]));
      for (const p of projects.data ?? []) {
        if ((bySum.get(p.id as string) ?? 0) > Number(p.budget_total)) add({ id: `ob-${p.id}`, titleKey: "attnOverBudget", params: { project: p.name as string }, href: `/projects/${p.id}`, waitingOn: "owner", severity: "high", sort: 2 });
      }
    }
  } else {
    const [mr, po] = await Promise.all([
      supabase.from("material_requests").select("id, number, project_id, review_note").eq("company_id", ctx.companyId).eq("requested_by", ctx.userId).eq("status", "rejected").limit(8),
      supabase.from("purchase_orders").select("id, number, status, vendor_name").eq("company_id", ctx.companyId).eq("created_by", ctx.userId).in("status", ["rejected", "received", "pending_document"]).limit(10),
    ]);
    for (const r of mr.data ?? []) add({ id: `mrr-${r.id}`, titleKey: "attnMRRejected", params: { number: r.number as string }, href: `/projects/${r.project_id}/materials/${r.id}`, waitingOn: "employee", severity: "high", sort: 1 });
    for (const r of po.data ?? []) {
      if (r.status === "rejected") add({ id: `por-${r.id}`, titleKey: "attnPORejected", params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}`, waitingOn: "employee", severity: "high", sort: 1 });
      else add({ id: `pod-${r.id}`, titleKey: "attnPODoc", params: { number: r.number as string, vendor: r.vendor_name as string }, href: `/pos/${r.id}`, waitingOn: "employee", severity: "normal", sort: 3 });
    }
  }
  return items.sort((a, b) => (a.severity === b.severity ? a.sort - b.sort : a.severity === "high" ? -1 : 1)).slice(0, 12);
}
