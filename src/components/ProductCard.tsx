import Link from "next/link";
import { VerifiedBadge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { formatNumber, loc, priceRange } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export type ProductCardData = {
  id: string; name_en: string; name_ar: string; moq: number; unit_code: string; price_min: number | null; price_max: number | null;
  currency_code: string; origin_country: string;
  product_images: Array<{ storage_path: string; sort_order: number }>;
  companies: { name: string; name_ar: string | null; verification_status: string } | null;
};

export function ProductCard({ p, t, locale, unitLabel, countryLabel }: {
  p: ProductCardData; t: Dictionary; locale: Locale; unitLabel: string; countryLabel: string;
}) {
  const img = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return (
    <Link href={`/${locale}/products/${p.id}`} className="card group flex flex-col overflow-hidden transition hover:border-navy-300 hover:shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl(img.storage_path)!} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-slate-300">
            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" /></svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 font-medium text-navy-900 group-hover:text-navy-700">{loc(locale, p.name_ar, p.name_en)}</p>
        <p className="mt-2 text-sm font-semibold text-charcoal tabular-nums">
          {priceRange(p.price_min, p.price_max, p.currency_code, locale) ?? <span className="font-normal text-slate-500">{t.product.priceOnRequest}</span>}
          {(p.price_min != null || p.price_max != null) && <span className="text-xs font-normal text-slate-500"> / {unitLabel}</span>}
        </p>
        <p className="mt-1 text-xs text-slate-500">{t.product.moqShort}: {formatNumber(p.moq, locale)} {unitLabel} · {countryLabel}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="truncate text-xs text-slate-600">{loc(locale, p.companies?.name_ar, p.companies?.name)}</span>
          {p.companies?.verification_status === "approved" && <VerifiedBadge label={t.company.verified} />}
        </div>
      </div>
    </Link>
  );
}
