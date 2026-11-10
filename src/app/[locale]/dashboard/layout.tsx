import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const { count: unread } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  const base = `/${locale}/dashboard`;
  const supplier = viewer.company.kind === "supplier";
  const nav: NavGroup[] = [
    { items: [{ href: base, label: t.nav.overview, exact: true }] },
    {
      title: t.nav.marketplace,
      items: supplier
        ? [
            { href: `${base}/rfqs`, label: t.nav.rfqFeed },
            { href: `${base}/quotations`, label: t.nav.quotations },
            { href: `${base}/products`, label: t.nav.myProducts },
          ]
        : [
            { href: `${base}/rfqs`, label: t.nav.rfqs },
            { href: `/${locale}/products`, label: t.nav.products },
            { href: `/${locale}/suppliers`, label: t.nav.suppliers },
          ],
    },
    {
      title: t.nav.operations,
      items: [
        { href: `${base}/deals`, label: t.nav.deals },
        { href: `${base}/messages`, label: t.nav.messages },
        ...(supplier ? [{ href: `${base}/commissions`, label: t.nav.commissions }] : []),
        { href: `${base}/disputes`, label: t.nav.disputes },
        { href: `${base}/notifications`, label: t.nav.notifications, badge: unread ?? 0 },
      ],
    },
    {
      title: t.nav.account,
      items: [
        { href: `${base}/company`, label: t.nav.companyProfile },
        ...(supplier ? [{ href: `${base}/verification`, label: t.nav.verification }] : []),
      ],
    },
  ];
  return <DashboardShell locale={locale} t={t} viewer={viewer} nav={nav} unread={unread ?? 0}>{children}</DashboardShell>;
}
