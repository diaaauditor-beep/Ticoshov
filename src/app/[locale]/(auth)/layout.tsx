import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { resolveLocale } from "@/i18n/get-dictionary";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between bg-navy-950 p-10 text-white lg:flex">
        <Link href={`/${locale}`}><Logo locale={locale} inverted /></Link>
        <div>
          <p className="text-3xl leading-snug font-semibold">{t.common.tagline}</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-navy-300">{t.footer.about}</p>
        </div>
        <p className="text-xs text-navy-400">{t.landing.corridor}: {t.landing.corridorValue}</p>
      </aside>
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href={`/${locale}`} className="lg:hidden"><Logo locale={locale} /></Link>
          <span className="hidden lg:block" />
          <Suspense><LanguageSwitcher locale={locale} label={t.common.switchLanguage} className="text-slate-600 hover:bg-slate-100" /></Suspense>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
