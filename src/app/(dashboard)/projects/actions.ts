"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClientRecord } from "@/lib/services/clients";
import { createProject, updateProject, archiveProject } from "@/lib/services/projects";
import { logActivity } from "@/lib/services/activity";
import { errCodeOf, getContext } from "@/lib/action-helpers";

const PROJECT_STATUSES = ["lead", "quoted", "approved", "active", "on_hold", "completed", "cancelled"] as const;

// Returns `errorCode` values that the client translates through i18n.
export async function createProjectAction(formData: FormData) {
  let newProjectId = "";
  try {
    const { userId, companyId, role } = await getContext();
    if (role !== "owner" && role !== "manager") return { errorCode: "errGeneric" };
    const name = String(formData.get("name") || "").trim();
    let clientId = String(formData.get("clientId") || "");
    const newClientName = String(formData.get("newClientName") || "").trim();
    const money = (key: string) => Math.max(0, Number(formData.get(key) || 0) || 0);
    const status = String(formData.get("status") || "lead");

    if (!name || (!clientId && !newClientName)) return { errorCode: "errProjectRequired" };

    if (!clientId || clientId === "new") {
      const client = await createClientRecord(companyId, { name: newClientName });
      clientId = client.id;
    }

    const project = await createProject(companyId, {
      client_id: clientId,
      name,
      description: String(formData.get("description") || "").trim() || undefined,
      address: String(formData.get("address") || "").trim() || undefined,
      status: (PROJECT_STATUSES as readonly string[]).includes(status) ? (status as (typeof PROJECT_STATUSES)[number]) : "lead",
      contract_value: money("contractValue"),
      budget_materials: money("budgetMaterials"),
      budget_labor: money("budgetLabor"),
      budget_subcontractors: money("budgetSubcontractors"),
      budget_other: money("budgetOther"),
      start_date: String(formData.get("startDate") || "") || undefined,
    });

    await logActivity({
      companyId,
      userId,
      action: "create",
      entityType: "project",
      entityId: project.id,
      newValues: { name },
    }).catch(() => undefined);
    newProjectId = project.id as string;
  } catch (err) {
    return { errorCode: errCodeOf(err) };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  // The new project is the anchor of everything else: land on it.
  redirect(`/projects/${newProjectId}`);
}

export async function updateProjectAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await updateProject(String(formData.get("id") || ""), companyId, { name: String(formData.get("name") || "").trim(), description: String(formData.get("description") || "").trim(), address: String(formData.get("address") || "").trim(), status: String(formData.get("status") || "lead"), contract_value: Number(formData.get("contractValue") || 0) });
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${String(formData.get("id") || "")}`);
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}

export async function archiveProjectAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await archiveProject(String(formData.get("id") || ""), companyId);
    revalidatePath("/projects");
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}
