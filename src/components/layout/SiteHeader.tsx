import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getViewer } from "@/lib/auth";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export async function SiteHeader({ locale, t, variant = "light" }: { locale: Locale; t: Dictionary; variant?: "light" | "dark" }) {
  const viewer = await getViewer();
  const dark = variant === "dark";
  const links = [
    { href: `/${locale}/products`, label: t.nav.products },
    { href: `/${locale}/suppliers`, label: t.nav.suppliers },
    { href: `/${locale}#how`, label: t.nav.howItWorks },
    { href: `/${locale}#faq`, label: t.nav.faq },
  ];
  const linkCls = dark ? "text-navy-100 hover:text-white" : "text-slate-600 hover:text-navy-900";
  return (
    <header className={dark ? "bg-navy-950" : "border-b border-slate-200 bg-white"}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href={`/${locale}`} aria-label="TICOSHOV"><Logo locale={locale} inverted={dark} /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className={linkCls}>{l.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Suspense><LanguageSwitcher locale={locale} label={t.common.switchLanguage} className={dark ? "text-navy-100 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"} /></Suspense>
          {viewer ? (
            <Link href={`/${locale}/${viewer.isStaff ? "admin" : "dashboard"}`} className={dark ? "btn btn-accent btn-sm" : "btn btn-primary btn-sm"}>
              {viewer.isStaff ? t.common.admin : t.common.dashboard}
            </Link>
          ) : (
            <>
              <Link href={`/${locale}/login`} className={`hidden rounded-md px-3 py-1.5 text-sm font-semibold sm:inline-flex ${dark ? "text-white hover:bg-white/10" : "text-navy-900 hover:bg-slate-100"}`}>{t.common.signIn}</Link>
              <span className="max-[399px]:hidden"><Link href={`/${locale}/register`} className={dark ? "btn btn-accent btn-sm" : "btn btn-primary btn-sm"}>{t.common.signUp}</Link></span>
            </>
          )}
          <details className="relative md:hidden">
            <summary className={`list-none rounded-md p-2 ${dark ? "text-white" : "text-navy-900"}`} aria-label="menu">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <div className="absolute end-0 z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              {links.map((l) => <Link key={l.href} href={l.href} className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{l.label}</Link>)}
              {!viewer && <Link href={`/${locale}/login`} className="block rounded px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50">{t.common.signIn}</Link>}
              {!viewer && <Link href={`/${locale}/register`} className="block rounded px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50 min-[400px]:hidden">{t.common.signUp}</Link>}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
