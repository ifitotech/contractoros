import { createClient } from "@/lib/supabase/server";

export type SearchHit = { id: string; group: "projects" | "clients" | "proposals" | "invoices" | "purchaseOrders" | "materialLists" | "quoteRequests" | "materials" | "suppliers"; title: string; subtitle: string | null; href: string };

/** Characters that mean something to the search filter are removed; what is left is matched as plain text. */
const clean = (q: string) => q.replace(/[%_,()\\"'*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

/**
 * One box for everything: projects, clients, proposals, invoices, purchase orders, material lists, quote requests,
 * library items and suppliers. Row security decides what each person can find; owners and managers also get money documents.
 */
export async function searchEverything(ctx: { companyId: string; role: string }, raw: string): Promise<SearchHit[]> {
  const q = clean(raw);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const supabase = await createClient();
  const reviewer = ctx.role === "owner" || ctx.role === "manager";
  const co = ctx.companyId;
  const none = Promise.resolve({ data: [] as Record<string, unknown>[] | null });
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as { name?: string } | null;

  const [pj, cl, qt, inv, po, mr, pr, mat, sp] = await Promise.all([
    supabase.from("projects").select("id, name, number, address").eq("company_id", co).or(`name.ilike.${like},number.ilike.${like},address.ilike.${like}`).limit(5),
    reviewer ? supabase.from("clients").select("id, name, contact_name").eq("company_id", co).or(`name.ilike.${like},contact_name.ilike.${like},email.ilike.${like}`).limit(5) : none,
    reviewer ? supabase.from("quotes").select("id, number, total, client:clients(name)").eq("company_id", co).ilike("number", like).limit(5) : none,
    reviewer ? supabase.from("invoices").select("id, number, total, client:clients(name)").eq("company_id", co).ilike("number", like).limit(5) : none,
    supabase.from("purchase_orders").select("id, number, vendor_name, project:projects(name)").eq("company_id", co).or(`number.ilike.${like},vendor_name.ilike.${like}`).limit(5),
    supabase.from("material_requests").select("id, number, project_id, project:projects(name)").eq("company_id", co).ilike("number", like).limit(5),
    reviewer ? supabase.from("supply_quote_requests").select("id, number, title, project:projects(name)").eq("company_id", co).or(`number.ilike.${like},title.ilike.${like}`).limit(5) : none,
    supabase.from("company_materials").select("id, description, catalog_number, manufacturer").eq("company_id", co).eq("is_active", true).or(`description.ilike.${like},catalog_number.ilike.${like}`).limit(5),
    reviewer ? supabase.from("suppliers").select("id, name").eq("company_id", co).eq("is_active", true).ilike("name", like).limit(5) : none,
  ]);

  const hits: SearchHit[] = [];
  for (const r of pj.data ?? []) hits.push({ id: `pj-${r.id}`, group: "projects", title: r.name as string, subtitle: [r.number, r.address].filter(Boolean).join(" · ") || null, href: `/projects/${r.id}` });
  for (const r of cl.data ?? []) hits.push({ id: `cl-${r.id}`, group: "clients", title: r.name as string, subtitle: (r.contact_name as string | null) ?? null, href: `/clients/${r.id}` });
  for (const r of qt.data ?? []) hits.push({ id: `qt-${r.id}`, group: "proposals", title: r.number as string, subtitle: one(r.client)?.name ?? null, href: `/quotes/${r.id}` });
  for (const r of inv.data ?? []) hits.push({ id: `inv-${r.id}`, group: "invoices", title: r.number as string, subtitle: one(r.client)?.name ?? null, href: `/invoices/${r.id}` });
  for (const r of po.data ?? []) hits.push({ id: `po-${r.id}`, group: "purchaseOrders", title: `${r.number} · ${r.vendor_name}`, subtitle: one(r.project)?.name ?? null, href: `/pos/${r.id}` });
  for (const r of mr.data ?? []) hits.push({ id: `mr-${r.id}`, group: "materialLists", title: r.number as string, subtitle: one(r.project)?.name ?? null, href: `/projects/${r.project_id}/materials/${r.id}` });
  for (const r of pr.data ?? []) hits.push({ id: `pr-${r.id}`, group: "quoteRequests", title: `${r.number}${r.title ? ` · ${r.title}` : ""}`, subtitle: one(r.project)?.name ?? null, href: `/pricing/${r.id}` });
  for (const r of mat.data ?? []) hits.push({ id: `mat-${r.id}`, group: "materials", title: r.description as string, subtitle: [r.manufacturer, r.catalog_number].filter(Boolean).join(" · ") || null, href: `/materials?q=${encodeURIComponent(q)}` });
  for (const r of sp.data ?? []) hits.push({ id: `sp-${r.id}`, group: "suppliers", title: r.name as string, subtitle: null, href: "/suppliers" });
  return hits;
}
