import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { NotificationsList } from "@/components/shared/NotificationsList";

export default async function AdminNotificationsPage({ params }: PageProps<"/[locale]/admin/notifications">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  return <NotificationsList t={t} locale={locale} />;
}
