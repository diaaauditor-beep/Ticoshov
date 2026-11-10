import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Pagination, Section } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { pageOf, sp } from "@/lib/search";

const PAGE = 50;
function diff(oldD: Record<string, unknown> | null, newD: Record<string, unknown> | null) {
  if (!oldD || !newD) return Object.keys(newD ?? oldD ?? {}).slice(0, 6).join(", ");
  return Object.keys(newD).filter((k) => k !== "updated_at" && JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]))
    .map((k) => `${k}: ${JSON.stringify(oldD[k])} → ${JSON.stringify(newD[k])}`).join("; ").slice(0, 400);
}

export default async function AuditPage({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale, true);
  const s = await searchParams;
  const table = sp(s.table);
  const page = pageOf(s.page);
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("*", { count: "exact" });
  if (/^[a-z_]+$/.test(table)) q = q.eq("table_name", table);
  const [{ data: logs, count }, { data: actions }, { data: users }] = await Promise.all([
    q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.rpc("admin_list_users", {}),
  ]);
  const who = (id: string | null) => (id ? users?.find((u) => u.id === id)?.email ?? id.slice(0, 8) : t.admin.audit.system);
  const AU = t.admin.audit;
  const tables = ["profiles", "companies", "company_legal", "supplier_verifications", "products", "rfqs", "quotations", "deals", "commissions", "commission_payments", "commission_rules", "shipments", "shipment_documents", "disputes", "platform_settings", "categories", "countries", "currencies", "message_reports", "company_members", "verification_documents"];
  return (
    <div className="space-y-6">
      <PageHeader title={AU.title} />
      <Section title={AU.adminActions}>
        <ul className="space-y-1 text-sm">
          {(actions ?? []).map((a) => <li key={a.id} className="flex flex-wrap gap-2"><span className="text-slate-400">{formatDate(a.created_at, locale, true)}</span><span dir="ltr">{who(a.actor_id)}</span><code className="text-navy-700">{a.action}</code><span className="text-xs text-slate-500" dir="ltr">{JSON.stringify(a.details)}</span></li>)}
        </ul>
      </Section>
      <form method="get" className="flex gap-2">
        <select name="table" defaultValue={table} className="input w-auto"><option value="">{AU.table}: {t.common.all}</option>{tables.map((x) => <option key={x}>{x}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>{t.common.date}</th><th>{AU.actor}</th><th>{AU.table}</th><th>{AU.action}</th><th>{AU.record}</th><th>{AU.changes}</th></tr></thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs text-slate-500">{formatDate(l.created_at, locale, true)}</td>
                <td className="text-xs" dir="ltr">{who(l.actor_id)}</td>
                <td className="font-mono text-xs">{l.table_name}</td>
                <td className="text-xs">{l.action}</td>
                <td className="font-mono text-xs">{l.record_id?.slice(0, 8)}</td>
                <td className="max-w-md text-xs break-all text-slate-600" dir="ltr">{diff(l.old_data as Record<string, unknown> | null, l.new_data as Record<string, unknown> | null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} hrefFor={(p) => `/${locale}/admin/audit?table=${table}&page=${p}`} labels={{ prev: t.common.prev, next: t.common.next, page: t.common.page }} />
    </div>
  );
}
