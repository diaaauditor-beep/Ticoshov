import type { Metadata } from "next";
import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { getReference, options, countryName } from "@/lib/reference";
import { cleanQuery, pageOf, sp } from "@/lib/search";
import { EmptyState, PageHeader, Pagination, VerifiedBadge } from "@/components/ui/primitives";
import { loc } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Suppliers" };
const PAGE = 18;

export default async function SuppliersPage({ params, searchParams }: PageProps<"/[locale]/suppliers">) {
  const { locale, t } = await resolveLocale(params);
  const s = await searchParams;
  const ref = await getReference();
  const o = options(ref, locale);
  const supabase = await createClient();
  const q = cleanQuery(s.q);
  const country = sp(s.country);
  const category = sp(s.category);
  const type = sp(s.type);
  const page = pageOf(s.page);

  let query = supabase.from("companies")
    .select("id, slug, name, name_ar, city, country_code, business_type, logo_path, description, description_ar, year_established, export_markets, company_categories!left(category_id)", { count: "exact" })
    .eq("kind", "supplier").eq("verification_status", "approved").eq("is_active", true);
  if (q) query = query.or(`name.ilike.%${q}%,name_ar.ilike.%${q}%,city.ilike.%${q}%`);
  if (/^[A-Z]{2}$/.test(country)) query = query.eq("country_code", country);
  if (type && type in t.enums.businessType) query = query.eq("business_type", type);
  if (/^[0-9a-f-]{36}$/.test(category)) {
    const { data: ids } = await supabase.from("company_categories").select("company_id")
      .in("category_id", [category, ...ref.categories.filter((c) => c.parent_id === category).map((c) => c.id)]);
    query = query.in("id", [...new Set((ids ?? []).map((x) => x.company_id))].concat(["00000000-0000-0000-0000-000000000000"]));
  }
  const { data: companies, count } = await query.order("verified_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (typeof v === "string" && v && k !== "page") u.set(k, v);
    u.set("page", String(p));
    return `/${locale}/suppliers?${u}`;
  };
  const year = new Date().getFullYear();

  return (
    <div>
      <PageHeader title={t.suppliersPage.title} description={t.suppliersPage.text} />
      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2"><label className="label" htmlFor="q">{t.common.search}</label><input id="q" name="q" defaultValue={q} className="input" /></div>
        <div><label className="label" htmlFor="country">{t.common.country}</label>
          <select id="country" name="country" defaultValue={country} className="input"><option value="">{t.common.all}</option>{o.allCountries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="category">{t.common.category}</label>
          <select id="category" name="category" defaultValue={category} className="input"><option value="">{t.common.all}</option>{o.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div className="flex gap-2"><button className="btn btn-primary flex-1">{t.common.apply}</button><Link className="btn btn-secondary" href={`/${locale}/suppliers`}>{t.common.reset}</Link></div>
      </form>
      {companies && companies.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/${locale}/companies/${c.slug}`} className="card flex flex-col p-5 hover:border-navy-300">
              <div className="flex items-center gap-3">
                {c.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrl(c.logo_path)!} alt="" className="size-12 rounded-md border border-slate-200 object-contain" />
                ) : <span className="grid size-12 place-items-center rounded-md bg-navy-900 text-lg font-semibold text-brass-300">{c.name.charAt(0)}</span>}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-900">{loc(locale, c.name_ar, c.name)}</p>
                  <p className="text-xs text-slate-500">{t.enums.businessType[c.business_type as keyof typeof t.enums.businessType]} · {c.city}, {countryName(ref, c.country_code, locale)}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{loc(locale, c.description_ar, c.description)}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
                <VerifiedBadge label={t.company.verified} />
                {c.year_established && <span>{year - c.year_established} {t.company.yearsInBusiness}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title={t.suppliersPage.noResults} />}
      <Pagination page={page} pageCount={pageCount} hrefFor={qs} labels={{ prev: t.common.prev, next: t.common.next, page: t.common.page }} />
    </div>
  );
}
