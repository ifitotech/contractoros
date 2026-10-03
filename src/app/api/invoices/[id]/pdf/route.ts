import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoiceHTML } from "@/lib/pdf/invoice-template";
import { getDictionary, locales, defaultLocale, type Locale } from "@/lib/i18n";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Row security limits this to invoices of the person's own company.
  const { data: inv, error } = await supabase.from("invoices")
    .select("*, client:clients(*), project:projects(name), quote:quotes(number), items:invoice_items(*), company:companies(*)")
    .eq("id", id).maybeSingle();
  if (error || !inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const i = inv as any;
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, string> | null;
  const lang = request.nextUrl.searchParams.get("lang") as Locale;
  const locale = locales.includes(lang) ? lang : defaultLocale;
  const dict = getDictionary(locale);
  const html = buildInvoiceHTML({
    number: i.number, issueDate: i.issue_date, dueDate: i.due_date ?? undefined, status: i.status,
    proposalNumber: one(i.quote)?.number ?? undefined, projectName: one(i.project)?.name ?? undefined,
    company: { name: i.company?.name ?? "", address: i.company?.address ?? undefined, phone: i.company?.phone ?? undefined, email: i.company?.email ?? undefined },
    client: { name: i.client?.name ?? "", contactName: i.client?.contact_name ?? undefined, email: i.client?.email ?? undefined, address: i.client?.address ?? undefined },
    items: (i.items ?? []).map((x: { description: string; quantity: number; unit_price: number; amount: number }) => ({ description: x.description, quantity: Number(x.quantity), unitPrice: Number(x.unit_price), amount: Number(x.amount) })),
    total: Number(i.total), amountPaid: Number(i.amount_paid ?? 0), notes: i.notes ?? undefined,
  }, (key) => dict[key], locale);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${String(i.number).replace(/[^A-Za-z0-9._-]/g, "_")}.html"`,
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
