import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDate, formatMoney, loc } from "@/lib/format";

export default async function MyQuotationsPage({ params }: PageProps<"/[locale]/dashboard/quotations">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const { data } = await supabase.from("quotations")
    .select("id, status, total_amount, currency_code, valid_until, revision, updated_at, rfqs(id, reference, title, buyer:companies!rfqs_buyer_company_id_fkey(name, name_ar)), deals(id)")
    .eq("supplier_company_id", viewer.company.id).order("updated_at", { ascending: false });
  return (
    <div>
      <PageHeader title={t.quote.myTitle} />
      {!data?.length ? <EmptyState title={t.quote.noQuotes} action={<Link href={`/${locale}/dashboard/rfqs`} className="btn btn-primary">{t.nav.rfqFeed}</Link>} /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>{t.common.reference}</th><th>{t.rfq.titleField}</th><th>{t.common.buyer}</th><th>{t.quote.total}</th><th>{t.quote.validUntil}</th><th>{t.common.status}</th><th></th></tr></thead>
            <tbody>
              {data.map((q) => (
                <tr key={q.id}>
                  <td className="font-mono text-xs"><Link className="link" href={`/${locale}/dashboard/rfqs/${q.rfqs?.id}`}>{q.rfqs?.reference}</Link></td>
                  <td>{q.rfqs?.title}</td>
                  <td>{loc(locale, q.rfqs?.buyer?.name_ar, q.rfqs?.buyer?.name)}</td>
                  <td className="whitespace-nowrap tabular-nums">{formatMoney(q.total_amount, q.currency_code, locale)}</td>
                  <td>{formatDate(q.valid_until, locale)}</td>
                  <td><StatusBadge status={q.status} label={t.enums.quotationStatus[q.status]} /></td>
                  <td>{q.deals && <Link href={`/${locale}/dashboard/deals/${q.deals.id}`} className="link text-sm">{t.quote.openDeal}</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
