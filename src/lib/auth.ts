// Auth & company helpers
// Central place for session, membership and role checks

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("company_members")
    .select("*, company:companies(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return member;
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(allowed: UserRole[]) {
  const member = await getCurrentMember();
  if (!member || !allowed.includes(member.role as UserRole)) {
    throw new Error("Forbidden");
  }
  return member;
}

export function isOwner(role: string) {
  return role === "owner";
}

export function isManagerOrAbove(role: string) {
  return role === "owner" || role === "manager";
}

export function canViewFinancials(role: string) {
  return role === "owner" || role === "manager";
}

export function canManageEmployees(role: string) {
  return role === "owner";
}

export function canApproveExceptions(role: string) {
  return role === "owner" || role === "manager";
}
