import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference } from "@/lib/reference";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { CompanyFields } from "@/components/CompanyFields";
import { PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { updateCompanyAction } from "@/app/actions/company";
import { publicUrl } from "@/lib/storage";

export default async function CompanyPage({ params }: PageProps<"/[locale]/dashboard/company">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const c = viewer.company;
  const [{ data: legal }, { data: cats }, { data: members }, ref] = await Promise.all([
    supabase.from("company_legal").select("*").eq("company_id", c.id).maybeSingle(),
    supabase.from("company_categories").select("category_id").eq("company_id", c.id),
    supabase.from("company_members").select("member_role, created_at, profiles(full_name)").eq("company_id", c.id),
    getReference(),
  ]);
  const canEdit = viewer.memberRole === "owner" || viewer.memberRole === "manager";
  return (
    <div className="space-y-6">
      <PageHeader
        title={t.company.profileTitle}
        description={<span className="flex items-center gap-2">{t.enums.companyKind[c.kind]} · <StatusBadge status={c.verification_status} label={t.enums.verificationStatus[c.verification_status]} /></span>}
        actions={<Link href={`/${locale}/companies/${c.slug}`} className="btn btn-secondary">{t.common.view}</Link>}
      />
      {c.logo_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicUrl(c.logo_path)!} alt="" className="size-16 rounded-lg border border-slate-200 bg-white object-contain" />
      )}
      <ActionForm action={updateCompanyAction} errors={t.errors} success={t.common.saved} className="card card-pad">
        <input type="hidden" name="company_id" value={c.id} />
        <fieldset disabled={!canEdit}>
          <CompanyFields t={t} locale={locale} ref={ref}
            d={{ ...c, ...(legal ?? {}) } as unknown as Record<string, string | number | null | string[]>}
            selectedCategories={(cats ?? []).map((x) => x.category_id)} />
        </fieldset>
        {canEdit && <div className="mt-8 flex justify-end"><SubmitButton>{t.common.save}</SubmitButton></div>}
      </ActionForm>
      <Section title={t.company.team}>
        <ul className="divide-y divide-slate-100 text-sm">
          {(members ?? []).map((m, i) => (
            <li key={i} className="flex items-center justify-between py-2">
              <span>{m.profiles?.full_name || "—"}</span>
              <span className="text-slate-500">{t.enums.memberRole[m.member_role]}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
