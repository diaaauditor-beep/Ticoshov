import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { VerifiedBadge } from "@/components/ui/primitives";
import { resolveLocale } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";
import { loc } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

function HeroGraphic() {
  // Abstract trade-route map: two hubs (Egypt → Saudi Arabia) and onward routes.
  return (
    <svg viewBox="0 0 480 380" className="h-auto w-full" aria-hidden>
      <defs>
        <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#2c4370" />
        </pattern>
      </defs>
      <rect width="480" height="380" fill="url(#dots)" opacity="0.55" rx="16" />
      <circle cx="240" cy="190" r="150" fill="none" stroke="#20345b" strokeWidth="1.2" />
      <ellipse cx="240" cy="190" rx="70" ry="150" fill="none" stroke="#20345b" strokeWidth="1.2" />
      <path d="M90 190h300M108 120h264M108 260h264" stroke="#20345b" strokeWidth="1.2" />
      <path d="M150 210 C 200 120, 290 120, 330 230" fill="none" stroke="#d1b37f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M330 230 C 360 170, 400 140, 430 110" fill="none" stroke="#6079a6" strokeWidth="1.5" strokeDasharray="4 6" />
      <path d="M150 210 C 110 150, 80 120, 50 100" fill="none" stroke="#6079a6" strokeWidth="1.5" strokeDasharray="4 6" />
      <path d="M330 230 C 360 280, 400 300, 440 310" fill="none" stroke="#6079a6" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="150" cy="210" r="9" fill="#d1b37f" />
      <circle cx="150" cy="210" r="18" fill="none" stroke="#d1b37f" strokeOpacity="0.4" />
      <circle cx="330" cy="230" r="9" fill="#ffffff" />
      <circle cx="330" cy="230" r="18" fill="none" stroke="#ffffff" strokeOpacity="0.35" />
      <text x="150" y="245" textAnchor="middle" fontSize="13" fill="#c3cee2" fontFamily="sans-serif">EG</text>
      <text x="330" y="265" textAnchor="middle" fontSize="13" fill="#c3cee2" fontFamily="sans-serif">SA</text>
      {[ [50, 100], [430, 110], [440, 310] ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#6079a6" />)}
    </svg>
  );
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  const supabase = await createClient();
  const [{ data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("categories").select("id, slug, name_en, name_ar, parent_id").is("parent_id", null).eq("is_active", true).order("sort_order"),
    supabase.from("companies").select("id, slug, name, name_ar, city, country_code, business_type, logo_path, countries(name_en, name_ar)")
      .eq("kind", "supplier").eq("verification_status", "approved").eq("is_active", true).eq("is_demo", false)
      .order("verified_at", { ascending: false }).limit(6),
  ]);
  const L = t.landing;

  return (
    <>
      <div className="bg-navy-950">
        <SiteHeader locale={locale} t={t} variant="dark" />
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-20 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brass-400/30 bg-brass-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-brass-200">
              <span className="size-1.5 rounded-full bg-brass-300" /> {L.heroEyebrow}
            </p>
            <h1 className="mt-6 text-4xl leading-tight font-semibold text-white sm:text-5xl">{L.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-navy-200">{L.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/register?role=buyer`} className="btn btn-accent px-5 py-2.5">{L.ctaBuyer}</Link>
              <Link href={`/${locale}/register?role=supplier`} className="btn border border-white/20 px-5 py-2.5 text-white hover:bg-white/10">{L.ctaSupplier}</Link>
            </div>
            <p className="mt-8 text-sm text-navy-300">{L.corridor}: <span className="font-semibold text-white">{L.corridorValue}</span></p>
          </div>
          <div className="mx-auto w-full max-w-lg"><HeroGraphic /></div>
        </section>
        <div className="border-t border-white/10">
          <dl className="mx-auto grid max-w-7xl grid-cols-1 divide-white/10 px-4 sm:grid-cols-3 sm:divide-x sm:px-6 rtl:sm:divide-x-reverse">
            {L.heroStats.map(([k, v]) => (
              <div key={k} className="py-6 sm:px-6 first:sm:ps-0">
                <dt className="text-lg font-semibold text-white">{k}</dt>
                <dd className="text-sm text-navy-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <main>
        {/* Business model */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-navy-900">{L.modelTitle}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{L.modelText}</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {L.modelPoints.map(([title, text], i) => (
              <div key={title} className="card card-pad">
                <span className="grid size-9 place-items-center rounded-md bg-navy-900 text-sm font-semibold text-brass-300">0{i + 1}</span>
                <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm"><Link className="link" href={`/${locale}/legal/intermediary`}>{t.legal.intermediary} {locale === "ar" ? "←" : "→"}</Link></p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold text-navy-900">{L.howTitle}</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-5">
              {L.howSteps.map(([title, text], i) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-brass-400 text-sm font-bold text-navy-900">{i + 1}</span>
                    <span className="hidden h-px flex-1 bg-slate-200 md:block" />
                  </div>
                  <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Supplier & buyer benefits */}
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2">
          {[
            { id: "suppliers", title: L.suppliersTitle, points: L.suppliersPoints, cta: L.ctaSupplier, href: `/${locale}/register?role=supplier`, dark: true },
            { id: "buyers", title: L.buyersTitle, points: L.buyersPoints, cta: L.ctaBuyer, href: `/${locale}/register?role=buyer`, dark: false },
          ].map((b) => (
            <div key={b.id} id={b.id} className={`rounded-xl p-8 ${b.dark ? "bg-navy-900 text-white" : "card"}`}>
              <h2 className={`text-2xl font-semibold ${b.dark ? "text-white" : "text-navy-900"}`}>{b.title}</h2>
              <ul className="mt-6 space-y-3">
                {b.points.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-6">
                    <svg viewBox="0 0 20 20" className={`mt-0.5 size-5 shrink-0 ${b.dark ? "text-brass-300" : "text-navy-600"}`} fill="currentColor" aria-hidden><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.3 7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
                    <span className={b.dark ? "text-navy-100" : "text-slate-700"}>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href={b.href} className={`mt-8 ${b.dark ? "btn btn-accent" : "btn btn-primary"}`}>{b.cta}</Link>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-semibold text-navy-900">{L.categoriesTitle}</h2>
                <p className="mt-2 text-slate-600">{L.categoriesText}</p>
              </div>
              <Link href={`/${locale}/products`} className="link text-sm">{t.common.viewAll}</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(categories ?? []).map((c, i) => (
                <Link key={c.id} href={`/${locale}/products?category=${c.id}`}
                  className={`group rounded-lg border p-4 transition hover:border-navy-400 ${i < 2 ? "border-brass-200 bg-brass-50" : "border-slate-200"}`}>
                  <span className="text-sm font-semibold text-navy-900 group-hover:text-navy-700">{loc(locale, c.name_ar, c.name_en)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Verified suppliers */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold text-navy-900">{L.verifiedTitle}</h2>
          <p className="mt-2 text-slate-600">{L.verifiedText}</p>
          {suppliers && suppliers.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((s) => (
                <Link key={s.id} href={`/${locale}/companies/${s.slug}`} className="card flex items-center gap-4 p-4 hover:border-navy-300">
                  {s.logo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicUrl(s.logo_path)!} alt="" className="size-12 rounded-md border border-slate-200 object-contain" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-md bg-navy-900 text-lg font-semibold text-brass-300">{s.name.charAt(0)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">{loc(locale, s.name_ar, s.name)}</p>
                    <p className="text-xs text-slate-500">{s.city} · {loc(locale, s.countries?.name_ar, s.countries?.name_en)}</p>
                    <div className="mt-1"><VerifiedBadge label={t.company.verified} /></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="card mt-8 p-6 text-sm text-slate-500">{L.verifiedEmpty}</p>
          )}
        </section>

        {/* International */}
        <section className="bg-navy-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold">{L.intlTitle}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {L.intlPoints.map(([title, text]) => (
                <div key={title} className="border-s-2 border-brass-400 ps-4">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-navy-200">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTAs */}
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2">
          {[
            [L.ctaSupplierTitle, L.ctaSupplierText, L.ctaSupplier, "supplier"],
            [L.ctaBuyerTitle, L.ctaBuyerText, L.ctaBuyer, "buyer"],
          ].map(([title, text, cta, role]) => (
            <div key={role} className="card card-pad flex flex-col">
              <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{text}</p>
              <Link href={`/${locale}/register?role=${role}`} className="btn btn-primary mt-6 self-start">{cta}</Link>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold text-navy-900">{L.faqTitle}</h2>
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {L.faq.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-navy-900">
                    {q}
                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} t={t} />
    </>
  );
}
