import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { DealsTable, type DealRow } from "@/components/tables";
import { sp } from "@/lib/search";

export default async function DealsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/deals">) {
  const { locale, t } = await resolveLocale(params);
  await requireCompany(locale);
  const s = await searchParams;
  const status = sp(s.status);
  const supabase = await createClient();
  let q = supabase.from("deals").select("id, reference, title, status, deal_value, currency_code, updated_at, buyer:companies!deals_buyer_company_id_fkey(name, name_ar), supplier:companies!deals_supplier_company_id_fkey(name, name_ar)");
  if (status && status in t.enums.dealStatus) q = q.eq("status", status as "completed");
  const { data } = await q.order("updated_at", { ascending: false }).limit(200);
  return (
    <div>
      <PageHeader title={t.deal.title} description={t.deal.text} />
      <form method="get" className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto">
          <option value="">{t.common.status}: {t.common.all}</option>
          {Object.entries(t.enums.dealStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {data?.length ? <DealsTable rows={data as unknown as DealRow[]} t={t} locale={locale} base={`/${locale}/dashboard/deals`} />
        : <EmptyState title={t.deal.noDeals} description={t.deal.noDealsText} />}
    </div>
  );
}
