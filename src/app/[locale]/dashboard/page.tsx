import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName } from "@/lib/reference";
import { PageHeader, Stat, Notice, EmptyState } from "@/components/ui/primitives";
import { DealsTable, RfqsTable, type DealRow, type RfqRow } from "@/components/tables";
import { formatMoney } from "@/lib/format";
import { ProviderDealsTable } from "@/components/ProviderDealsTable";

const ACTIVE = ["negotiation", "quotation_accepted", "awaiting_payment_confirmation", "payment_confirmed", "production", "ready_for_shipment", "shipped", "delivered", "disputed"] as const;

export default async function DashboardHome({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  const sp = await searchParams;
  const supabase = await createClient();
  if (viewer.company.kind === "service_provider") {
    const base0 = `/${locale}/dashboard`;
    const [{ data: assigned }, unreadN] = await Promise.all([
      supabase.rpc("my_provider_deals"),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    const active = (assigned ?? []).filter((r) => r.status !== "completed" && r.status !== "cancelled").length;
    return (
      <div className="space-y-8">
        <PageHeader title={`${t.dashboard.welcome}, ${viewer.profile.full_name || viewer.company.name}`} description={t.providers.intro} />
        {!viewer.emailConfirmed && <Notice>{t.dashboard.emailBanner}</Notice>}
        {viewer.company.verification_status !== "approved" && (
          <Notice>
            <span className="flex flex-wrap items-center justify-between gap-2">
              {t.providers.verifyFirst}
              <Link href={`${base0}/verification`} className="btn btn-primary btn-sm">{t.dashboard.verifyCta}</Link>
            </span>
          </Notice>
        )}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label={t.dashboard.activeDeals} value={active} href={`${base0}/deals`} />
          <Stat label={t.nav.assignedDeals} value={assigned?.length ?? 0} href={`${base0}/deals`} />
          <Stat label={t.dashboard.unread} value={unreadN.count ?? 0} href={`${base0}/notifications`} />
        </div>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">{t.nav.assignedDeals}</h2>
            <Link href={`${base0}/deals`} className="link text-sm">{t.common.viewAll}</Link>
          </div>
          <ProviderDealsTable t={t} locale={locale} limit={5} />
        </section>
      </div>
    );
  }
  const ref = await getReference();
  const supplier = viewer.company.kind === "supplier";
  const cid = viewer.company.id;
  const base = `/${locale}/dashboard`;

  const dealSelect = "id, reference, title, status, deal_value, currency_code, updated_at, buyer:companies!deals_buyer_company_id_fkey(name, name_ar), supplier:companies!deals_supplier_company_id_fkey(name, name_ar)";
  const [openRfqs, activeDeals, pendingQuotes, products, unread, recentDeals, recentRfqs, commissions] = await Promise.all([
    supplier
      ? supabase.from("rfqs").select("id", { count: "exact", head: true }).eq("status", "open").neq("buyer_company_id", cid)
      : supabase.from("rfqs").select("id", { count: "exact", head: true }).eq("status", "open").eq("buyer_company_id", cid),
    supabase.from("deals").select("id", { count: "exact", head: true }).in("status", [...ACTIVE]),
    supplier
      ? supabase.from("quotations").select("id", { count: "exact", head: true }).eq("supplier_company_id", cid).in("status", ["submitted", "negotiating"])
      : supabase.from("quotations").select("id, rfqs!inner(buyer_company_id)", { count: "exact", head: true }).eq("rfqs.buyer_company_id", cid).in("status", ["submitted", "negotiating"]),
    supplier ? supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "published") : Promise.resolve({ count: null }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("deals").select(dealSelect).order("updated_at", { ascending: false }).limit(5),
    supplier
      ? supabase.from("rfqs").select("id, reference, title, status, quantity, unit_code, delivery_country, expires_at, created_at, buyer:companies!rfqs_buyer_company_id_fkey(name, name_ar)").eq("status", "open").neq("buyer_company_id", cid).order("created_at", { ascending: false }).limit(5)
      : supabase.from("rfqs").select("id, reference, title, status, quantity, unit_code, delivery_country, expires_at, created_at, quotations(count)").eq("buyer_company_id", cid).order("created_at", { ascending: false }).limit(5),
    supplier ? supabase.from("commissions").select("amount, amount_paid, currency_code, status").in("status", ["due", "overdue", "partially_paid"]) : Promise.resolve({ data: [] }),
  ]);

  const outstanding = new Map<string, number>();
  for (const c of (commissions.data ?? []) as Array<{ amount: number; amount_paid: number; currency_code: string }>) {
    outstanding.set(c.currency_code, (outstanding.get(c.currency_code) ?? 0) + Number(c.amount) - Number(c.amount_paid));
  }
  const notVerified = supplier && viewer.company.verification_status !== "approved";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t.dashboard.welcome}, ${viewer.profile.full_name || viewer.company.name}`}
        description={supplier ? t.dashboard.supplierIntro : t.dashboard.buyerIntro}
        actions={supplier
          ? <Link href={`${base}/products/new`} className="btn btn-primary">{t.nav.newProduct}</Link>
          : <Link href={`${base}/rfqs/new`} className="btn btn-primary">{t.nav.newRfq}</Link>}
      />
      {sp.password === "updated" && <Notice tone="green">{t.auth.passwordUpdated}</Notice>}
      {!viewer.emailConfirmed && <Notice>{t.dashboard.emailBanner}</Notice>}
      {notVerified && (
        <Notice>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t.dashboard.verifyBanner}
            <Link href={`${base}/verification`} className="btn btn-primary btn-sm">{t.dashboard.verifyCta}</Link>
          </span>
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t.dashboard.openRfqs} value={openRfqs.count ?? 0} href={`${base}/rfqs`} />
        <Stat label={t.dashboard.pendingQuotes} value={pendingQuotes.count ?? 0} href={supplier ? `${base}/quotations` : `${base}/rfqs`} />
        <Stat label={t.dashboard.activeDeals} value={activeDeals.count ?? 0} href={`${base}/deals`} />
        {supplier ? (
          outstanding.size > 0
            ? <Stat label={t.dashboard.outstandingCommission} value={[...outstanding].map(([c, v]) => formatMoney(v, c, locale)).join(" · ")} href={`${base}/commissions`} />
            : <Stat label={t.dashboard.publishedProducts} value={products.count ?? 0} href={`${base}/products`} />
        ) : (
          <Stat label={t.dashboard.unread} value={unread.count ?? 0} href={`${base}/notifications`} />
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">{t.dashboard.recentRfqs}</h2>
          <Link href={`${base}/rfqs`} className="link text-sm">{t.common.viewAll}</Link>
        </div>
        {recentRfqs.data && recentRfqs.data.length > 0 ? (
          <RfqsTable rows={recentRfqs.data as unknown as RfqRow[]} t={t} locale={locale} base={`${base}/rfqs`} showBuyer={supplier}
            unitLabel={(c) => unitName(ref, c, locale)} countryLabel={(c) => countryName(ref, c, locale)} />
        ) : (
          <EmptyState title={t.rfq.noRfqs} description={supplier ? t.rfq.noRfqsSupplier : t.rfq.noRfqsBuyer} />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">{t.dashboard.recentDeals}</h2>
          <Link href={`${base}/deals`} className="link text-sm">{t.common.viewAll}</Link>
        </div>
        {recentDeals.data && recentDeals.data.length > 0
          ? <DealsTable rows={recentDeals.data as unknown as DealRow[]} t={t} locale={locale} base={`${base}/deals`} />
          : <EmptyState title={t.deal.noDeals} description={t.deal.noDealsText} />}
      </section>
    </div>
  );
}
