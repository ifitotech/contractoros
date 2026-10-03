"use server";

import { createClient } from "@/lib/supabase/server";
import { createCompanyWithOwner } from "@/lib/services/companies";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Error codes are translated on the client through the i18n dictionaries.
export type AuthResult = { error?: string; errorCode?: string; successCode?: string } | undefined;

/** Where auth emails and OAuth return to: the configured site URL, else the address the person is using right now (never localhost in production). */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const INVITE_TOKEN = /^[a-f0-9]{64}$/;

export async function registerAction(formData: FormData): Promise<AuthResult> {
  const inviteToken = String(formData.get("invite") || "");
  if (inviteToken) return registerInvitedAction(formData, inviteToken);

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || undefined;
  const accountKind = String(formData.get("accountKind") || "") === "supply" ? "supply" : "contractor";

  if (!email || !password || !fullName || !companyName) return { errorCode: "errMissingFields" };
  if (password.length < 8) return { errorCode: "errPasswordShort" };
  if (!hasSupabaseEnv()) return { errorCode: "errNoSupabase" };

  const supabase = await createClient();

  // 1. Auth user. Company data travels in the user metadata so the company can
  //    still be created on first login when email confirmation is required.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, company_name: companyName, phone: phone ?? "", account_kind: accountKind },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });

  if (authError) {
    if (/already registered|already exists/i.test(authError.message)) return { errorCode: "errEmailExists" };
    return { errorCode: "errGeneric" };
  }
  if (!authData.user) return { errorCode: "errGeneric" };

  // Supabase hides duplicate emails when confirmation is on by returning a user
  // with no identities.
  if (authData.user.identities && authData.user.identities.length === 0) return { errorCode: "errEmailExists" };

  // No session: email confirmation is enabled. The company is created on first login.
  if (!authData.session) return { successCode: "checkEmailToConfirm" };

  // 2. Profile + company + owner membership + settings + Free plan + categories (atomic, RLS-safe).
  try {
    await createCompanyWithOwner({ fullName, companyName, phone, kind: accountKind });
  } catch {
    // The account exists and is signed in; the company is retried from metadata on the next request.
    return { errorCode: "errCompanyCreate" };
  }

  redirect(accountKind === "supply" ? "/supply" : "/dashboard");
}

// Invited people join the inviting company; no company of their own is created.
async function registerInvitedAction(formData: FormData, inviteToken: string): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();

  if (!INVITE_TOKEN.test(inviteToken)) return { errorCode: "inviteInvalid" };
  if (!email || !password || !fullName) return { errorCode: "errMissingFields" };
  if (password.length < 8) return { errorCode: "errPasswordShort" };
  if (!hasSupabaseEnv()) return { errorCode: "errNoSupabase" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, invite_token: inviteToken },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { errorCode: "errEmailExists" };
    return { errorCode: "errGeneric" };
  }
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) return { errorCode: "errEmailExists" };
  // Email confirmation on: the invitation is accepted on first sign-in (see getCurrentMember).
  if (!data.session) return { successCode: "checkEmailToConfirm" };

  const { error: acceptError } = await supabase.rpc("accept_invitation", { p_token: inviteToken });
  if (acceptError) return { errorCode: /mismatch/.test(acceptError.message) ? "inviteWrongEmail" : "inviteInvalid" };
  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { errorCode: "errMissingFields" };
  if (!hasSupabaseEnv()) return { errorCode: "errNoSupabase" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) return { errorCode: "errInvalidCredentials" };
    return { errorCode: "errGeneric" };
  }

  // Coming from an invitation link: go back to it so it can be accepted.
  const invite = String(formData.get("invite") || "");
  if (INVITE_TOKEN.test(invite)) redirect(`/invite/${invite}`);
  const next = String(formData.get("next") || "");
  // Only a path inside this app: never another site, never the login screens themselves.
  if (/^\/(?!\/)[A-Za-z0-9\-_/.?=&%#]{0,300}$/.test(next) && !/^\/(login|register|forgot-password|reset-password)\b/.test(next)) redirect(next);
  redirect("/dashboard");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) return { errorCode: "errGoogleSignIn" };
  if (data.url) redirect(data.url);
  return { errorCode: "errGoogleSignIn" };
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { errorCode: "errEmailRequired" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/reset-password`,
  });

  if (error) return { errorCode: "errGeneric" };
  return { successCode: "resetEmailSent" };
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { errorCode: "errPasswordShort" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { errorCode: "errGeneric" };
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
