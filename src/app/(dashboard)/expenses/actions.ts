"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExpense } from "@/lib/services/expenses";
import { getCompanyPlan, getUsage } from "@/lib/services/usage";
import { logActivity } from "@/lib/services/activity";
import { getMyPermissions } from "@/lib/auth";
import { getContext } from "@/lib/action-helpers";

import { getActionContext } from "@/lib/action-context";
import { getExpenseReceiptUrl, setExpenseStatus } from "@/lib/services/expenses";

export type ExpenseResult = { errorCode?: string; success?: boolean; url?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(e: unknown): ExpenseResult {
  const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "";
  if (msg.includes("expense_needs_manager")) return { errorCode: "errPoNeedsManager" };
  if (msg.includes("expense_not_pending")) return { errorCode: "errNotOpen" };
  if (msg.includes("row-level security") || msg.includes("forbidden")) return { errorCode: "errForbidden" };
  return { errorCode: "errGeneric" };
}

async function ctx() {
  try { return await getActionContext(); } catch { return null; }
}

export async function reviewExpenseAction(id: string, decision: "approved" | "rejected"): Promise<ExpenseResult> {
  const c = await ctx();
  if (!c || !UUID.test(id) || (decision !== "approved" && decision !== "rejected")) return { errorCode: "errGeneric" };
  if (c.role !== "owner" && c.role !== "manager") return { errorCode: "errPoNeedsManager" };
  try { await setExpenseStatus(c.companyId, id, ["pending_review"], decision); revalidatePath("/expenses"); revalidatePath(`/expenses/${id}`); revalidatePath("/dashboard"); return { success: true }; } catch (e) { return fail(e); }
}

export async function cancelExpenseAction(id: string): Promise<ExpenseResult> {
  const c = await ctx();
  if (!c || !UUID.test(id)) return { errorCode: "errGeneric" };
  try { await setExpenseStatus(c.companyId, id, ["pending_review"], "cancelled"); revalidatePath("/expenses"); revalidatePath(`/expenses/${id}`); revalidatePath("/dashboard"); return { success: true }; } catch (e) { return fail(e); }
}

export async function getReceiptUrlAction(documentId: string): Promise<ExpenseResult> {
  const c = await ctx();
  if (!c || !UUID.test(documentId)) return { errorCode: "errGeneric" };
  try { return { success: true, url: await getExpenseReceiptUrl(c.companyId, documentId) }; } catch (e) { return fail(e); }
}

export async function createExpenseAction(formData: FormData): Promise<{ errorCode?: string; error?: string } | undefined> {
  try {
    const { userId, companyId, role } = await getContext();
    const perms = await getMyPermissions();
    // "Upload receipt" is a permission, not a role: nobody records costs without it (RLS enforces the same rule).
    if (!perms.can_upload_documents && role !== "owner") return { errorCode: "errForbidden" };
    const plan = await getCompanyPlan(companyId);
    const monthlyCount = await getUsage(companyId, "expenses_per_month");

    const categoryId = String(formData.get("categoryId") || "");
    const amount = Number(String(formData.get("amount") || "0").replace(",", "."));
    const projectId = String(formData.get("projectId") || "");
    if (!categoryId) return { errorCode: "errExpenseCategory" };
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return { errorCode: "errExpenseAmount" };

    const expense = await createExpense(companyId, userId, plan, monthlyCount, {
      project_id: projectId || undefined,
      vendor_name: String(formData.get("vendorName") || "").trim().slice(0, 160) || undefined,
      category_id: categoryId,
      amount,
      notes: String(formData.get("notes") || "").trim().slice(0, 1000) || undefined,
      date: String(formData.get("date") || "") || undefined,
      status: role === "owner" || role === "manager" ? "approved" : "pending_review",
    });

    const receipt = formData.get("receipt");
    let receiptFailed = false;
    if (receipt instanceof File && receipt.size > 0) {
      const { attachExpenseReceipt } = await import("@/lib/services/expenses");
      try { await attachExpenseReceipt(companyId, userId, expense.id, receipt); } catch { receiptFailed = true; }
    }

    await logActivity({ companyId, userId, action: "create", entityType: "expense", entityId: expense.id, newValues: { amount } });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    if (projectId) revalidatePath(`/projects/${projectId}`);
    redirect(`/expenses/${expense.id}${receiptFailed ? "?receipt=failed" : ""}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message || "Error al crear gasto";
    if (message.includes("NEXT_REDIRECT")) throw err;
    if (message.includes("row-level security")) return { errorCode: "errForbidden" };
    if (message.includes("límite")) return { errorCode: "errPlanLimit" };
    return { errorCode: "errGeneric" };
  }
}
