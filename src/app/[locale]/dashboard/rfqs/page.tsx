import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName, options } from "@/lib/reference";
import { EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { RfqsTable, type RfqRow } from "@/components/tables";
import { sp } from "@/lib/search";

export default async function RfqsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/rfqs">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  const s = await searchParams;
  const supabase = await createClient();
  const ref = await getReference();
  const supplier = viewer.company.kind === "supplier";
  const status = sp(s.status);
  const category = sp(s.category);
  const base = `/${locale}/dashboard/rfqs`;

  let q = supabase.from("rfqs").select(
    supplier
      ? "id, reference, title, status, quantity, unit_code, delivery_country, expires_at, created_at, buyer:companies!rfqs_buyer_company_id_fkey(name, name_ar)"
      : "id, reference, title, status, quantity, unit_code, delivery_country, expires_at, created_at, quotations(count)");
  if (supplier) {
    // RLS already limits suppliers to open RFQs they may see (+ ones they quoted on)
    q = q.neq("buyer_company_id", viewer.company.id);
    q = status ? q.eq("status", status as "open") : q.eq("status", "open");
  } else {
    q = q.eq("buyer_company_id", viewer.company.id);
    if (status) q = q.eq("status", status as "open");
  }
  if (/^[0-9a-f-]{36}$/.test(category)) q = q.in("category_id", [category, ...ref.categories.filter((c) => c.parent_id === category).map((c) => c.id)]);
  const { data } = await q.order("created_at", { ascending: false }).limit(100);
  const o = options(ref, locale);
  const notVerified = supplier && viewer.company.verification_status !== "approved";

  return (
    <div>
      <PageHeader title={supplier ? t.nav.rfqFeed : t.rfq.title} description={supplier ? t.rfq.supplierText : t.rfq.buyerText}
        actions={!supplier && <Link href={`${base}/new`} className="btn btn-primary">{t.nav.newRfq}</Link>} />
      {notVerified && <div className="mb-4"><Notice>{t.rfq.verifyToQuote}</Notice></div>}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={status} className="input w-auto">
          <option value="">{supplier ? t.enums.rfqStatus.open : t.common.all}</option>
          {Object.entries(t.enums.rfqStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="category" defaultValue={category} className="input w-auto">
          <option value="">{t.common.category}: {t.common.all}</option>
          {o.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {data && data.length > 0 ? (
        <RfqsTable rows={data as unknown as RfqRow[]} t={t} locale={locale} base={base} showBuyer={supplier}
          unitLabel={(c) => unitName(ref, c, locale)} countryLabel={(c) => countryName(ref, c, locale)} />
      ) : (
        <EmptyState title={t.rfq.noRfqs} description={supplier ? t.rfq.noRfqsSupplier : t.rfq.noRfqsBuyer}
          action={!supplier && <Link href={`${base}/new`} className="btn btn-primary">{t.nav.newRfq}</Link>} />
      )}
    </div>
  );
}
