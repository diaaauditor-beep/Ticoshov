import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@/i18n/config";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export type Viewer = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  profile: Profile;
  company: Company | null;
  memberRole: Database["public"]["Enums"]["member_role"] | null;
  isStaff: boolean;
  isAdmin: boolean;
};

/** The signed-in user, verified against Supabase Auth (not just the cookie). Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  if (!profile) return null;
  const { data: membership } = await supabase
    .from("company_members")
    .select("member_role, companies(*)")
    .eq("user_id", auth.user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    emailConfirmed: Boolean(auth.user.email_confirmed_at),
    profile,
    company: (membership?.companies as Company | null) ?? null,
    memberRole: membership?.member_role ?? null,
    isStaff: profile.role === "admin" || profile.role === "operations",
    isAdmin: profile.role === "admin",
  };
});

export async function requireViewer(locale: Locale): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login`);
  if (!viewer.profile.is_active) redirect(`/${locale}/login?error=inactive`);
  return viewer;
}

/** Signed-in business user who has completed company onboarding. */
export async function requireCompany(locale: Locale): Promise<Viewer & { company: Company }> {
  const viewer = await requireViewer(locale);
  if (viewer.isStaff) redirect(`/${locale}/admin`);
  if (!viewer.company) redirect(`/${locale}/onboarding`);
  return viewer as Viewer & { company: Company };
}

export async function requireStaff(locale: Locale, adminOnly = false): Promise<Viewer> {
  const viewer = await requireViewer(locale);
  if (adminOnly ? !viewer.isAdmin : !viewer.isStaff) redirect(`/${locale}/dashboard`);
  return viewer;
}
