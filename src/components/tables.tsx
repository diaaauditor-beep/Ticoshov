import Link from "next/link";
import { StatusBadge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { formatDate, formatMoney, formatNumber, loc } from "@/lib/format";

type CompanyRef = { name: string; name_ar: string | null } | null;

export type DealRow = {
  id: string; reference: string; title: string; status: string; deal_value: number; currency_code: string; updated_at: string;
  buyer: CompanyRef; supplier: CompanyRef;
};

export function DealsTable({ rows, t, locale, base }: { rows: DealRow[]; t: Dictionary; locale: Locale; base: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead><tr>
          <th>{t.common.reference}</th><th>{t.common.details}</th><th>{t.common.buyer}</th><th>{t.common.supplier}</th>
          <th>{t.deal.value}</th><th>{t.common.status}</th><th>{t.common.updated}</th>
        </tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td className="font-mono text-xs"><Link className="link" href={`${base}/${d.id}`}>{d.reference}</Link></td>
              <td className="max-w-64 truncate">{d.title}</td>
              <td>{loc(locale, d.buyer?.name_ar, d.buyer?.name)}</td>
              <td>{loc(locale, d.supplier?.name_ar, d.supplier?.name)}</td>
              <td className="whitespace-nowrap tabular-nums">{formatMoney(d.deal_value, d.currency_code, locale)}</td>
              <td><StatusBadge status={d.status} label={t.enums.dealStatus[d.status as keyof typeof t.enums.dealStatus]} /></td>
              <td className="whitespace-nowrap text-slate-500">{formatDate(d.updated_at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type RfqRow = {
  id: string; reference: string; title: string; status: string; quantity: number; unit_code: string; delivery_country: string;
  expires_at: string; created_at: string; quotations?: Array<{ count: number }>; buyer?: CompanyRef;
};

export function RfqsTable({ rows, t, locale, base, showBuyer, unitLabel, countryLabel }: {
  rows: RfqRow[]; t: Dictionary; locale: Locale; base: string; showBuyer?: boolean;
  unitLabel: (c: string) => string; countryLabel: (c: string) => string;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead><tr>
          <th>{t.common.reference}</th><th>{t.rfq.titleField}</th>{showBuyer && <th>{t.common.buyer}</th>}
          <th>{t.rfq.quantity}</th><th>{t.rfq.deliveryCountry}</th><th>{t.rfq.quotations}</th><th>{t.rfq.closesOn}</th><th>{t.common.status}</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-mono text-xs"><Link className="link" href={`${base}/${r.id}`}>{r.reference}</Link></td>
              <td className="max-w-72"><Link href={`${base}/${r.id}`} className="font-medium text-navy-900 hover:underline">{r.title}</Link></td>
              {showBuyer && <td>{loc(locale, r.buyer?.name_ar, r.buyer?.name)}</td>}
              <td className="whitespace-nowrap tabular-nums">{formatNumber(r.quantity, locale)} {unitLabel(r.unit_code)}</td>
              <td>{countryLabel(r.delivery_country)}</td>
              <td className="tabular-nums">{r.quotations?.[0]?.count ?? 0}</td>
              <td className="whitespace-nowrap text-slate-500">{formatDate(r.expires_at, locale)}</td>
              <td><StatusBadge status={r.status} label={t.enums.rfqStatus[r.status as keyof typeof t.enums.rfqStatus]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
