"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/action-context";
import {
  addPricingAttachment, addSupplierContact, createSupplierWithContact, removeSupplierContact, setPrimarySupplierContact, answerSupplierQuestion, awardResponse, createSupplierInvitation, revokeSupplierInvitation, cancelPricingRequest, closePricingRequest, createPricingRequest, createSupplier,
  getAttachmentUrl, markMaterialRequestConverted, markPricingSent, recordSupplierResponse,
  type PricingInput, type ResponseInput,
} from "@/lib/services/pricing-requests";

export type PricingResult = { errorCode?: string; success?: boolean; id?: string; number?: string; url?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isReviewer = (role: string) => role === "owner" || role === "manager";

function fail(e: unknown): PricingResult {
  const msg = e instanceof Error ? e.message : "";
  const map: Record<string, string> = {
    request_empty: "errRequestEmpty", request_too_large: "errRequestTooLarge", request_not_pending: "errPricingNotOpen",
    supplier_required: "errSupplierRequired", invalid_email: "errInvalidEmail2", contact_exists: "errContactExists", contact_name_required: "errContactName", supply_not_connected: "errSupplyNotConnected", response_empty: "errResponseEmpty", file_type: "errFileType", file_size: "errFileSize", forbidden: "errForbidden",
  };
  return { errorCode: map[msg] ?? "errGeneric" };
}

async function ctx() {
  try { return await getActionContext(); } catch { return null; }
}

function refresh(id?: string) {
  revalidatePath("/pricing");
  if (id) revalidatePath(`/pricing/${id}`);
  revalidatePath("/materials/requests");
  revalidatePath("/dashboard");
}

export async function createPricingRequestAction(input: PricingInput): Promise<PricingResult> {
  const c = await ctx();
  if (!c) return { errorCode: "errGeneric" };
  if (!c.perms.can_create_pricing_request) return { errorCode: "errForbidden" };
  if (!input || !Array.isArray(input.lines)) return { errorCode: "errGeneric" };
  // A quote request always starts from a material list (the cart); there is no blank form.
  if (!input.materialRequestId) return { errorCode: "errPricingNeedsList" };
  if (input.projectId && !UUID.test(input.projectId)) return { errorCode: "errGeneric" };
  if (input.materialRequestId && !UUID.test(input.materialRequestId)) return { errorCode: "errGeneric" };
  if (input.bidDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.bidDate)) return { errorCode: "errGeneric" };
  try {
    const result = await createPricingRequest(c.companyId, c.userId, { ...input, lines: input.lines.slice(0, 301) });
    // Employees cannot change the Material Request; owners/managers hand it off in the same step.
    if (input.materialRequestId && isReviewer(c.role)) await markMaterialRequestConverted(c.companyId, input.materialRequestId).catch(() => undefined);
    refresh(result.id);
    return { success: true, id: result.id, number: result.number };
  } catch (e) { return fail(e); }
}

export async function createSupplierAction(name: string): Promise<PricingResult> {
  const c = await ctx();
  if (!c) return { errorCode: "errGeneric" };
  if (!c.perms.can_create_pricing_request) return { errorCode: "errForbidden" };
  try { return { success: true, id: await createSupplier(c.companyId, c.userId, String(name ?? "")) }; } catch (e) { return fail(e); }
}

export async function createSupplierWithContactAction(input: { name: string; contactName: string; email?: string; phone?: string }): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !isReviewer(c.role)) return { errorCode: "errForbidden" };
  try {
    const id = await createSupplierWithContact(c.companyId, c.userId, { name: String(input?.name ?? ""), contact: { name: String(input?.contactName ?? ""), email: input?.email ?? null, phone: input?.phone ?? null } });
    revalidatePath("/suppliers");
    return { success: true, id };
  } catch (e) { return fail(e); }
}

export async function addSupplierContactAction(supplierId: string, input: { name: string; email?: string; phone?: string }): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !isReviewer(c.role) || !UUID.test(supplierId)) return { errorCode: "errForbidden" };
  try { await addSupplierContact(c.companyId, c.userId, supplierId, { name: String(input?.name ?? ""), email: input?.email ?? null, phone: input?.phone ?? null }); revalidatePath("/suppliers"); return { success: true }; } catch (e) { return fail(e); }
}

export async function removeSupplierContactAction(contactId: string): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !isReviewer(c.role) || !UUID.test(contactId)) return { errorCode: "errForbidden" };
  try { await removeSupplierContact(c.companyId, contactId); revalidatePath("/suppliers"); return { success: true }; } catch (e) { return fail(e); }
}

export async function setPrimaryContactAction(supplierId: string, contactId: string): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !isReviewer(c.role) || !UUID.test(supplierId) || !UUID.test(contactId)) return { errorCode: "errForbidden" };
  try { await setPrimarySupplierContact(c.companyId, supplierId, contactId); revalidatePath("/suppliers"); return { success: true }; } catch (e) { return fail(e); }
}

async function reviewerAction(requestId: string, fn: (companyId: string, userId: string) => Promise<unknown>): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !UUID.test(requestId)) return { errorCode: "errGeneric" };
  if (!isReviewer(c.role)) return { errorCode: "errForbidden" };
  try { await fn(c.companyId, c.userId); refresh(requestId); return { success: true }; } catch (e) { return fail(e); }
}

export async function markSentAction(requestId: string): Promise<PricingResult> {
  return reviewerAction(requestId, (co) => markPricingSent(co, requestId));
}
export async function closeRequestAction(requestId: string): Promise<PricingResult> {
  return reviewerAction(requestId, (co) => closePricingRequest(co, requestId));
}
export async function cancelPricingAction(requestId: string): Promise<PricingResult> {
  return reviewerAction(requestId, (co) => cancelPricingRequest(co, requestId));
}

export async function awardResponseAction(requestId: string, responseId: string): Promise<PricingResult> {
  if (!UUID.test(responseId)) return { errorCode: "errGeneric" };
  return reviewerAction(requestId, (co) => awardResponse(co, requestId, responseId));
}

export async function recordResponseAction(requestId: string, input: ResponseInput): Promise<PricingResult> {
  if (!input || !Array.isArray(input.lines)) return { errorCode: "errGeneric" };
  if (input.supplierId && !UUID.test(input.supplierId)) return { errorCode: "errGeneric" };
  if (input.expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)) return { errorCode: "errGeneric" };
  return reviewerAction(requestId, (co, user) => recordSupplierResponse(co, user, requestId, { ...input, lines: input.lines.slice(0, 301) }));
}

export async function addAttachmentAction(formData: FormData): Promise<PricingResult> {
  const requestId = String(formData.get("requestId") ?? "");
  const file = formData.get("file");
  const responseId = String(formData.get("responseId") ?? "");
  if (!(file instanceof File) || file.size === 0) return { errorCode: "errGeneric" };
  if (responseId && !UUID.test(responseId)) return { errorCode: "errGeneric" };
  return reviewerAction(requestId, (co, user) => addPricingAttachment(co, user, requestId, file, responseId || null));
}

export async function getAttachmentUrlAction(attachmentId: string): Promise<PricingResult> {
  const c = await ctx();
  if (!c || !UUID.test(attachmentId)) return { errorCode: "errGeneric" };
  try { return { success: true, url: await getAttachmentUrl(c.companyId, attachmentId) }; } catch (e) { return fail(e); }
}

export async function createSupplierLinkAction(requestId: string, input: { supplierId?: string | null; supplierName: string; supplierEmail?: string | null; days?: number; viaAccount?: boolean }): Promise<PricingResult & { token?: string | null }> {
  const c = await ctx();
  if (!c || !UUID.test(requestId)) return { errorCode: "errGeneric" };
  if (!isReviewer(c.role)) return { errorCode: "errForbidden" };
  if (input?.supplierId && !UUID.test(input.supplierId)) return { errorCode: "errGeneric" };
  try {
    const token = await createSupplierInvitation(c.companyId, c.userId, requestId, input);
    refresh(requestId);
    return { success: true, token };
  } catch (e) { return fail(e); }
}

export async function revokeSupplierLinkAction(requestId: string, invitationId: string): Promise<PricingResult> {
  if (!UUID.test(invitationId)) return { errorCode: "errGeneric" };
  return reviewerAction(requestId, (co) => revokeSupplierInvitation(co, requestId, invitationId));
}

export async function answerQuestionAction(requestId: string, invitationId: string, body: string): Promise<PricingResult> {
  if (!UUID.test(invitationId)) return { errorCode: "errGeneric" };
  return reviewerAction(requestId, async (co) => {
    const { getCurrentProfile } = await import("@/lib/auth");
    const profile = await getCurrentProfile().catch(() => null);
    await answerSupplierQuestion(co, requestId, invitationId, profile?.fullName ?? "", String(body ?? ""));
  });
}
