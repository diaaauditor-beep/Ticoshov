import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName, categoryName } from "@/lib/reference";
import { DL, Section, VerifiedBadge, Badge } from "@/components/ui/primitives";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { formatDate, loc } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import { getViewer } from "@/lib/auth";

export default async function CompanyProfilePage({ params }: PageProps<"/[locale]/companies/[slug]">) {
  const { locale, t } = await resolveLocale(params);
  const { slug } = await params;
  const supabase = await createClient();
  // Only public columns are selected; sensitive data lives in company_legal (never queried here).
  const { data: c } = await supabase.from("companies")
    .select("id, kind, slug, name, name_ar, city, country_code, business_type, logo_path, description, description_ar, website, year_established, employees_range, export_markets, import_markets, verification_status, created_at, company_categories(category_id)")
    .eq("slug", slug).maybeSingle();
  if (!c) notFound();
  const [ref, viewer, { data: products }, { data: reviews }] = await Promise.all([
    getReference(), getViewer(),
    supabase.from("products").select("id, name_en, name_ar, moq, unit_code, price_min, price_max, currency_code, origin_country, product_images(storage_path, sort_order), companies(name, name_ar, verification_status)")
      .eq("company_id", c.id).eq("status", "published").order("published_at", { ascending: false }).limit(12),
    supabase.from("reviews").select("rating, comment, created_at").eq("reviewee_company_id", c.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const provider = c.kind === "service_provider";
  const verified = c.kind !== "buyer" && c.verification_status === "approved";
  const rfqHref = `/${locale}/dashboard/rfqs/new?supplier=${c.id}`;

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-col gap-5 sm:flex-row sm:items-center">
        {c.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl(c.logo_path)!} alt="" className="size-20 rounded-lg border border-slate-200 object-contain" />
        ) : <span className="grid size-20 place-items-center rounded-lg bg-navy-900 text-3xl font-semibold text-brass-300">{c.name.charAt(0)}</span>}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-navy-900">{loc(locale, c.name_ar, c.name)}</h1>
            {verified ? <VerifiedBadge label={provider ? t.providers.verified : t.company.verified} /> : <Badge>{t.enums.companyKind[c.kind]}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{t.enums.businessType[c.business_type as keyof typeof t.enums.businessType]} · {c.city}, {countryName(ref, c.country_code, locale)}</p>
          {avg != null && <p className="mt-1 text-sm text-brass-600">★ {avg.toFixed(1)} ({reviews!.length})</p>}
        </div>
        {c.kind === "supplier" && (!viewer || (!viewer.isStaff && viewer.company?.kind === "buyer")) && (
          <Link href={viewer ? rfqHref : `/${locale}/login?next=${encodeURIComponent(rfqHref)}`} className="btn btn-primary">{t.company.sendRfq}</Link>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Section title={t.company.about}>
          <p className="text-sm leading-7 whitespace-pre-line text-slate-700">{loc(locale, c.description_ar, c.description) || "—"}</p>
        </Section>
        <Section title={t.common.details}>
          <DL items={[
            [t.company.yearEstablished, c.year_established ?? "—"],
            [t.company.employees, c.employees_range ?? "—"],
            [t.company.website, c.website ? <a className="link" href={c.website} target="_blank" rel="noopener noreferrer nofollow" dir="ltr">{c.website.replace(/^https?:\/\//, "")}</a> : "—"],
            [t.company.memberSince, formatDate(c.created_at, locale)],
            [provider ? t.providers.countriesServed : t.company.exportMarkets, c.export_markets.map((x) => countryName(ref, x, locale)).join("، ") || "—"],
            ...(provider ? [] : [[t.company.categories, c.company_categories.map((x) => categoryName(ref, x.category_id, locale)).join("، ") || "—"] as [string, string]]),
          ]} />
        </Section>
      </div>
      {c.kind === "supplier" && (
        <section>
          <h2 className="mb-3 font-semibold text-navy-900">{t.company.products}</h2>
          {products && products.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(products as unknown as ProductCardData[]).map((p) => <ProductCard key={p.id} p={p} t={t} locale={locale} unitLabel={unitName(ref, p.unit_code, locale)} countryLabel={countryName(ref, p.origin_country, locale)} />)}
            </div>
          ) : <p className="card p-5 text-sm text-slate-500">—</p>}
        </section>
      )}
      <Section title={t.company.reviews}>
        {reviews && reviews.length ? (
          <ul className="space-y-3">{reviews.map((r, i) => (
            <li key={i} className="text-sm"><span className="text-brass-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> <span className="text-slate-400">· {formatDate(r.created_at, locale)}</span>
              {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}</li>
          ))}</ul>
        ) : <p className="text-sm text-slate-500">{t.company.noReviews}</p>}
      </Section>
    </div>
  );
}
