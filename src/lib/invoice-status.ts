import type { Dictionary } from "@/lib/i18n/dictionaries/es";

const KEYS: Record<string, keyof Dictionary> = { draft: "invStDraft", sent: "invStSent", partial: "invStPartial", paid: "invStPaid", overdue: "invStOverdue", cancelled: "invStCancelled" };

export function invoiceStatusKey(status: string): keyof Dictionary {
  return KEYS[status] ?? "invStDraft";
}

/** "Overdue" is not stored: a sent or partly paid invoice past its due date with a balance shows as overdue. */
export function effectiveInvoiceStatus(status: string, dueDate: string | null | undefined, total: number, paid: number, today = new Date().toISOString().slice(0, 10)): string {
  if ((status === "sent" || status === "partial") && dueDate && dueDate < today && Number(total) - Number(paid) > 0.005) return "overdue";
  return status;
}
