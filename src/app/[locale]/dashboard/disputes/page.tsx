import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { DisputesTable } from "@/components/shared/DisputesTable";

export default async function DisputesPage({ params }: PageProps<"/[locale]/dashboard/disputes">) {
  const { locale, t } = await resolveLocale(params);
  await requireCompany(locale);
  return (
    <div>
      <PageHeader title={t.disputesPage.title} actions={<Link href={`/${locale}/legal/disputes`} className="btn btn-secondary">{t.disputesPage.procedure}</Link>} />
      <DisputesTable t={t} locale={locale} hrefFor={(d) => `/${locale}/dashboard/deals/${d.deal_id}`} />
    </div>
  );
}
