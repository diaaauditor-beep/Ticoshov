import type { Locale } from "@/i18n/config";

const tag = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

export function formatMoney(amount: number | string | null | undefined, currency: string | null | undefined, locale: Locale) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!currency) return formatNumber(n, locale);
  try {
    return new Intl.NumberFormat(tag(locale), { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${formatNumber(n, locale)} ${currency}`;
  }
}

export function formatNumber(n: number | string | null | undefined, locale: Locale) {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 2 }).format(Number(n));
}

export function formatDate(value: string | Date | null | undefined, locale: Locale, withTime = false) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(tag(locale), {
    year: "numeric", month: "short", day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function priceRange(min: number | null, max: number | null, currency: string, locale: Locale) {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${formatMoney(min, currency, locale)} – ${formatMoney(max, currency, locale)}`;
  return formatMoney((min ?? max)!, currency, locale);
}

/** Pick the localized variant of a bilingual field, falling back to the other language. */
export function loc(locale: Locale, ar: string | null | undefined, en: string | null | undefined) {
  return (locale === "ar" ? ar || en : en || ar) ?? "";
}

export function bytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** ISO date `days` from now (request-time; used by dynamic server components). */
export function isoDateFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
/** ISO timestamp `days` ago. */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
