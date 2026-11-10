import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName } from "@/lib/reference";
import { ActionButton, ActionForm, SelectField, SubmitButton, TextArea } from "@/components/ui/form";
import { DL, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { FileList } from "@/components/FileList";
import { reviewVerificationAction, startReviewAction } from "@/app/actions/admin";
import { formatDate, loc } from "@/lib/format";

export default async function VerificationReviewPage({ params }: PageProps<"/[locale]/admin/verifications/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: v } = await supabase.from("supplier_verifications").select("*, companies(id, name, name_ar, country_code, city, business_type, website)").eq("id", id).maybeSingle();
  if (!v) notFound();
  const [{ data: docs }, { data: legal }, ref] = await Promise.all([
    supabase.from("verification_documents").select("*").eq("verification_id", id).order("created_at"),
    supabase.from("company_legal").select("*").eq("company_id", v.company_id).maybeSingle(),
    getReference(),
  ]);
  const V = t.admin.verifications;
  const c = v.companies;
  return (
    <div className="space-y-6">
      <PageHeader title={loc(locale, c?.name_ar, c?.name)} description={<StatusBadge status={v.status} label={t.enums.verificationStatus[v.status]} />}
        actions={<>
          <Link className="btn btn-secondary" href={`/${locale}/admin/companies/${v.company_id}`}>{t.common.details}</Link>
          {v.status === "pending" && v.submitted_at && <ActionButton action={startReviewAction} hidden={{ id }} errors={t.errors} className="btn btn-secondary">{V.startReview}</ActionButton>}
        </>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.common.details}>
          <DL items={[
            [t.company.country, `${c?.city}, ${countryName(ref, c?.country_code, locale)}`],
            [t.company.businessType, t.enums.businessType[c?.business_type as keyof typeof t.enums.businessType]],
            [t.company.crNumber, legal?.commercial_registration_no ?? "—"], [t.company.taxNumber, legal?.tax_number ?? "—"],
            [t.company.contactEmail, legal?.contact_email ?? "—"], [t.company.contactPhone, legal?.contact_phone ?? "—"],
            [V.submittedAt, formatDate(v.submitted_at, locale, true)], [t.common.updated, formatDate(v.reviewed_at, locale, true)],
          ]} />
        </Section>
        <Section title={t.verification.documents}>
          {docs?.length ? <FileList t={t} files={docs.map((d) => ({ ...d, tag: t.enums.verificationDocType[d.doc_type] }))} /> : <p className="text-sm text-slate-500">{V.noDocs}</p>}
        </Section>
      </div>
      <Section title={V.decision}>
        <ActionForm action={reviewVerificationAction} errors={t.errors} success={t.common.saved} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <SelectField name="status" label={V.decision} required defaultValue="approved"
            options={(["approved", "needs_documents", "rejected", "under_review"] as const).map((s) => ({ value: s, label: t.enums.verificationStatus[s] }))} />
          <TextArea name="message" label={V.message} rows={3} maxLength={2000} defaultValue={v.message_to_company ?? undefined} />
          <TextArea name="internal_notes" label={V.internal} rows={2} maxLength={4000} defaultValue={v.internal_notes ?? undefined} />
          <SubmitButton>{V.record}</SubmitButton>
        </ActionForm>
      </Section>
    </div>
  );
}
