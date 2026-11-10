import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName } from "@/lib/reference";
import { Badge, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDate, loc } from "@/lib/format";
import { cleanQuery, sp } from "@/lib/search";

export default async function AdminCompaniesPage({ params, searchParams }: PageProps<"/[locale]/admin/companies">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const q = cleanQuery(s.q), kind = sp(s.kind), ver = sp(s.verification);
  const supabase = await createClient();
  const ref = await getReference();
  let query = supabase.from("companies").select("id, name, name_ar, kind, country_code, city, verification_status, is_active, is_demo, created_at");
  if (q) query = query.or(`name.ilike.%${q}%,name_ar.ilike.%${q}%`);
  if (kind === "supplier" || kind === "buyer") query = query.eq("kind", kind);
  if (ver in t.enums.verificationStatus) query = query.eq("verification_status", ver as "approved");
  const { data } = await query.order("created_at", { ascending: false }).limit(300);
  const C = t.admin.companies;
  return (
    <div>
      <PageHeader title={C.title} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t.common.search} className="input w-56" />
        <select name="kind" defaultValue={kind} className="input w-auto"><option value="">{C.kind}: {t.common.all}</option>{Object.entries(t.enums.companyKind).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="verification" defaultValue={ver} className="input w-auto"><option value="">{C.verification}: {t.common.all}</option>{Object.entries(t.enums.verificationStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>{t.common.company}</th><th>{C.kind}</th><th>{t.common.country}</th><th>{C.verification}</th><th>{C.activeToggle}</th><th>{t.common.created}</th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td><Link className="link" href={`/${locale}/admin/companies/${c.id}`}>{loc(locale, c.name_ar, c.name)}</Link> {c.is_demo && <Badge tone="brass">{t.common.demo}</Badge>}</td>
                <td>{t.enums.companyKind[c.kind]}</td>
                <td>{c.city}, {countryName(ref, c.country_code, locale)}</td>
                <td><StatusBadge status={c.verification_status} label={t.enums.verificationStatus[c.verification_status]} /></td>
                <td>{c.is_active ? t.common.yes : <Badge tone="red">{t.common.no}</Badge>}</td>
                <td className="text-slate-500">{formatDate(c.created_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
