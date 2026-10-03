"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createQuote } from "@/lib/services/quotes";
import { getCompanyPlan, getUsage } from "@/lib/services/usage";
import { logActivity } from "@/lib/services/activity";
import { getContext } from "@/lib/action-helpers";

export async function createQuoteAction(formData: FormData): Promise<{ errorCode?: string; error?: string } | undefined> {
  try {
    const { userId, companyId, role } = await getContext();
    if (role !== "owner" && role !== "manager") return { errorCode: "errForbidden" };
    const plan = await getCompanyPlan(companyId);
    const monthlyQuoteCount = await getUsage(companyId, "quotes_per_month");
    const clientId = String(formData.get("clientId") || "");
    const projectId = String(formData.get("projectId") || "");
    let items: { description: string; quantity: number; unit_price: number; part_number?: string }[] = [];
    try { items = JSON.parse(String(formData.get("items") || "[]")); } catch { return { errorCode: "errProposalLines" }; }
    const taxRate = Number(String(formData.get("taxRate") || "0").replace(",", ".") || 0);

    if (!clientId) return { errorCode: "errClientRequired" };
    if (!Array.isArray(items) || items.length === 0 || items.some((item) => !String(item.description || "").trim() || !(Number(item.quantity) > 0) || !Number.isFinite(Number(item.unit_price)))) {
      return { errorCode: "errProposalLines" };
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return { errorCode: "errGeneric" };
    // Sizes that make no sense are refused here, with a clear message, instead of failing later in the database.
    if (items.length > 300 || items.some((i) => String(i.description).length > 300 || Number(i.quantity) > 10_000_000 || Math.abs(Number(i.unit_price)) > 100_000_000)) return { errorCode: "errProposalLines" };
    const subtotal = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
    if (subtotal < 0) return { errorCode: "errProposalNegative" };
    const QUOTE_TYPES = ["service", "materials", "plan_estimate", "complete"];
    const rawType = String(formData.get("quoteType") || "complete");

    const quote = await createQuote(companyId, userId, plan, monthlyQuoteCount, {
      client_id: clientId,
      quote_type: (QUOTE_TYPES.includes(rawType) ? rawType : "complete") as "service" | "materials" | "plan_estimate" | "complete",
      project_id: projectId || undefined,
      items: items.map((i) => ({ ...i, description: String(i.description).trim(), quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      tax_rate: taxRate,
      terms: ((formData.get("terms") as string) || "").slice(0, 5000) || undefined,
      notes: ((formData.get("notes") as string) || "").slice(0, 5000) || undefined,
    });

    await logActivity({ companyId, userId, action: "create", entityType: "quote", entityId: quote.id, newValues: { number: quote.number } });

    revalidatePath("/quotes");
    revalidatePath("/dashboard");
    redirect(`/quotes/${quote.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message || "Error al crear quote";
    if (message.includes("NEXT_REDIRECT")) throw err;
    if (message.includes("row-level security")) return { errorCode: "errForbidden" };
    if (message.includes("límite")) return { errorCode: "errPlanLimit" };
    return { errorCode: "errGeneric" };
  }
}
