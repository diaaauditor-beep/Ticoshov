import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { DealView } from "@/components/DealView";

export default async function DealPage({ params }: PageProps<"/[locale]/dashboard/deals/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  const viewer = await requireCompany(locale);
  return <DealView dealId={id} viewer={viewer} t={t} locale={locale} />;
}
