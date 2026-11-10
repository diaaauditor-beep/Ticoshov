import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { DealsTable, type DealRow } from "@/components/tables";
import { sp } from "@/lib/search";

export default async function AdminDealsPage({ params, searchParams }: PageProps<"/[locale]/admin/deals">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status);
  const stale = sp(s.stale) === "1";
  const supabase = await createClient();
  let q = supabase.from("deals").select("id, reference, title, status, deal_value, currency_code, updated_at, buyer:companies!deals_buyer_company_id_fkey(name, name_ar), supplier:companies!deals_supplier_company_id_fkey(name, name_ar)");
  if (status in t.enums.dealStatus) q = q.eq("status", status as "completed");
  // "overdue actions": active deals with no update for 14 days
  if (stale) q = q.not("status", "in", "(completed,cancelled)").lt("updated_at", new Date(Date.now() - 14 * 86400000).toISOString());
  const { data } = await q.order("updated_at", { ascending: stale }).limit(300);
  return (
    <div>
      <PageHeader title={t.admin.dealsTitle} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={status} className="input w-auto"><option value="">{t.common.all}</option>{Object.entries(t.enums.dealStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stale" value="1" defaultChecked={stale} className="size-4" />14+ {t.quote.days} {locale === "ar" ? "بدون تحديث" : "without update"}</label>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {data?.length ? <DealsTable rows={data as unknown as DealRow[]} t={t} locale={locale} base={`/${locale}/admin/deals`} /> : <EmptyState title={t.deal.noDeals} />}
    </div>
  );
}
