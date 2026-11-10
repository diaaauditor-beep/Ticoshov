import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { legalAr, legalEn } from "@/content/legal";
import { Notice } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";

const DOCS = ["terms", "privacy", "intermediary", "commission", "disputes"] as const;
type DocKey = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { doc, locale } = await params;
  const d = (locale === "ar" ? legalAr : legalEn)[doc as DocKey];
  return { title: d?.title ?? "Legal" };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, t } = await resolveLocale(params);
  const { doc } = await params;
  if (!DOCS.includes(doc as DocKey)) notFound();
  const d = (locale === "ar" ? legalAr : legalEn)[doc as DocKey];
  const supabase = await createClient();
  const { data: review } = await supabase.from("platform_settings").select("value").eq("key", "legal_review_status").maybeSingle();
  const approved = review?.value === "approved";
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold text-navy-900">{d.title}</h1>
      {!approved && <div className="mt-4"><Notice>{t.legal.reviewNotice}</Notice></div>}
      <div className="prose-legal card card-pad mt-6">
        {d.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((p, i) => <p key={i}>{p}</p>)}
            {s.list && <ul>{s.list.map((li, i) => <li key={i}>{li}</li>)}</ul>}
          </section>
        ))}
      </div>
    </article>
  );
}
