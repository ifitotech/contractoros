"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentMember, requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { createClientRecord } from "@/lib/services/clients";
import { updateClientRecord, archiveClient } from "@/lib/services/clients";
import { createProject, updateProject, archiveProject } from "@/lib/services/projects";
import { createExpense } from "@/lib/services/expenses";
import { createPurchaseOrder } from "@/lib/services/purchase-orders";
import { createQuote, updateQuoteStatus } from "@/lib/services/quotes";
import { createInvoice, recordInvoicePayment, updateInvoiceStatus } from "@/lib/services/invoices";
import { clockIn, clockOut } from "@/lib/services/time-entries";
import { uploadDocument } from "@/lib/services/documents";
import { markAsRead, markAllAsRead } from "@/lib/services/notifications";
import { getCompanyPlan, getUsage } from "@/lib/services/usage";
import { logActivity } from "@/lib/services/activity";
import { inviteEmployee } from "@/lib/services/employees";
import { updateMemberRole, deactivateMember } from "@/lib/services/employees";

async function getContext() {
  const user = await requireAuth();
  const member = await getCurrentMember();
  if (!member?.company_id) {
    throw new Error("No perteneces a ninguna empresa");
  }
  return {
    userId: user.id,
    companyId: member.company_id as string,
    role: member.role as string,
  };
}

export async function updateCompanyAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    const companyId = member.company_id as string;
    const supabase = (await import("@/lib/supabase/server")).createClient;
    const client = await supabase();
    const logo = formData.get("logo");
    let logoUrl: string | undefined;
    if (logo instanceof File && logo.size > 0) {
      if (logo.size > 5 * 1024 * 1024) return { error: "El logo no puede superar 5 MB." };
      if (!logo.type.startsWith("image/")) return { error: "El logo debe ser una imagen." };
      const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/company-logo-${Date.now()}.${extension}`;
      const upload = await client.storage.from("documents").upload(path, logo, { upsert: true, contentType: logo.type });
      if (upload.error) return { error: upload.error.message };
      logoUrl = path;
    }
    const { error } = await client.from("companies").update({
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      currency: String(formData.get("currency") || "USD"),
      timezone: String(formData.get("timezone") || "America/New_York"),
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", companyId);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { success: "Datos guardados correctamente." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron guardar los datos." };
  }
}

export async function updateProfileAction(formData: FormData) {
  try {
    const user = await requireAuth();
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({
      full_name: String(formData.get("fullName") || "").trim() || null,
      phone: String(formData.get("profilePhone") || "").trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { success: "Perfil guardado correctamente." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar el perfil." };
  }
}

export async function inviteEmployeeAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    const user = await requireAuth();
    const result = await inviteEmployee(member.company_id as string, user.id, {
      email: String(formData.get("email") || "").trim(),
      fullName: String(formData.get("fullName") || "").trim(),
      role: String(formData.get("role") || "employee") as "manager" | "employee",
    });
    revalidatePath("/employees");
    return { success: true, id: result.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not invite employee." };
  }
}

export async function updateMemberRoleAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    await updateMemberRole(member.company_id as string, String(formData.get("memberId") || ""), String(formData.get("role") || "employee") as "manager" | "employee");
    revalidatePath("/employees");
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Could not update role." }; }
}

export async function deactivateMemberAction(formData: FormData) {
  try {
    const member = await requireRole(["owner"]);
    await deactivateMember(member.company_id as string, String(formData.get("memberId") || ""));
    revalidatePath("/employees");
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Could not deactivate employee." }; }
}

export async function createClientAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const name = formData.get("name") as string;
    if (!name?.trim()) return { error: "El nombre es obligatorio" };

    const client = await createClientRecord(companyId, {
      name: name.trim(),
      contact_name: (formData.get("contactName") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "client",
      entityId: client.id,
      newValues: { name },
    });

    revalidatePath("/clients");
    redirect("/clients");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear cliente";
    // Don't return error on redirect
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}

export async function updateClientAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    const id = String(formData.get("id") || "");
    if (!id) return { error: "Cliente inválido" };
    await updateClientRecord(id, companyId, { name: String(formData.get("name") || "").trim(), contact_name: String(formData.get("contactName") || "").trim(), email: String(formData.get("email") || "").trim(), phone: String(formData.get("phone") || "").trim(), address: String(formData.get("address") || "").trim(), notes: String(formData.get("notes") || "").trim() });
    revalidatePath("/clients");
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Error al actualizar cliente" }; }
}

export async function archiveClientAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await archiveClient(String(formData.get("id") || ""), companyId);
    revalidatePath("/clients");
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Error al archivar cliente" }; }
}

export async function createProjectAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const name = formData.get("name") as string;
    const clientId = formData.get("clientId") as string;
    const contractValue = Number(formData.get("contractValue") || 0);

    if (!name?.trim() || !clientId) {
      return { error: "Nombre y cliente son obligatorios" };
    }

    const project = await createProject(companyId, {
      client_id: clientId,
      name: name.trim(),
      description: (formData.get("description") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      contract_value: contractValue,
      budget_materials: Number(formData.get("budgetMaterials") || 0),
      budget_labor: Number(formData.get("budgetLabor") || 0),
      budget_subcontractors: Number(formData.get("budgetSubcontractors") || 0),
      budget_other: Number(formData.get("budgetOther") || 0),
    });

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "project",
      entityId: project.id,
      newValues: { name },
    });

    revalidatePath("/projects");
    redirect("/projects");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear proyecto";
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}

export async function createInvoiceAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const description = String(formData.get("description") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    if (!description || amount <= 0) return { error: "Description and amount are required." };
    const invoice = await createInvoice(companyId, userId, { number: String(formData.get("number") || `INV-${Date.now()}`), clientId: String(formData.get("clientId") || "") || undefined, dueDate: String(formData.get("dueDate") || "") || undefined, notes: String(formData.get("notes") || "") || undefined, items: [{ description, quantity: 1, unitPrice: amount }] });
    await logActivity({ companyId, userId, action: "create", entityType: "invoice", entityId: invoice.id, newValues: { number: invoice.number } });
    revalidatePath("/invoices");
    redirect("/invoices");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invoice.";
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}

export async function recordInvoicePaymentAction(formData: FormData) {
  try { const { companyId } = await getContext(); await recordInvoicePayment(String(formData.get("invoiceId") || ""), companyId, Number(formData.get("amount") || 0)); revalidatePath("/invoices"); revalidatePath(`/invoices/${String(formData.get("invoiceId") || "")}`); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not record payment." }; }
}

export async function updateInvoiceStatusAction(formData: FormData) {
  try { const { companyId } = await getContext(); const id = String(formData.get("invoiceId") || ""); await updateInvoiceStatus(id, companyId, String(formData.get("status") || "draft")); revalidatePath("/invoices"); revalidatePath(`/invoices/${id}`); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not update invoice status." }; }
}

export async function clockInAction(formData: FormData) {
  try { const { userId, companyId } = await getContext(); await clockIn(companyId, userId, String(formData.get("projectId") || "") || undefined); revalidatePath("/employees"); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not clock in." }; }
}

export async function clockOutAction(formData: FormData) {
  try { const { userId, companyId } = await getContext(); await clockOut(companyId, userId, String(formData.get("entryId") || "")); revalidatePath("/employees"); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not clock out." }; }
}

export async function uploadDocumentAction(formData: FormData) {
  try { const { userId, companyId } = await getContext(); const file = formData.get("file"); if (!(file instanceof File) || file.size === 0) return { error: "Select a file first." }; const doc = await uploadDocument({ companyId, userId, file, relatedType: String(formData.get("relatedType") || "company") as "project" | "quote" | "purchase_order" | "expense" | "client" | "company", relatedId: String(formData.get("relatedId") || companyId) }); revalidatePath("/files"); return { success: true, id: doc.id, name: doc.name };
  } catch (err) { return { error: err instanceof Error ? err.message : "Could not upload file." }; }
}

export async function markNotificationReadAction(formData: FormData) { try { const user = await requireAuth(); await markAsRead(String(formData.get("notificationId") || ""), user.id); revalidatePath("/notifications"); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not mark notification." }; } }
export async function markAllNotificationsReadAction() { try { const { userId, companyId } = await getContext(); await markAllAsRead(userId, companyId); revalidatePath("/notifications"); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not mark notifications." }; } }

export async function updateQuoteStatusAction(formData: FormData) {
  try { const { userId, companyId } = await getContext(); const quoteId = String(formData.get("quoteId") || ""); const status = String(formData.get("status") || "draft"); await updateQuoteStatus(quoteId, companyId, userId, status); revalidatePath("/quotes"); revalidatePath(`/quotes/${quoteId}`); return { success: true }; } catch (err) { return { error: err instanceof Error ? err.message : "Could not update quote." }; }
}

export async function updateProjectAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await updateProject(String(formData.get("id") || ""), companyId, { name: String(formData.get("name") || "").trim(), description: String(formData.get("description") || "").trim(), address: String(formData.get("address") || "").trim(), status: String(formData.get("status") || "lead"), contract_value: Number(formData.get("contractValue") || 0) });
    revalidatePath("/projects");
    revalidatePath(`/projects/${String(formData.get("id") || "")}`);
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Could not update project." }; }
}

export async function archiveProjectAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await archiveProject(String(formData.get("id") || ""), companyId);
    revalidatePath("/projects");
    return { success: true };
  } catch (err) { return { error: err instanceof Error ? err.message : "Could not archive project." }; }
}

export async function createExpenseAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const plan = await getCompanyPlan(companyId);
    const monthlyCount = await getUsage(companyId, "expenses_per_month");

    const categoryId = formData.get("categoryId") as string;
    const amount = Number(formData.get("amount") || 0);

    if (!categoryId || amount <= 0) {
      return { error: "Categoría y monto son obligatorios" };
    }

    const expense = await createExpense(
      companyId,
      userId,
      plan,
      monthlyCount,
      {
        project_id: (formData.get("projectId") as string) || undefined,
        vendor_name: (formData.get("vendorName") as string) || undefined,
        category_id: categoryId,
        amount,
        notes: (formData.get("notes") as string) || undefined,
        date: (formData.get("date") as string) || undefined,
      }
    );

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "expense",
      entityId: expense.id,
      newValues: { amount },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    redirect("/expenses");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear gasto";
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}

export async function createPOAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const projectId = formData.get("projectId") as string;
    const vendorName = formData.get("vendorName") as string;

    if (!projectId || !vendorName?.trim()) {
      return { error: "Proyecto y proveedor son obligatorios" };
    }

    const po = await createPurchaseOrder(companyId, userId, {
      project_id: projectId,
      vendor_name: vendorName.trim(),
      category: (formData.get("category") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      estimated_amount: Number(formData.get("estimatedAmount") || 0) || undefined,
    });

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "purchase_order",
      entityId: po.id,
      newValues: { number: po.number },
    });

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    redirect("/pos");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear PO";
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}

export async function createQuoteAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const plan = await getCompanyPlan(companyId);
    const monthlyQuoteCount = await getUsage(companyId, "quotes_per_month");
    const clientId = formData.get("clientId") as string;
    const rawItems = formData.get("items") as string;
    const items = JSON.parse(rawItems || "[]") as {
      description: string;
      quantity: number;
      unit_price: number;
      part_number?: string;
    }[];

    if (!clientId || items.length === 0 || items.some((item) => !item.description.trim())) {
      return { error: "Cliente y partidas son obligatorios" };
    }

    const quote = await createQuote(companyId, userId, plan, monthlyQuoteCount, {
      client_id: clientId,
      quote_type: String(formData.get("quoteType") || "complete") as "service" | "materials" | "plan_estimate" | "complete",
      project_id: (formData.get("projectId") as string) || undefined,
      items,
      terms: (formData.get("terms") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "quote",
      entityId: quote.id,
      newValues: { number: quote.number },
    });

    revalidatePath("/quotes");
    revalidatePath("/dashboard");
    redirect("/quotes");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear quote";
    if (message.includes("NEXT_REDIRECT")) throw err;
    return { error: message };
  }
}
