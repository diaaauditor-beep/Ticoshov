import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";

/**
 * Handles links from Supabase Auth emails (sign-up confirmation, password recovery).
 * Supports both the PKCE `code` flow and the `token_hash` flow.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : "ar";
  const nextParam = url.searchParams.get("next") ?? "";
  // only allow same-site relative redirects
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : `/${locale}/dashboard`;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) return NextResponse.redirect(new URL(`/${locale}/login?error=link`, request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
