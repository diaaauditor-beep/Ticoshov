import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/format";

export default async function CommissionsPage({ params }: PageProps<"/[locale]/dashboard/commissions">) {
  const { locale, t } = await resolveLocale(params);
  await requireCompany(locale);
  const supabase = await createClient();
  const { data } = await supabase.from("commissions")
    .select("*, deals(id, reference, title), commission_payments(id, amount, paid_on, status)").order("created_at", { ascending: false });
  return (
    <div>
      <PageHeader title={t.commissionPage.title} description={t.commissionPage.text} />
      {!data?.length ? <EmptyState title={t.commissionPage.none} /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>{t.common.reference}</th><th>{t.deal.value}</th><th>{t.commissionPage.rate}</th><th>{t.commissionPage.amount}</th><th>{t.commissionPage.paid}</th><th>{t.commissionPage.dueDate}</th><th>{t.common.status}</th><th>{t.commissionPage.payments}</th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs"><Link className="link" href={`/${locale}/dashboard/deals/${c.deals?.id}`}>{c.deals?.reference}</Link></td>
                  <td className="tabular-nums">{formatMoney(c.deal_value, c.currency_code, locale)}</td>
                  <td>{c.rate}%</td>
                  <td className="font-semibold tabular-nums">{formatMoney(c.amount, c.currency_code, locale)}</td>
                  <td className="tabular-nums">{formatMoney(c.amount_paid, c.currency_code, locale)}</td>
                  <td>{formatDate(c.due_date, locale)}</td>
                  <td><StatusBadge status={c.status} label={t.enums.commissionStatus[c.status]} /></td>
                  <td className="text-xs">{c.commission_payments.map((p) => (
                    <div key={p.id}>{formatMoney(p.amount, c.currency_code, locale)} · {formatDate(p.paid_on, locale)} · <StatusBadge status={p.status} label={t.enums.paymentStatus[p.status]} /></div>
                  ))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
