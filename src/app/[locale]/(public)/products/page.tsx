import type { Metadata } from "next";
import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { getReference, options, unitName, countryName } from "@/lib/reference";
import { cleanQuery, pageOf, sp } from "@/lib/search";
import { EmptyState, Pagination, PageHeader } from "@/components/ui/primitives";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { loc } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };
const PAGE = 24;

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/products">) {
  const { locale, t } = await resolveLocale(params);
  const s = await searchParams;
  const ref = await getReference();
  const o = options(ref, locale);
  const supabase = await createClient();

  const q = cleanQuery(s.q);
  const category = sp(s.category);
  const country = sp(s.country);
  const minPrice = Number(sp(s.min)) || null;
  const maxPrice = Number(sp(s.max)) || null;
  const maxMoq = Number(sp(s.moq)) || null;
  const exportTo = sp(s.export_to);
  const sort = ["newest", "price_asc", "price_desc", "moq_asc"].includes(sp(s.sort)) ? sp(s.sort) : "newest";
  const page = pageOf(s.page);

  let query = supabase.from("products")
    .select("id, name_en, name_ar, moq, unit_code, price_min, price_max, currency_code, origin_country, product_images(storage_path, sort_order), companies!inner(name, name_ar, verification_status)", { count: "exact" })
    .eq("status", "published");

  if (q) {
    // supplier-name matches are folded into the product search
    const { data: matchCompanies } = await supabase.from("companies").select("id")
      .or(`name.ilike.%${q}%,name_ar.ilike.%${q}%`).eq("kind", "supplier").limit(50);
    const ids = (matchCompanies ?? []).map((c) => c.id);
    const ors = [`name_en.ilike.%${q}%`, `name_ar.ilike.%${q}%`, `sku.ilike.%${q}%`, `description_en.ilike.%${q}%`, `description_ar.ilike.%${q}%`];
    if (ids.length) ors.push(`company_id.in.(${ids.join(",")})`);
    query = query.or(ors.join(","));
  }
  if (category && /^[0-9a-f-]{36}$/.test(category)) {
    const ids = [category, ...ref.categories.filter((c) => c.parent_id === category).map((c) => c.id)];
    query = query.in("category_id", ids);
  }
  if (/^[A-Z]{2}$/.test(country)) query = query.eq("origin_country", country);
  if (minPrice != null) query = query.or(`price_max.gte.${minPrice},and(price_max.is.null,price_min.gte.${minPrice})`);
  if (maxPrice != null) query = query.lte("price_min", maxPrice);
  if (maxMoq != null) query = query.lte("moq", maxMoq);
  if (/^[A-Z]{2}$/.test(exportTo)) query = query.eq("export_available", true).contains("export_countries", [exportTo]);
  if (sp(s.export) === "1") query = query.eq("export_available", true);
  query = sort === "price_asc" ? query.order("price_min", { ascending: true, nullsFirst: false })
    : sort === "price_desc" ? query.order("price_max", { ascending: false, nullsFirst: false })
    : sort === "moq_asc" ? query.order("moq", { ascending: true })
    : query.order("published_at", { ascending: false, nullsFirst: false });
  const { data: products, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (typeof v === "string" && v && k !== "page") u.set(k, v);
    u.set("page", String(p));
    return `/${locale}/products?${u}`;
  };
  const sortOpts = (["newest", "price_asc", "price_desc", "moq_asc"] as const).map((k) => ({ value: k, label: t.product.sort[k] }));

  return (
    <div>
      <PageHeader title={t.product.searchTitle} description={`${count ?? 0} ${t.common.results}`} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form className="card h-fit space-y-4 p-4" method="get">
          <div><label className="label" htmlFor="q">{t.common.search}</label>
            <input id="q" name="q" defaultValue={q} className="input" placeholder={t.common.searchPlaceholder} /></div>
          <div><label className="label" htmlFor="category">{t.common.category}</label>
            <select id="category" name="category" defaultValue={category} className="input">
              <option value="">{t.common.all}</option>
              {o.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></div>
          <div><label className="label" htmlFor="country">{t.product.origin}</label>
            <select id="country" name="country" defaultValue={country} className="input">
              <option value="">{t.common.all}</option>
              {o.allCountries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="min">{t.product.minPrice}</label><input id="min" name="min" type="number" min={0} step="any" defaultValue={sp(s.min)} className="input" /></div>
            <div><label className="label" htmlFor="max">{t.product.maxPrice}</label><input id="max" name="max" type="number" min={0} step="any" defaultValue={sp(s.max)} className="input" /></div>
          </div>
          <div><label className="label" htmlFor="moq">{t.product.maxMoq}</label><input id="moq" name="moq" type="number" min={0} step="any" defaultValue={sp(s.moq)} className="input" /></div>
          <div><label className="label" htmlFor="export_to">{t.product.exportCountries}</label>
            <select id="export_to" name="export_to" defaultValue={exportTo} className="input">
              <option value="">{t.common.any}</option>
              {o.allCountries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="export" value="1" defaultChecked={sp(s.export) === "1"} className="size-4 rounded" />{t.product.exportOnly}</label>
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.81a.75.75 0 0 0-1.22-.88l-3.48 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.14-.09l4-5.5Z" clipRule="evenodd" /></svg>
            {t.product.verifiedOnly}
          </p>
          <div><label className="label" htmlFor="sort">{t.common.sortBy}</label>
            <select id="sort" name="sort" defaultValue={sort} className="input">{sortOpts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1">{t.common.apply}</button>
            <Link href={`/${locale}/products`} className="btn btn-secondary">{t.common.reset}</Link>
          </div>
        </form>
        <div>
          {category && <p className="mb-3 text-sm text-slate-500">{t.common.category}: <strong className="text-navy-900">{loc(locale, ref.categories.find((c) => c.id === category)?.name_ar, ref.categories.find((c) => c.id === category)?.name_en)}</strong></p>}
          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(products as unknown as ProductCardData[]).map((p) => (
                <ProductCard key={p.id} p={p} t={t} locale={locale} unitLabel={unitName(ref, p.unit_code, locale)} countryLabel={countryName(ref, p.origin_country, locale)} />
              ))}
            </div>
          ) : (
            <EmptyState title={t.product.noResults} description={t.product.noResultsText}
              action={<Link href={`/${locale}/dashboard/rfqs/new`} className="btn btn-primary">{t.nav.newRfq}</Link>} />
          )}
          <Pagination page={page} pageCount={pageCount} hrefFor={qs} labels={{ prev: t.common.prev, next: t.common.next, page: t.common.page }} />
        </div>
      </div>
    </div>
  );
}
