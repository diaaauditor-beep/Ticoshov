import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { getReference, countryName } from "@/lib/reference";
import { Badge, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatDate, loc } from "@/lib/format";

/** Deals a service provider was added to (limited summary from my_provider_deals()). */
export async function ProviderDealsTable({ t, locale, limit }: { t: Dictionary; locale: Locale; limit?: number }) {
  const supabase = await createClient();
  const [{ data }, ref] = await Promise.all([supabase.rpc("my_provider_deals"), getReference()]);
  const rows = limit ? (data ?? []).slice(0, limit) : data ?? [];
  if (!rows.length) return <EmptyState title={t.providers.noAssigned} description={t.providers.noAssignedText} />;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr><th>{t.common.reference}</th><th>{t.common.supplier}</th><th>{t.common.buyer}</th><th>{t.providers.route}</th><th>{t.providers.service}</th><th>{t.common.status}</th><th>{t.providers.assignedOn}</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.assignment_id}>
              <td><Link className="link font-mono" href={`/${locale}/dashboard/deals/${r.deal_id}`}>{r.reference}</Link><div className="text-xs text-slate-500">{r.title}</div></td>
              <td>{loc(locale, r.supplier_name_ar, r.supplier_name)}</td>
              <td>{loc(locale, r.buyer_name_ar, r.buyer_name)}</td>
              <td className="whitespace-nowrap">{countryName(ref, r.supplier_country, locale)} → {countryName(ref, r.delivery_country, locale)}</td>
              <td><Badge tone="navy">{t.providers.services[r.service] ?? r.service}</Badge></td>
              <td><StatusBadge status={r.status} label={t.enums.dealStatus[r.status]} /></td>
              <td className="whitespace-nowrap">{formatDate(r.assigned_at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
