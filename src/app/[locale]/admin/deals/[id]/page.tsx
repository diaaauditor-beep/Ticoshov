import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { DealView } from "@/components/DealView";

export default async function AdminDealPage({ params }: PageProps<"/[locale]/admin/deals/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  const viewer = await requireStaff(locale);
  return <DealView dealId={id} viewer={viewer} t={t} locale={locale} staffBase={`/${locale}/admin`} />;
}
