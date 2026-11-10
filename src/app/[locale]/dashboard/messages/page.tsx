import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { PageHeader } from "@/components/ui/primitives";
import { ConversationsList } from "@/components/shared/ConversationsList";

export default async function MessagesPage({ params }: PageProps<"/[locale]/dashboard/messages">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  return (
    <div>
      <PageHeader title={t.messages.title} />
      <ConversationsList t={t} locale={locale} base={`/${locale}/dashboard/messages`} myCompanyId={viewer.company.id} />
    </div>
  );
}
