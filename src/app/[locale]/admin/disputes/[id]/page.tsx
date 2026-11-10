import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton, ActionForm, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { DL, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { resolveDisputeAction, setDisputeReviewAction } from "@/app/actions/admin";
import { formatDate, loc } from "@/lib/format";

export default async function AdminDisputePage({ params }: PageProps<"/[locale]/admin/disputes/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: d } = await supabase.from("disputes")
    .select("*, deals(id, reference, title, status), raised:companies!disputes_raised_by_company_id_fkey(name, name_ar), against:companies!disputes_against_company_id_fkey(name, name_ar)")
    .eq("id", id).maybeSingle();
  if (!d) notFound();
  const open = d.status === "open" || d.status === "under_review";
  const D = t.disputesPage;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`${D.title} · ${d.deals?.reference}`} description={<StatusBadge status={d.status} label={t.enums.disputeStatus[d.status]} />}
        actions={<>
          <Link className="btn btn-secondary" href={`/${locale}/admin/deals/${d.deal_id}`}>{t.quote.openDeal}</Link>
          {d.status === "open" && <ActionButton action={setDisputeReviewAction} hidden={{ id }} errors={t.errors} className="btn btn-secondary">{D.markReview}</ActionButton>}
        </>} />
      <Section title={t.common.details}>
        <DL items={[
          [D.raisedBy, loc(locale, d.raised?.name_ar, d.raised?.name)], [D.against, loc(locale, d.against?.name_ar, d.against?.name)],
          [t.deal.disputeReason, t.enums.disputeReason[d.reason as keyof typeof t.enums.disputeReason]], [t.common.created, formatDate(d.created_at, locale, true)],
          [t.common.status, t.enums.dealStatus[d.deals?.status ?? "disputed"]],
        ]} />
        <p className="mt-4 text-sm whitespace-pre-line text-slate-700">{d.description}</p>
        {d.resolution && <p className="mt-4 text-sm"><strong>{D.resolution}:</strong> {d.resolution}</p>}
      </Section>
      {open && (
        <Section title={D.resolve}>
          <ActionForm action={resolveDisputeAction} errors={t.errors} success={t.common.saved} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <SelectField name="outcome" label={D.outcome} required options={Object.entries(D.outcomes).map(([value, label]) => ({ value, label }))} />
            <TextArea name="resolution" label={D.resolution} required minLength={3} maxLength={5000} rows={4} />
            <SubmitButton>{D.resolve}</SubmitButton>
          </ActionForm>
        </Section>
      )}
    </div>
  );
}
