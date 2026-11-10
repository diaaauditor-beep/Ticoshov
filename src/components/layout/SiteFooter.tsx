import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export async function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary }) {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("platform_settings").select("key, value").in("key", ["support_email", "support_phone"]);
  const email = settings?.find((s) => s.key === "support_email")?.value as string | undefined;
  const phone = settings?.find((s) => s.key === "support_phone")?.value as string | undefined;
  const legal = [
    ["terms", t.legal.terms], ["privacy", t.legal.privacy], ["intermediary", t.legal.intermediary],
    ["commission", t.legal.commission], ["disputes", t.legal.disputes],
  ] as const;
  return (
    <footer className="mt-auto bg-navy-950 text-navy-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo locale={locale} inverted />
          <p className="mt-4 max-w-md text-sm leading-6 text-navy-300">{t.footer.about}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{t.footer.platform}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href={`/${locale}/products`}>{t.nav.products}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/suppliers`}>{t.nav.suppliers}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/register?role=supplier`}>{t.nav.forSuppliers}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/register?role=buyer`}>{t.nav.forBuyers}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{t.footer.legal}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {legal.map(([slug, label]) => (
              <li key={slug}><Link className="hover:text-white" href={`/${locale}/legal/${slug}`}>{label}</Link></li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold text-white">{t.footer.contact}</h3>
          <p className="mt-2 text-sm">
            {email || phone ? (
              <>{email && <a className="block hover:text-white" href={`mailto:${email}`}>{email}</a>}{phone && <span dir="ltr" className="block">{phone}</span>}</>
            ) : t.footer.contactText}
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-navy-400 sm:px-6">© {new Date().getFullYear()} TICOSHOV · تيكوشوف. {t.footer.rights}</p>
      </div>
    </footer>
  );
}
