import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { DisputesTable } from "@/components/shared/DisputesTable";
import { sp } from "@/lib/search";

export default async function AdminDisputesPage({ params, searchParams }: PageProps<"/[locale]/admin/disputes">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status);
  return (
    <div>
      <PageHeader title={t.admin.disputesTitle} />
      <form method="get" className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto"><option value="">{t.common.all}</option>{Object.entries(t.enums.disputeStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      <DisputesTable t={t} locale={locale} status={status} hrefFor={(d) => `/${locale}/admin/disputes/${d.id}`} />
    </div>
  );
}
