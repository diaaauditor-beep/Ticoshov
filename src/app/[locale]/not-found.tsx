import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/i18n/config";

export default async function NotFound() {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(c) ? c : defaultLocale;
  const t = await getDictionary(locale);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-brass-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-navy-900">{t.errors.notFound}</h1>
      <p className="mt-2 max-w-md text-slate-600">{t.errors.notFoundText}</p>
      <Link href={`/${locale}`} className="btn btn-primary mt-6">{t.nav.home}</Link>
    </main>
  );
}
