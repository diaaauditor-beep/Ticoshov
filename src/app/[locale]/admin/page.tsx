import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, options, categoryName } from "@/lib/reference";
import { PageHeader, Section, Stat } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/form";
import { BarList, ColumnChart } from "@/components/charts";
import { refreshOverdueAction } from "@/app/actions/admin";
import { formatMoney } from "@/lib/format";
import { sp } from "@/lib/search";
import type { Database } from "@/lib/supabase/database.types";

type Stats = {
  total_users: number; approved_suppliers: number; pending_verifications: number; active_buyers: number;
  published_products: number; active_rfqs: number; submitted_quotations: number; deals_in_progress: number;
  deals_completed: number; open_disputes: number; transaction_value: Record<string, number>;
  expected_commissions: Record<string, number>; collected_commissions: Record<string, number>; overdue_commissions: Record<string, number>;
  deals_by_status: Record<string, number>; deals_by_month: Array<{ month: string; count: number }>;
  rfqs_by_month: Array<{ month: string; count: number }>; top_categories: Array<{ category_id: string; count: number }>;
};

export default async function AdminHome({ params, searchParams }: PageProps<"/[locale]/admin">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const supabase = await createClient();
  const ref = await getReference();
  const o = options(ref, locale);
  const from = sp(s.from), to = sp(s.to), country = sp(s.country), category = sp(s.category), supplier = sp(s.supplier), status = sp(s.status);
  const { data: suppliers } = await supabase.from("companies").select("id, name").eq("kind", "supplier").order("name").limit(500);
  const { data, error } = await supabase.rpc("admin_dashboard_stats", {
    p_from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? `${from}T00:00:00Z` : undefined,
    p_to: /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59Z` : undefined,
    p_country: /^[A-Z]{2}$/.test(country) ? country : undefined,
    p_category: /^[0-9a-f-]{36}$/.test(category) ? category : undefined,
    p_supplier: /^[0-9a-f-]{36}$/.test(supplier) ? supplier : undefined,
    p_status: status && status in t.enums.dealStatus ? (status as Database["public"]["Enums"]["deal_status"]) : undefined,
  });
  const st = (data ?? {}) as Stats;
  const money = (m: Record<string, number> | undefined) => {
    const e = Object.entries(m ?? {});
    return e.length ? e.map(([c, v]) => formatMoney(v, c, locale)).join(" · ") : "—";
  };
  const A = t.admin;

  return (
    <div className="space-y-6">
      <PageHeader title={A.title} description={A.text}
        actions={<ActionButton action={refreshOverdueAction} errors={t.errors}>{A.refreshOverdue}</ActionButton>} />
      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7 lg:items-end">
        <div><label className="label" htmlFor="from">{A.filterDateFrom}</label><input id="from" type="date" name="from" defaultValue={from} className="input" /></div>
        <div><label className="label" htmlFor="to">{A.filterDateTo}</label><input id="to" type="date" name="to" defaultValue={to} className="input" /></div>
        <div><label className="label" htmlFor="country">{t.common.country}</label><select id="country" name="country" defaultValue={country} className="input"><option value="">{t.common.all}</option>{o.allCountries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="category">{t.common.category}</label><select id="category" name="category" defaultValue={category} className="input"><option value="">{t.common.all}</option>{o.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="supplier">{t.common.supplier}</label><select id="supplier" name="supplier" defaultValue={supplier} className="input"><option value="">{t.common.all}</option>{(suppliers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="status">{t.common.status}</label><select id="status" name="status" defaultValue={status} className="input"><option value="">{t.common.all}</option>{Object.entries(t.enums.dealStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button className="btn btn-primary">{t.common.apply}</button>
      </form>
      {error && <p className="text-sm text-red-600">{t.errors.generic}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label={A.totalUsers} value={st.total_users ?? 0} href={`/${locale}/admin/users`} />
        <Stat label={A.approvedSuppliers} value={st.approved_suppliers ?? 0} href={`/${locale}/admin/companies?kind=supplier`} />
        <Stat label={A.pendingVerifications} value={st.pending_verifications ?? 0} href={`/${locale}/admin/verifications`} />
        <Stat label={A.activeBuyers} value={st.active_buyers ?? 0} />
        <Stat label={A.publishedProducts} value={st.published_products ?? 0} />
        <Stat label={A.activeRfqs} value={st.active_rfqs ?? 0} href={`/${locale}/admin/rfqs`} />
        <Stat label={A.submittedQuotations} value={st.submitted_quotations ?? 0} />
        <Stat label={A.dealsInProgress} value={st.deals_in_progress ?? 0} href={`/${locale}/admin/deals`} />
        <Stat label={A.dealsCompleted} value={st.deals_completed ?? 0} />
        <Stat label={A.disputes} value={st.open_disputes ?? 0} href={`/${locale}/admin/disputes`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label={A.transactionValue} value={<span className="text-lg">{money(st.transaction_value)}</span>} />
        <Stat label={A.expectedCommissions} value={<span className="text-lg">{money(st.expected_commissions)}</span>} href={`/${locale}/admin/commissions`} />
        <Stat label={A.collectedCommissions} value={<span className="text-lg">{money(st.collected_commissions)}</span>} />
        <Stat label={A.overdueCommissions} value={<span className="text-lg">{money(st.overdue_commissions)}</span>} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={A.dealsByMonth}><ColumnChart data={(st.deals_by_month ?? []).map((d) => ({ label: d.month, value: d.count }))} empty={A.noData} valueLabel={A.dealsByMonth} /></Section>
        <Section title={A.rfqsByMonth}><ColumnChart data={(st.rfqs_by_month ?? []).map((d) => ({ label: d.month, value: d.count }))} empty={A.noData} valueLabel={A.rfqsByMonth} /></Section>
        <Section title={A.dealsByStatus}><BarList data={Object.entries(st.deals_by_status ?? {}).map(([k, v]) => ({ label: t.enums.dealStatus[k as keyof typeof t.enums.dealStatus] ?? k, value: v }))} empty={A.noData} /></Section>
        <Section title={A.topCategories}><BarList data={(st.top_categories ?? []).map((c) => ({ label: categoryName(ref, c.category_id, locale), value: c.count }))} empty={A.noData} /></Section>
      </div>
    </div>
  );
}
