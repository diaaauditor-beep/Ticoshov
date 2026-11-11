import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { getReference, unitName, countryName, categoryName } from "@/lib/reference";
import { DL, Notice, VerifiedBadge } from "@/components/ui/primitives";
import { formatNumber, loc, priceRange } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[id]">) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("name_en, name_ar").eq("id", id).maybeSingle();
  return { title: data ? (locale === "ar" ? data.name_ar : data.name_en) : "Product" };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("products")
    .select("*, product_images(id, storage_path, sort_order), product_specifications(key_en, key_ar, value, sort_order), companies(id, slug, name, name_ar, city, country_code, business_type, verification_status, year_established, logo_path)")
    .eq("id", id).maybeSingle();
  if (!p) notFound();
  const [ref, viewer] = await Promise.all([getReference(), getViewer()]);
  const imgs = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const specs = [...p.product_specifications].sort((a, b) => a.sort_order - b.sort_order);
  const unit = unitName(ref, p.unit_code, locale);
  const c = p.companies;
  const description = loc(locale, p.description_ar, p.description_en);
  const rfqHref = viewer ? `/${locale}/dashboard/rfqs/new?product=${p.id}` : `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/rfqs/new?product=${p.id}`)}`;

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href={`/${locale}/products`} className="hover:underline">{t.nav.products}</Link> /{" "}
        <Link href={`/${locale}/products?category=${p.category_id}`} className="hover:underline">{categoryName(ref, p.category_id, locale)}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="card aspect-[4/3] overflow-hidden bg-slate-100">
            {imgs[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl(imgs[0].storage_path)!} alt={loc(locale, p.name_ar, p.name_en)} className="size-full object-cover" />
            ) : <div className="size-full" />}
          </div>
          {imgs.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {imgs.slice(1, 6).map((i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i.id} src={publicUrl(i.storage_path)!} alt="" className="aspect-square rounded-md border border-slate-200 object-cover" />
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">{loc(locale, p.name_ar, p.name_en)}</h1>
          {p.sku && <p className="mt-1 font-mono text-xs text-slate-500">SKU {p.sku}</p>}
          <div className="card mt-5 p-5">
            <p className="text-xs text-slate-500">{t.product.price}</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900 tabular-nums">
              {priceRange(p.price_min, p.price_max, p.currency_code, locale) ?? t.product.priceOnRequest}
              {(p.price_min != null || p.price_max != null) && <span className="text-sm font-normal text-slate-500"> / {unit}</span>}
            </p>
            <div className="mt-4">
              <DL items={[
                [t.product.moq, `${formatNumber(p.moq, locale)} ${unit}`],
                [t.product.available, p.available_quantity != null ? `${formatNumber(p.available_quantity, locale)} ${unit}` : "—"],
                [t.product.origin, countryName(ref, p.origin_country, locale)],
                [t.product.leadTime, p.lead_time_days != null ? `${p.lead_time_days} ${t.quote.days}` : "—"],
                [t.product.exportAvailable, p.export_available ? t.common.yes : t.common.no],
                [t.product.exportCountries, p.export_countries.length ? p.export_countries.map((x) => countryName(ref, x, locale)).join("، ") : "—"],
              ]} />
            </div>
            <Link href={rfqHref} className="btn btn-primary mt-5 w-full">{t.product.requestQuote}</Link>
            <p className="mt-3 text-xs leading-5 text-slate-500">{t.product.indicativeNote}</p>
          </div>
          {c && (
            <Link href={`/${locale}/companies/${c.slug}`} className="card mt-4 flex items-center gap-3 p-4 hover:border-navy-300">
              {c.logo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicUrl(c.logo_path)!} alt="" className="size-11 rounded-md border border-slate-200 object-contain" />
              ) : <span className="grid size-11 place-items-center rounded-md bg-navy-900 font-semibold text-brass-300">{c.name.charAt(0)}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{t.product.supplierInfo}</p>
                <p className="truncate font-semibold text-navy-900">{loc(locale, c.name_ar, c.name)}</p>
                <p className="text-xs text-slate-500">{t.enums.businessType[c.business_type as keyof typeof t.enums.businessType]} · {c.city}, {countryName(ref, c.country_code, locale)}</p>
              </div>
              {c.verification_status === "approved" && <VerifiedBadge label={t.company.verified} />}
            </Link>
          )}
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card card-pad">
          <h2 className="font-semibold text-navy-900">{t.common.details}</h2>
          <p className="mt-3 text-sm leading-7 whitespace-pre-line text-slate-700">{description || "—"}</p>
        </section>
        <section className="card card-pad">
          <h2 className="font-semibold text-navy-900">{t.product.specs}</h2>
          {specs.length ? (
            <table className="mt-3 w-full text-sm"><tbody>
              {specs.map((s, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <th className="w-2/5 py-2 text-start font-medium text-slate-500">{loc(locale, s.key_ar, s.key_en)}</th>
                  <td className="py-2 text-charcoal">{s.value}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <p className="mt-3 text-sm text-slate-500">—</p>}
        </section>
      </div>
      {p.status !== "published" && <div className="mt-6"><Notice>{t.enums.productStatus[p.status]}</Notice></div>}
    </div>
  );
}
