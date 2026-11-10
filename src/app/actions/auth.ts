"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { str, valuesOf, type ActionState } from "@/lib/forms";
import { isLocale } from "@/i18n/config";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const localeOf = (fd: FormData) => (isLocale(str(fd, "locale")) ? str(fd, "locale") : "ar");
const safeNext = (v: string, locale: string) => (v.startsWith(`/${locale}/`) && !v.startsWith("//") ? v : `/${locale}/dashboard`);

const passwordSchema = z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/[0-9]/);

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!z.string().email().safeParse(email).success || !password) return { error: "invalidCredentials", values: { email } };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: errorKey(error), values: { email } };
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).single();
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "inactive", values: { email } };
  }
  const staff = profile?.role === "admin" || profile?.role === "operations";
  redirect(str(fd, "next") ? safeNext(str(fd, "next"), locale) : `/${locale}/${staff ? "admin" : "dashboard"}`);
}

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const values = valuesOf(fd);
  delete values.password;
  delete values.password_confirm;
  const role = str(fd, "role");
  const fullName = str(fd, "full_name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  if (role !== "supplier" && role !== "buyer") fieldErrors.role = "required";
  if (fullName.length < 2 || fullName.length > 120) fieldErrors.full_name = "required";
  if (!z.string().email().safeParse(email).success) fieldErrors.email = "invalid";
  if (!passwordSchema.safeParse(password).success) fieldErrors.password = "weakPassword";
  if (password !== String(fd.get("password_confirm") ?? "")) fieldErrors.password_confirm = "passwordMismatch";
  if (fd.get("terms") !== "on") return { error: "termsRequired", values };
  if (Object.keys(fieldErrors).length) return { error: Object.values(fieldErrors)[0], fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // role is restricted to supplier|buyer by the handle_new_user() database trigger
      // terms_accepted_at records click-wrap acceptance of the terms version shown at signup
      data: { role, full_name: fullName, locale, terms_accepted_at: new Date().toISOString() },
      emailRedirectTo: `${site()}/auth/confirm?next=/${locale}/onboarding`,
    },
  });
  if (error) return { error: errorKey(error), values };
  // Supabase returns a user with no identities when the email is already registered (anti-enumeration)
  if (data.user && data.user.identities && data.user.identities.length === 0) return { error: "emailTaken", values };
  if (data.session) redirect(`/${locale}/onboarding`);
  redirect(`/${locale}/register/check-email`);
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const email = str(fd, "email").toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "invalid", values: { email } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site()}/auth/confirm?next=/${locale}/reset-password`,
  });
  // Same response whether or not the account exists (no account enumeration)
  if (error && errorKey(error) === "rateLimited") return { error: "rateLimited" };
  return { ok: true };
}

export async function updatePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const password = String(fd.get("password") ?? "");
  if (!passwordSchema.safeParse(password).success) return { error: "weakPassword" };
  if (password !== String(fd.get("password_confirm") ?? "")) return { error: "passwordMismatch" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "forbidden" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: errorKey(error) };
  redirect(`/${locale}/dashboard?password=updated`);
}
