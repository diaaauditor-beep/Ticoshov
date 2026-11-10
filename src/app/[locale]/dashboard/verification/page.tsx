import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton, ActionForm, FileField, SelectField, SubmitButton } from "@/components/ui/form";
import { Notice, PageHeader, Section, StatusBadge, VerifiedBadge } from "@/components/ui/primitives";
import { deleteVerificationDocAction, submitVerificationAction, uploadVerificationDocAction } from "@/app/actions/company";
import { bytes, formatDate } from "@/lib/format";

export default async function VerificationPage({ params }: PageProps<"/[locale]/dashboard/verification">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  if (viewer.company.kind !== "supplier") redirect(`/${locale}/dashboard`);
  const supabase = await createClient();
  const { data: ver } = await supabase.from("supplier_verifications").select("*").eq("company_id", viewer.company.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: docs } = ver
    ? await supabase.from("verification_documents").select("*").eq("verification_id", ver.id).order("created_at")
    : { data: [] };
  const status = viewer.company.verification_status;
  const canUpload = ver && (ver.status === "pending" || ver.status === "needs_documents") && !(ver.status === "pending" && ver.submitted_at);
  const canSubmit = ver && (ver.status === "needs_documents" || ver.status === "rejected" || (ver.status === "pending" && !ver.submitted_at));
  const manager = viewer.memberRole === "owner" || viewer.memberRole === "manager";
  const stateText =
    status === "approved" ? t.verification.approvedText
    : status === "rejected" ? t.verification.rejectedText
    : status === "needs_documents" ? t.verification.needsDocsText
    : ver?.submitted_at ? t.verification.waitingText : t.verification.pendingText;

  return (
    <div className="space-y-6">
      <PageHeader title={t.verification.title} description={t.verification.text} />
      <Section title={t.verification.status}>
        <div className="flex flex-wrap items-center gap-3">
          {status === "approved" ? <VerifiedBadge label={t.company.verified} /> : <StatusBadge status={status} label={t.enums.verificationStatus[status]} />}
          {ver?.submitted_at && <span className="text-sm text-slate-500">{t.verification.submitted} {formatDate(ver.submitted_at, locale)}</span>}
        </div>
        <p className="mt-3 text-sm text-slate-600">{stateText}</p>
        {status !== "approved" && <p className="mt-1 text-sm text-slate-500">{t.verification.productsHidden}</p>}
        {ver?.message_to_company && (
          <div className="mt-4"><Notice tone={status === "rejected" ? "red" : "navy"}><strong>{t.verification.messageFromTeam}:</strong> {ver.message_to_company}</Notice></div>
        )}
      </Section>

      <Section title={t.verification.documents}>
        <p className="mb-4 text-xs text-slate-500">{t.verification.privateNote}</p>
        {docs && docs.length > 0 ? (
          <ul className="mb-6 divide-y divide-slate-100 rounded-md border border-slate-200">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-navy-900">{t.enums.verificationDocType[d.doc_type]}</span>
                  <span className="text-slate-500"> · {d.file_name} {bytes(d.size_bytes)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <a className="link text-xs" href={`/files?path=${encodeURIComponent(d.storage_path)}`} target="_blank" rel="noopener">{t.common.download}</a>
                  {canUpload && manager && (
                    <ActionButton action={deleteVerificationDocAction} hidden={{ id: d.id }} errors={t.errors} className="btn btn-ghost btn-sm text-red-600" confirm={t.common.areYouSure}>{t.common.remove}</ActionButton>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="mb-6 text-sm text-slate-500">{t.common.noFiles}</p>}

        {canUpload && manager && ver && (
          <ActionForm action={uploadVerificationDocAction} errors={t.errors} onSuccessReset className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <input type="hidden" name="company_id" value={viewer.company.id} />
            <input type="hidden" name="verification_id" value={ver.id} />
            <SelectField name="doc_type" label={t.verification.docType} required
              options={Object.entries(t.enums.verificationDocType).map(([value, label]) => ({ value, label }))} />
            <FileField name="file" label={t.verification.file} required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
            <SubmitButton className="btn btn-secondary">{t.verification.uploadDoc}</SubmitButton>
          </ActionForm>
        )}
        {canSubmit && manager && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <ActionButton action={submitVerificationAction} hidden={{ company_id: viewer.company.id }} errors={t.errors} className="btn btn-primary">
              {t.verification.submit}
            </ActionButton>
          </div>
        )}
      </Section>
    </div>
  );
}
