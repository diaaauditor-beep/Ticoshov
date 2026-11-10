import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = request.cookies.get("NEXT_LOCALE")?.value;
  return NextResponse.redirect(new URL(`/${isLocale(locale) ? locale : "ar"}`, request.url), { status: 303 });
}
