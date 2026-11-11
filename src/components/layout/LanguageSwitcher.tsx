"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function LanguageSwitcher({ locale, label, className = "" }: { locale: "ar" | "en"; label: string; className?: string }) {
  const pathname = usePathname() || `/${locale}`;
  const search = useSearchParams();
  const target = locale === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  const qs = search.toString();
  return (
    <Link href={`/${target}${rest}${qs ? `?${qs}` : ""}`} hrefLang={target} lang={target}
      className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm font-medium sm:px-2.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden" aria-hidden>{target === "ar" ? "ع" : "EN"}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Link>
  );
}
