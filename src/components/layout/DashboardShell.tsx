import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLink } from "./NavLink";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Viewer } from "@/lib/auth";

export type NavGroup = { title?: string; items: Array<{ href: string; label: string; badge?: number; exact?: boolean }> };

export function DashboardShell({ locale, t, viewer, nav, children, unread }: {
  locale: Locale; t: Dictionary; viewer: Viewer; nav: NavGroup[]; children: ReactNode; unread: number;
}) {
  const notifHref = `/${locale}/${viewer.isStaff ? "admin" : "dashboard"}/notifications`;
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-navy-900 bg-navy-950 text-navy-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-e lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-5">
          <Link href={`/${locale}`}><Logo locale={locale} inverted /></Link>
          <Link href={notifHref} className="relative rounded-md p-2 text-navy-200 hover:bg-white/10 lg:hidden" aria-label={t.nav.notifications}>
            <BellIcon />{unread > 0 && <span className="absolute top-1 end-1 size-2 rounded-full bg-brass-300" />}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:pb-6">
          {nav.map((g, gi) => (
            <div key={gi} className="flex gap-1 lg:mb-4 lg:flex-col lg:gap-0.5">
              {g.title && <p className="hidden px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-navy-400 uppercase lg:block">{g.title}</p>}
              {g.items.map((i) => <NavLink key={i.href} href={i.href} label={i.label} badge={i.badge} exact={i.exact} />)}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="truncate text-sm font-medium text-white">{viewer.profile.full_name || viewer.email}</p>
          <p className="truncate text-xs text-navy-400">{viewer.company?.name ?? t.enums.role[viewer.profile.role]}</p>
          <div className="mt-3 flex items-center justify-between">
            <Suspense><LanguageSwitcher locale={locale} label={t.common.switchLanguage} className="-ms-2 text-navy-200 hover:bg-white/10" /></Suspense>
            <form action="/auth/signout" method="post">
              <button className="rounded-md px-2 py-1.5 text-sm text-navy-200 hover:bg-white/10">{t.common.signOut}</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 items-center justify-end gap-2 border-b border-slate-200 bg-white px-6 lg:flex">
          <Link href={notifHref} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={t.nav.notifications}>
            <BellIcon />
            {unread > 0 && <span className="absolute -top-0.5 -end-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        </header>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <Suspense><LanguageSwitcher locale={locale} label={t.common.switchLanguage} className="text-slate-600" /></Suspense>
          <form action="/auth/signout" method="post"><button className="text-sm text-slate-600">{t.common.signOut}</button></form>
        </div>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
