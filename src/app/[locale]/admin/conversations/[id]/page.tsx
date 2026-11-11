import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Section } from "@/components/ui/primitives";
import { Conversation } from "@/components/Conversation";

export default async function AdminConversationPage({ params }: PageProps<"/[locale]/admin/conversations/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: c } = await supabase.from("conversations").select("id, subject").eq("id", id).maybeSingle();
  if (!c) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={c.subject} />
      <Section><Conversation conversationId={c.id} t={t} locale={locale} myCompanyId={null} isStaff /></Section>
    </div>
  );
}
