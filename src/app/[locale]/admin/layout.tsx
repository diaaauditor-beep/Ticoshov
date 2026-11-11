import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell, type NavGroup } from "@/components/layout/DashboardShell";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const [{ count: unread }, { count: pendingVer }, { count: openDisputes }, { count: openReports }, { count: paymentsToReview }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("supplier_verifications").select("id", { count: "exact", head: true }).in("status", ["pending", "under_review"]).not("submitted_at", "is", null),
    supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    supabase.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("commission_payments").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  const b = `/${locale}/admin`;
  const nav: NavGroup[] = [
    { items: [{ href: b, label: t.nav.overview, exact: true }] },
    {
      title: t.nav.operations,
      items: [
        { href: `${b}/verifications`, label: t.nav.verifications, badge: pendingVer ?? 0 },
        { href: `${b}/companies`, label: t.nav.companies },
        { href: `${b}/rfqs`, label: t.admin.rfqsTitle },
        { href: `${b}/deals`, label: t.nav.deals },
        { href: `${b}/commissions`, label: t.nav.commissions, badge: viewer.isAdmin ? paymentsToReview ?? 0 : 0 },
        { href: `${b}/disputes`, label: t.nav.disputes, badge: openDisputes ?? 0 },
        { href: `${b}/reports`, label: t.nav.reports, badge: openReports ?? 0 },
        { href: `${b}/notifications`, label: t.nav.notifications, badge: unread ?? 0 },
      ],
    },
    ...(viewer.isAdmin ? [{
      title: t.nav.configuration,
      items: [
        { href: `${b}/users`, label: t.nav.users },
        { href: `${b}/categories`, label: t.nav.categories },
        { href: `${b}/countries`, label: t.nav.countries },
        { href: `${b}/settings`, label: t.nav.settings },
        { href: `${b}/audit`, label: t.nav.audit },
      ],
    }] : []),
  ];
  return <DashboardShell locale={locale} t={t} viewer={viewer} nav={nav} unread={unread ?? 0}>{children}</DashboardShell>;
}
