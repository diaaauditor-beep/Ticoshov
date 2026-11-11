import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { dirOf, isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-plex-arabic", display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: { default: t.meta.title, template: `%s · ${locale === "ar" ? "تيكوشوف" : "TICOSHOV"}` },
    description: t.meta.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    alternates: { languages: { ar: "/ar", en: "/en" } },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${inter.variable} ${plexArabic.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
