"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClientRecord } from "@/lib/services/clients";
import { updateClientRecord, archiveClient } from "@/lib/services/clients";
import { logActivity } from "@/lib/services/activity";
import { errCodeOf, getContext } from "@/lib/action-helpers";

export async function createClientAction(formData: FormData) {
  try {
    const { userId, companyId } = await getContext();
    const name = formData.get("name") as string;
    if (!name?.trim()) return { errorCode: "errNameRequired" };

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
    return { errorCode: errCodeOf(err) };
  }
}

export async function updateClientAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    const id = String(formData.get("id") || "");
    if (!id) return { errorCode: "errGeneric" };
    await updateClientRecord(id, companyId, { name: String(formData.get("name") || "").trim(), contact_name: String(formData.get("contactName") || "").trim(), email: String(formData.get("email") || "").trim(), phone: String(formData.get("phone") || "").trim(), address: String(formData.get("address") || "").trim(), notes: String(formData.get("notes") || "").trim() });
    revalidatePath("/clients");
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}

export async function archiveClientAction(formData: FormData) {
  try {
    const { companyId } = await getContext();
    await archiveClient(String(formData.get("id") || ""), companyId);
    revalidatePath("/clients");
    return { success: true };
  } catch (err) { return { errorCode: errCodeOf(err) }; }
}
