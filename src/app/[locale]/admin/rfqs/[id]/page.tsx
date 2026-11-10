import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName, categoryName } from "@/lib/reference";
import { DL, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { FileList } from "@/components/FileList";
import { formatDate, formatMoney, formatNumber, loc } from "@/lib/format";

export default async function AdminRfqPage({ params }: PageProps<"/[locale]/admin/rfqs/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: r } = await supabase.from("rfqs").select("*, buyer:companies!rfqs_buyer_company_id_fkey(id, name, name_ar), rfq_attachments(id, storage_path, file_name, size_bytes)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: quotes }, ref] = await Promise.all([
    supabase.from("quotations").select("*, supplier:companies!quotations_supplier_company_id_fkey(id, name, name_ar), deals(id)").eq("rfq_id", id).order("created_at"),
    getReference(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={r.title} description={<span className="flex items-center gap-2 font-mono">{r.reference} <StatusBadge status={r.status} label={t.enums.rfqStatus[r.status]} /></span>} />
      <Section title={t.common.details}>
        <DL items={[
          [t.common.buyer, <Link key="b" className="link" href={`/${locale}/admin/companies/${r.buyer?.id}`}>{loc(locale, r.buyer?.name_ar, r.buyer?.name)}</Link>],
          [t.common.category, categoryName(ref, r.category_id, locale)],
          [t.rfq.quantity, `${formatNumber(r.quantity, locale)} ${unitName(ref, r.unit_code, locale)}`],
          [t.rfq.deliveryCountry, countryName(ref, r.delivery_country, locale)],
          [t.rfq.closesOn, formatDate(r.expires_at, locale)], [t.common.created, formatDate(r.created_at, locale)],
        ]} />
        <p className="mt-4 text-sm whitespace-pre-line text-slate-700">{r.description}</p>
        <div className="mt-4"><FileList t={t} files={r.rfq_attachments} /></div>
      </Section>
      <Section title={t.rfq.quotations}>
        <div className="-mx-5 overflow-x-auto">
          <table className="table">
            <thead><tr><th>{t.common.supplier}</th><th>{t.quote.unitPrice}</th><th>{t.quote.total}</th><th>{t.quote.leadTimeShort}</th><th>{t.quote.validUntil}</th><th>{t.common.status}</th><th></th></tr></thead>
            <tbody>{(quotes ?? []).map((q) => (
              <tr key={q.id}>
                <td>{loc(locale, q.supplier?.name_ar, q.supplier?.name)}</td>
                <td>{formatMoney(q.unit_price, q.currency_code, locale)}</td>
                <td>{formatMoney(q.total_amount, q.currency_code, locale)}</td>
                <td>{q.lead_time_days} {t.quote.days}</td>
                <td>{formatDate(q.valid_until, locale)}</td>
                <td><StatusBadge status={q.status} label={t.enums.quotationStatus[q.status]} /></td>
                <td>{q.deals && <Link className="link text-sm" href={`/${locale}/admin/deals/${q.deals.id}`}>{t.quote.openDeal}</Link>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
