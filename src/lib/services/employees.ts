import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "./usage";
import { createNotification } from "./notifications";

export async function getEmployees(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      id, role, is_active, joined_at, invited_at,
      profile:profiles(id, full_name, email, avatar_url, phone)
    `
    )
    .eq("company_id", companyId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function inviteEmployee(
  companyId: string,
  invitedByUserId: string,
  data: {
    email: string;
    fullName: string;
    role: "manager" | "employee";
  }
) {
  // Check employee limit
  const limit = await checkLimit(companyId, "employees");
  if (!limit.allowed) {
    throw new Error(
      "Has alcanzado el límite de empleados del plan Free. Actualiza a Pro."
    );
  }

  const supabase = await createClient();

  // Check if already a member
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", data.email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error("Este usuario ya es miembro de la empresa.");
    }
  }

  // For now we create a pending invite record.
  // Full invite-by-email with magic link requires Supabase inviteUserByEmail
  // or a custom invite token flow.

  // Simplified: if profile exists, add as member; otherwise store invite intent
  if (existingProfile) {
    const { data: member, error } = await supabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: existingProfile.id,
        role: data.role,
        is_active: true,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await createNotification({
      companyId,
      userId: existingProfile.id,
      title: "Te han agregado a una empresa",
      body: `Ahora eres ${data.role} en la empresa.`,
      type: "member_added",
    });

    return member;
  }

  // Profile doesn't exist yet — in production send invite email via Supabase
  // For now throw a clear message
  throw new Error(
    "El usuario debe registrarse primero con ese email. Luego podrás agregarlo."
  );
}

export async function updateMemberRole(
  companyId: string,
  memberId: string,
  role: "manager" | "employee"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", memberId)
    .eq("company_id", companyId)
    .neq("role", "owner"); // cannot change owner

  if (error) throw error;
}

export async function deactivateMember(companyId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .update({ is_active: false })
    .eq("id", memberId)
    .eq("company_id", companyId)
    .neq("role", "owner");

  if (error) throw error;
}
