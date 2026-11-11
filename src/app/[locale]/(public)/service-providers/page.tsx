import type { Metadata } from "next";
import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { getReference, options, countryName } from "@/lib/reference";
import { cleanQuery, pageOf, sp } from "@/lib/search";
import { EmptyState, PageHeader, Pagination, VerifiedBadge } from "@/components/ui/primitives";
import { PROVIDER_TYPES } from "@/components/CompanyFields";
import { loc } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Customs brokers & logistics" };
const PAGE = 18;

/** Public directory of verified customs brokers, clearing agents and freight forwarders. */
export default async function ServiceProvidersPage({ params, searchParams }: PageProps<"/[locale]/service-providers">) {
  const { locale, t } = await resolveLocale(params);
  const s = await searchParams;
  const ref = await getReference();
  const o = options(ref, locale);
  const supabase = await createClient();
  const q = cleanQuery(s.q);
  const country = sp(s.country);
  const type = sp(s.type);
  const page = pageOf(s.page);

  let query = supabase.from("companies")
    .select("id, slug, name, name_ar, city, country_code, business_type, logo_path, description, description_ar, export_markets", { count: "exact" })
    .eq("kind", "service_provider").eq("verification_status", "approved").eq("is_active", true);
  if (q) query = query.or(`name.ilike.%${q}%,name_ar.ilike.%${q}%,city.ilike.%${q}%`);
  // a provider matches a country it is based in or serves
  if (/^[A-Z]{2}$/.test(country)) query = query.or(`country_code.eq.${country},export_markets.cs.{${country}}`);
  if (PROVIDER_TYPES.includes(type)) query = query.eq("business_type", type);
  const { data: companies, count } = await query.order("verified_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (typeof v === "string" && v && k !== "page") u.set(k, v);
    u.set("page", String(p));
    return `/${locale}/service-providers?${u}`;
  };
  const typeLabel = (x: string) => t.enums.businessType[x as keyof typeof t.enums.businessType] ?? x;

  return (
    <div>
      <PageHeader title={t.providers.title} description={t.providers.text}
        actions={<Link href={`/${locale}/register?role=service_provider`} className="btn btn-secondary">{t.nav.forProviders}</Link>} />
      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2"><label className="label" htmlFor="q">{t.common.search}</label><input id="q" name="q" defaultValue={q} className="input" /></div>
        <div><label className="label" htmlFor="country">{t.common.country}</label>
          <select id="country" name="country" defaultValue={country} className="input"><option value="">{t.common.all}</option>{o.allCountries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="type">{t.providers.serviceType}</label>
          <select id="type" name="type" defaultValue={type} className="input"><option value="">{t.common.all}</option>{PROVIDER_TYPES.map((x) => <option key={x} value={x}>{typeLabel(x)}</option>)}</select></div>
        <div className="flex gap-2"><button className="btn btn-primary flex-1">{t.common.apply}</button><Link className="btn btn-secondary" href={`/${locale}/service-providers`}>{t.common.reset}</Link></div>
      </form>
      {companies && companies.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/${locale}/companies/${c.slug}`} className="card flex min-w-0 flex-col p-5 hover:border-navy-300">
              <div className="flex items-center gap-3">
                {c.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrl(c.logo_path)!} alt="" className="size-12 shrink-0 rounded-md border border-slate-200 object-contain" />
                ) : <span className="grid size-12 shrink-0 place-items-center rounded-md bg-navy-900 text-lg font-semibold text-brass-300">{c.name.charAt(0)}</span>}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-900">{loc(locale, c.name_ar, c.name)}</p>
                  <p className="text-xs text-slate-500">{typeLabel(c.business_type)} · {c.city}, {countryName(ref, c.country_code, locale)}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{loc(locale, c.description_ar, c.description)}</p>
              {c.export_markets.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">{t.providers.countriesServed}: {c.export_markets.map((x) => countryName(ref, x, locale)).join("، ")}</p>
              )}
              <div className="mt-auto pt-4"><VerifiedBadge label={t.providers.verified} /></div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title={t.providers.noResults} />}
      <Pagination page={page} pageCount={pageCount} hrefFor={qs} labels={{ prev: t.common.prev, next: t.common.next, page: t.common.page }} />
    </div>
  );
}
