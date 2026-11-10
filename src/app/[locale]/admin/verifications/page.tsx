import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName } from "@/lib/reference";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDate, loc } from "@/lib/format";
import { sp } from "@/lib/search";

export default async function VerificationsPage({ params, searchParams }: PageProps<"/[locale]/admin/verifications">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status);
  const supabase = await createClient();
  const ref = await getReference();
  let q = supabase.from("supplier_verifications").select("id, status, submitted_at, reviewed_at, companies(name, name_ar, country_code), verification_documents(count)");
  if (status in t.enums.verificationStatus) q = q.eq("status", status as "pending");
  else q = q.in("status", ["pending", "under_review"]).not("submitted_at", "is", null);
  const { data } = await q.order("submitted_at", { ascending: true, nullsFirst: false }).limit(200);
  const V = t.admin.verifications;
  return (
    <div>
      <PageHeader title={V.title} description={V.queue} />
      <form method="get" className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto"><option value="">{V.queue}</option>{Object.entries(t.enums.verificationStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {!data?.length ? <EmptyState title={t.admin.noData} /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>{t.common.company}</th><th>{t.common.country}</th><th>{t.verification.documents}</th><th>{V.submittedAt}</th><th>{t.common.status}</th></tr></thead>
            <tbody>{data.map((v) => (
              <tr key={v.id}>
                <td><Link className="link" href={`/${locale}/admin/verifications/${v.id}`}>{loc(locale, v.companies?.name_ar, v.companies?.name)}</Link></td>
                <td>{countryName(ref, v.companies?.country_code, locale)}</td>
                <td>{v.verification_documents?.[0]?.count ?? 0}</td>
                <td>{formatDate(v.submitted_at, locale, true)}</td>
                <td><StatusBadge status={v.status} label={t.enums.verificationStatus[v.status]} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
