import { resolveLocale } from "@/i18n/get-dictionary";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  return (
    <>
      <SiteHeader locale={locale} t={t} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <SiteFooter locale={locale} t={t} />
    </>
  );
}
