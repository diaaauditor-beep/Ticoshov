import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

function preferredLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = request.headers.get("accept-language") ?? "";
  if (/^\s*en\b/i.test(accept)) return "en";
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  // Locale prefix: every page lives under /ar or /en.
  if (!isLocale(first) && !pathname.startsWith("/auth/") && pathname !== "/files") {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  // Refresh the Supabase session cookie on every request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // Coarse gate for private areas. Real authorization is enforced by RLS in the database.
  const section = pathname.split("/")[2];
  if (!signedIn && (section === "dashboard" || section === "admin" || section === "onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${isLocale(first) ? first : defaultLocale}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isLocale(first) && request.cookies.get(LOCALE_COOKIE)?.value !== first) {
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
