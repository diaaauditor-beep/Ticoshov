import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { NotificationsList } from "@/components/shared/NotificationsList";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/dashboard/notifications">) {
  const { locale, t } = await resolveLocale(params);
  await requireCompany(locale);
  return <NotificationsList t={t} locale={locale} />;
}
