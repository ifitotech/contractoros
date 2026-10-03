import type { Dictionary } from "@/lib/i18n/dictionaries/es";
/**
 * Quote PDF data structure and HTML template generator.
 * Can be rendered with a library like @react-pdf/renderer or puppeteer later.
 * For now provides a clean printable HTML string.
 */

export interface QuotePDFData {
  number: string;
  issueDate: string;
  validUntil?: string;
  status: string;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  terms?: string;
  notes?: string;
}

export function formatMoney(n: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/** Everything that comes from the database is escaped: this HTML is served from the app's own origin. */
export function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildQuoteHTML(data: QuotePDFData, t: (key: keyof Dictionary) => string = () => "", locale = "es"): string {
  const money = (n: number) => formatMoney(n, locale === "es" ? "es-US" : locale === "pt" ? "pt-BR" : "en-US");
  const rows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${esc(item.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${money(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${money(item.amount)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${esc(locale)}">
<head>
  <meta charset="utf-8">
  <title>${esc(t("navQuotes"))} ${esc(data.number)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .brand { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .meta { text-align: right; font-size: 13px; color: #64748b; }
    .section { margin-bottom: 28px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
    .totals { margin-top: 20px; margin-left: auto; width: 240px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 8px; }
    .footer { margin-top: 48px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${esc(data.company.name)}</div>
      ${data.company.address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(data.company.address)}</div>` : ""}
      ${data.company.phone ? `<div style="font-size:13px;color:#64748b;">${esc(data.company.phone)}</div>` : ""}
    </div>
    <div class="meta">
      <div style="font-size:20px;font-weight:700;color:#0f172a;">${esc(t("navQuotes").toUpperCase())}</div>
      <div>${esc(data.number)}</div>
      <div>${esc(t("qIssueDate"))}: ${esc(data.issueDate)}</div>
      ${data.validUntil ? `<div>${esc(t("qValidUntil"))}: ${esc(data.validUntil)}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="label">${esc(t("qClient"))}</div>
    <div style="font-weight:600;">${esc(data.client.name)}</div>
    ${data.client.contactName ? `<div style="font-size:13px;">${esc(data.client.contactName)}</div>` : ""}
    ${data.client.email ? `<div style="font-size:13px;color:#64748b;">${esc(data.client.email)}</div>` : ""}
    ${data.client.address ? `<div style="font-size:13px;color:#64748b;">${esc(data.client.address)}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>${esc(t("description"))}</th>
        <th style="text-align:right;">${esc(t("quantity"))}</th>
        <th style="text-align:right;">${esc(t("unitPrice"))}</th>
        <th style="text-align:right;">${esc(t("amount"))}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>${esc(t("qSubtotal"))}</span><span>${money(data.subtotal)}</span></div>
    ${data.taxAmount > 0 ? `<div class="totals-row"><span>${esc(t("qTax"))}</span><span>${money(data.taxAmount)}</span></div>` : ""}
    ${data.discountAmount > 0 ? `<div class="totals-row"><span>${esc(t("qDiscount"))}</span><span>-${money(data.discountAmount)}</span></div>` : ""}
    <div class="totals-row grand"><span>${esc(t("qTotal"))}</span><span>${money(data.total)}</span></div>
  </div>

  ${data.terms ? `<div class="section" style="margin-top:32px;"><div class="label">${esc(t("terms"))}</div><div style="font-size:13px;">${esc(data.terms)}</div></div>` : ""}
  ${data.notes ? `<div class="section"><div class="label">${esc(t("notes"))}</div><div style="font-size:13px;">${esc(data.notes)}</div></div>` : ""}

  <div class="footer">
    ${esc(t("pdfGeneratedWith"))} · ${esc(data.company.name)}
  </div>
</body>
</html>`;
}
