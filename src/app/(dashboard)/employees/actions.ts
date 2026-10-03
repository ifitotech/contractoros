"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { inviteEmployee, updateMemberRole, updateMemberPermissions, setMemberActive, revokeInvitation, assignProjectMember, unassignProjectMember } from "@/lib/services/employees";
import { INVITE_TEMPLATES, PERMISSION_KEYS, PERMISSION_TEMPLATES, isTemplate, type PermissionTemplate, type Permissions } from "@/lib/permissions";
import { getContext } from "@/lib/action-helpers";

// ---- Team & permissions (Phase 2). Owner only; RLS enforces it again in the database. ----

type TeamResult = { success?: boolean; token?: string; errorCode?: string };

function teamError(err: unknown): TeamResult {
  const raw = err instanceof Error ? err.message : (err as { message?: string })?.message || "";
  if (raw.includes("employee_limit")) return { errorCode: "errEmployeeLimit" };
  if (raw.includes("invalid_email")) return { errorCode: "errInvalidEmail" };
  if (raw.includes("owner_membership_protected") || raw.includes("owner_role_cannot")) return { errorCode: "errOwnerProtected" };
  if (raw.includes("forbidden") || raw.includes("row-level security")) return { errorCode: "errForbidden" };
  return { errorCode: "errGeneric" };
}

export async function inviteEmployeeAction(formData: FormData): Promise<TeamResult> {
  try {
    const member = await requireRole(["owner"]);
    const template = String(formData.get("template") || "employee_basic");
    if (!(INVITE_TEMPLATES as readonly string[]).includes(template)) return { errorCode: "errGeneric" };
    const token = await inviteEmployee(member.company_id as string, {
      email: String(formData.get("email") || "").trim(),
      fullName: String(formData.get("fullName") || "").trim(),
      role: template === "manager" ? "manager" : "employee",
      template: template as PermissionTemplate,
    });
    revalidatePath("/employees");
    return { success: true, token };
  } catch (err) {
    return teamError(err);
  }
}

export async function revokeInvitationAction(formData: FormData): Promise<TeamResult> {
  try {
    const member = await requireRole(["owner"]);
    await revokeInvitation(member.company_id as string, String(formData.get("invitationId") || ""));
    revalidatePath("/employees");
    return { success: true };
  } catch (err) { return teamError(err); }
}

export async function updateMemberRoleAction(formData: FormData): Promise<TeamResult> {
  try {
    const member = await requireRole(["owner"]);
    const user = await requireAuth();
    const role = String(formData.get("role") || "employee") === "manager" ? "manager" : "employee";
    await updateMemberRole(member.company_id as string, String(formData.get("memberId") || ""), role, user.id);
    revalidatePath("/employees");
    return { success: true };
  } catch (err) { return teamError(err); }
}

export async function updateMemberPermissionsAction(formData: FormData): Promise<TeamResult> {
  try {
    await requireRole(["owner"]);
    const user = await requireAuth();
    const memberId = String(formData.get("memberId") || "");
    const perms = { ...PERMISSION_TEMPLATES.employee_basic } as Permissions;
    for (const key of PERMISSION_KEYS) perms[key] = formData.get(key) === "on";
    const limitRaw = String(formData.get("po_limit") || "").trim();
    const limit = limitRaw === "" ? null : Number(limitRaw);
    if (limit !== null && (!Number.isFinite(limit) || limit < 0)) return { errorCode: "errGeneric" };
    perms.po_limit = limit;
    // Permissions that make no sense without creating POs are switched off with it.
    if (!perms.can_create_po) { perms.can_send_po = false; perms.po_limit = null; }
    const template = String(formData.get("template") || "");
    await updateMemberPermissions(memberId, user.id, perms, isTemplate(template) ? template : null);
    revalidatePath("/employees");
    revalidatePath(`/employees/${memberId}`);
    return { success: true };
  } catch (err) { return teamError(err); }
}

export async function setMemberActiveAction(formData: FormData): Promise<TeamResult> {
  try {
    await requireRole(["owner"]);
    const memberId = String(formData.get("memberId") || "");
    await setMemberActive(memberId, formData.get("active") === "true");
    revalidatePath("/employees");
    revalidatePath(`/employees/${memberId}`);
    return { success: true };
  } catch (err) { return teamError(err); }
}

export async function setProjectAssignmentAction(formData: FormData): Promise<TeamResult> {
  try {
    const { companyId, role } = await getContext();
    if (role !== "owner" && role !== "manager") return { errorCode: "errForbidden" };
    const projectId = String(formData.get("projectId") || "");
    const userId = String(formData.get("userId") || "");
    if (formData.get("assigned") === "true") await assignProjectMember(projectId, userId);
    else await unassignProjectMember(projectId, userId);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/employees");
    void companyId;
    return { success: true };
  } catch (err) { return teamError(err); }
}

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  let failed = false;
  try {
    await requireAuth();
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) failed = true;
  } catch { failed = true; }
  if (failed) redirect(`/invite/${encodeURIComponent(token)}?error=1`);
  redirect("/dashboard");
}
