import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { DealView } from "@/components/DealView";
import { ProviderDealView } from "@/components/ProviderDealView";

export default async function DealPage({ params }: PageProps<"/[locale]/dashboard/deals/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  const viewer = await requireCompany(locale);
  if (viewer.company.kind === "service_provider") return <ProviderDealView dealId={id} t={t} locale={locale} />;
  return <DealView dealId={id} viewer={viewer} t={t} locale={locale} />;
}
