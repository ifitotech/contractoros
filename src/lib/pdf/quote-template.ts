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

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function buildQuoteHTML(data: QuotePDFData): string {
  const rows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatMoney(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatMoney(item.amount)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote ${data.number}</title>
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
      <div class="brand">${data.company.name}</div>
      ${data.company.address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${data.company.address}</div>` : ""}
      ${data.company.phone ? `<div style="font-size:13px;color:#64748b;">${data.company.phone}</div>` : ""}
    </div>
    <div class="meta">
      <div style="font-size:20px;font-weight:700;color:#0f172a;">QUOTE</div>
      <div>${data.number}</div>
      <div>Fecha: ${data.issueDate}</div>
      ${data.validUntil ? `<div>Válido hasta: ${data.validUntil}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="label">Cliente</div>
    <div style="font-weight:600;">${data.client.name}</div>
    ${data.client.contactName ? `<div style="font-size:13px;">${data.client.contactName}</div>` : ""}
    ${data.client.email ? `<div style="font-size:13px;color:#64748b;">${data.client.email}</div>` : ""}
    ${data.client.address ? `<div style="font-size:13px;color:#64748b;">${data.client.address}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:right;">Cant.</th>
        <th style="text-align:right;">Precio</th>
        <th style="text-align:right;">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${formatMoney(data.subtotal)}</span></div>
    ${data.taxAmount > 0 ? `<div class="totals-row"><span>Impuestos</span><span>${formatMoney(data.taxAmount)}</span></div>` : ""}
    ${data.discountAmount > 0 ? `<div class="totals-row"><span>Descuento</span><span>-${formatMoney(data.discountAmount)}</span></div>` : ""}
    <div class="totals-row grand"><span>Total</span><span>${formatMoney(data.total)}</span></div>
  </div>

  ${data.terms ? `<div class="section" style="margin-top:32px;"><div class="label">Términos</div><div style="font-size:13px;">${data.terms}</div></div>` : ""}
  ${data.notes ? `<div class="section"><div class="label">Notas</div><div style="font-size:13px;">${data.notes}</div></div>` : ""}

  <div class="footer">
    Generado con ContractorOS · ${data.company.name}
  </div>
</body>
</html>`;
}
