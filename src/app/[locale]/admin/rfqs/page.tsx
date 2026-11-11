import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName } from "@/lib/reference";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { RfqsTable, type RfqRow } from "@/components/tables";
import { sp } from "@/lib/search";

export default async function AdminRfqsPage({ params, searchParams }: PageProps<"/[locale]/admin/rfqs">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status);
  const supabase = await createClient();
  const ref = await getReference();
  let q = supabase.from("rfqs").select("id, reference, title, status, quantity, unit_code, delivery_country, expires_at, created_at, quotations(count), buyer:companies!rfqs_buyer_company_id_fkey(name, name_ar)");
  if (status in t.enums.rfqStatus) q = q.eq("status", status as "open");
  const { data } = await q.order("created_at", { ascending: false }).limit(300);
  return (
    <div>
      <PageHeader title={t.admin.rfqsTitle} />
      <form method="get" className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto"><option value="">{t.common.all}</option>{Object.entries(t.enums.rfqStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {data?.length ? <RfqsTable rows={data as unknown as RfqRow[]} t={t} locale={locale} base={`/${locale}/admin/rfqs`} showBuyer
        unitLabel={(c) => unitName(ref, c, locale)} countryLabel={(c) => countryName(ref, c, locale)} /> : <EmptyState title={t.rfq.noRfqs} />}
    </div>
  );
}
