import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/ui/primitives";
import { Conversation } from "@/components/Conversation";

export default async function ConversationPage({ params }: PageProps<"/[locale]/dashboard/messages/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const { data: c } = await supabase.from("conversations").select("id, subject, deal_id, rfq_id").eq("id", id).maybeSingle();
  if (!c) notFound();
  if (c.deal_id) redirect(`/${locale}/dashboard/deals/${c.deal_id}`);
  return (
    <div className="max-w-3xl">
      <PageHeader title={c.subject} actions={c.rfq_id && <Link href={`/${locale}/dashboard/rfqs/${c.rfq_id}`} className="btn btn-secondary">{t.deal.rfqLink}</Link>} />
      <Section><Conversation conversationId={c.id} t={t} locale={locale} myCompanyId={viewer.company.id} isStaff={false} /></Section>
    </div>
  );
}
