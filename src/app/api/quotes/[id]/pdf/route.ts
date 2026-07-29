import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteHTML, type QuotePDFData } from "@/lib/pdf/quote-template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      *,
      client:clients(*),
      items:quote_items(*),
      company:companies(*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quote as any;

  const pdfData: QuotePDFData = {
    number: q.number,
    issueDate: q.issue_date,
    validUntil: q.valid_until ?? undefined,
    status: q.status,
    company: {
      name: q.company?.name ?? "Empresa",
      address: q.company?.address ?? undefined,
      phone: q.company?.phone ?? undefined,
      email: q.company?.email ?? undefined,
    },
    client: {
      name: q.client?.name ?? "Cliente",
      contactName: q.client?.contact_name ?? undefined,
      email: q.client?.email ?? undefined,
      phone: q.client?.phone ?? undefined,
      address: q.client?.address ?? undefined,
    },
    items: (q.items ?? []).map(
      (item: {
        description: string;
        quantity: number;
        unit_price: number;
        amount: number;
      }) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        amount: Number(item.amount),
      })
    ),
    subtotal: Number(q.subtotal),
    taxAmount: Number(q.tax_amount),
    discountAmount: Number(q.discount_amount),
    total: Number(q.total),
    terms: q.terms ?? undefined,
    notes: q.notes ?? undefined,
  };

  const html = buildQuoteHTML(pdfData);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${q.number}.html"`,
    },
  });
}
