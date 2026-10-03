import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { esc, formatMoney } from "@/lib/pdf/quote-template";

export interface InvoicePDFData {
  number: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  proposalNumber?: string;
  projectName?: string;
  company: { name: string; address?: string; phone?: string; email?: string };
  client: { name: string; contactName?: string; email?: string; address?: string };
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  total: number;
  amountPaid: number;
  notes?: string;
}

/** A clean printable invoice. Everything that comes from the database is escaped. */
export function buildInvoiceHTML(data: InvoicePDFData, t: (key: keyof Dictionary) => string = () => "", locale = "es"): string {
  const money = (n: number) => formatMoney(n, locale === "es" ? "es-US" : locale === "pt" ? "pt-BR" : "en-US");
  const balance = Math.max(0, data.total - data.amountPaid);
  const rows = data.items.map((i) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${esc(i.description)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${i.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${money(i.unitPrice)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${money(i.amount)}</td></tr>`).join("");
  return `<!DOCTYPE html>
<html lang="${esc(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t("invoiceWord"))} ${esc(data.number)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 40px; }
    .brand { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .meta { text-align: right; font-size: 13px; color: #64748b; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
    .totals { margin-top: 20px; margin-left: auto; width: 260px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .grand { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 8px; }
    .footer { margin-top: 48px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media (max-width: 600px) { body { padding: 20px; } .header { flex-direction: column; } .meta { text-align: left; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${esc(data.company.name)}</div>
      ${data.company.address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(data.company.address)}</div>` : ""}
      ${data.company.phone ? `<div style="font-size:13px;color:#64748b;">${esc(data.company.phone)}</div>` : ""}
      ${data.company.email ? `<div style="font-size:13px;color:#64748b;">${esc(data.company.email)}</div>` : ""}
    </div>
    <div class="meta">
      <div style="font-size:20px;font-weight:700;color:#0f172a;">${esc(t("invoiceWord").toUpperCase())}</div>
      <div>${esc(data.number)}</div>
      <div>${esc(t("qIssueDate"))}: ${esc(data.issueDate)}</div>
      ${data.dueDate ? `<div>${esc(t("dueDate"))}: ${esc(data.dueDate)}</div>` : ""}
      ${data.proposalNumber ? `<div>${esc(t("proposal"))}: ${esc(data.proposalNumber)}</div>` : ""}
    </div>
  </div>
  <div style="margin-bottom:28px;">
    <div class="label">${esc(t("qClient"))}</div>
    <div style="font-weight:600;">${esc(data.client.name)}</div>
    ${data.client.contactName ? `<div style="font-size:13px;">${esc(data.client.contactName)}</div>` : ""}
    ${data.client.email ? `<div style="font-size:13px;color:#64748b;">${esc(data.client.email)}</div>` : ""}
    ${data.client.address ? `<div style="font-size:13px;color:#64748b;">${esc(data.client.address)}</div>` : ""}
    ${data.projectName ? `<div style="font-size:13px;color:#64748b;margin-top:6px;">${esc(data.projectName)}</div>` : ""}
  </div>
  <table>
    <thead><tr><th>${esc(t("description"))}</th><th style="text-align:right;">${esc(t("quantity"))}</th><th style="text-align:right;">${esc(t("unitPrice"))}</th><th style="text-align:right;">${esc(t("amount"))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>${esc(t("total"))}</span><span>${money(data.total)}</span></div>
    ${data.amountPaid > 0 ? `<div class="row"><span>${esc(t("paid"))}</span><span>-${money(data.amountPaid)}</span></div>` : ""}
    <div class="row grand"><span>${esc(t("balance"))}</span><span>${money(balance)}</span></div>
  </div>
  ${data.notes ? `<div style="margin-top:32px;"><div class="label">${esc(t("notes"))}</div><div style="font-size:13px;">${esc(data.notes)}</div></div>` : ""}
  <div class="footer">${esc(t("pdfGeneratedWith"))} · ${esc(data.company.name)}</div>
</body>
</html>`;
}
