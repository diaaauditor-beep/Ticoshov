/**
 * TICOSHOV logo concept: two trade nodes linked by an arc over a meridian —
 * a stylised globe/route mark expressing connection and global trade.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#0f1b33" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="#3e5888" strokeWidth="1.4" />
      <ellipse cx="20" cy="20" rx="5" ry="11.5" fill="none" stroke="#3e5888" strokeWidth="1.2" />
      <path d="M8.5 20h23" stroke="#3e5888" strokeWidth="1.2" />
      <path d="M11 25.5C15 14 25 14 29 25.5" fill="none" stroke="#d1b37f" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="11" cy="25.5" r="2.6" fill="#d1b37f" />
      <circle cx="29" cy="25.5" r="2.6" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ locale, inverted = false, className = "" }: { locale: "ar" | "en"; inverted?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={`text-[15px] font-bold tracking-[0.18em] ${inverted ? "text-white" : "text-navy-900"}`}>TICOSHOV</span>
        <span className={`mt-1 text-[11px] ${inverted ? "text-brass-200" : "text-brass-600"}`}>
          {locale === "ar" ? "تيكوشوف" : "Global B2B Trade"}
        </span>
      </span>
    </span>
  );
}
