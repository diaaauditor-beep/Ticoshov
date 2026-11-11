import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatDate, loc } from "@/lib/format";

export async function DisputesTable({ t, locale, hrefFor, status }: { t: Dictionary; locale: Locale; hrefFor: (d: { id: string; deal_id: string }) => string; status?: string }) {
  const supabase = await createClient();
  let q = supabase.from("disputes").select("id, deal_id, reason, status, created_at, deals(reference), raised:companies!disputes_raised_by_company_id_fkey(name, name_ar), against:companies!disputes_against_company_id_fkey(name, name_ar)");
  if (status && status in t.enums.disputeStatus) q = q.eq("status", status as "open");
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title={t.disputesPage.none} />;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead><tr><th>{t.common.reference}</th><th>{t.deal.disputeReason}</th><th>{t.disputesPage.raisedBy}</th><th>{t.disputesPage.against}</th><th>{t.common.created}</th><th>{t.common.status}</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td className="font-mono text-xs"><Link className="link" href={hrefFor(d)}>{d.deals?.reference}</Link></td>
              <td>{t.enums.disputeReason[d.reason as keyof typeof t.enums.disputeReason]}</td>
              <td>{loc(locale, d.raised?.name_ar, d.raised?.name)}</td>
              <td>{loc(locale, d.against?.name_ar, d.against?.name)}</td>
              <td>{formatDate(d.created_at, locale)}</td>
              <td><StatusBadge status={d.status} label={t.enums.disputeStatus[d.status]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
