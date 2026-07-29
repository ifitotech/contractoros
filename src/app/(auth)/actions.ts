"use server";

import { createClient } from "@/lib/supabase/server";
import { createCompanyWithOwner } from "@/lib/services/companies";
import { redirect } from "next/navigation";

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const companyName = formData.get("companyName") as string;
  const phone = (formData.get("phone") as string) || undefined;

  if (!email || !password || !fullName || !companyName) {
    return { error: "Todos los campos obligatorios deben completarse." };
  }

  const supabase = await createClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "No se pudo crear el usuario." };
  }

  // Supabase returns no session when email confirmation is enabled.
  // Do not attempt company creation until the user is authenticated.
  if (!authData.session) {
    return { success: "Cuenta creada. Confirma tu email y luego inicia sesión." };
  }

  // 2. Create company + owner membership + defaults
  try {
    await createCompanyWithOwner({
      userId: authData.user.id,
      fullName,
      email,
      companyName,
      phone,
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "We could not create the company.";
    return { error: message };
  }

  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "No se pudo iniciar sesión con Google." };
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "El email es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: "Revisa tu correo para continuar." };
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
