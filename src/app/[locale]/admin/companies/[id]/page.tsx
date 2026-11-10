import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName } from "@/lib/reference";
import { ActionButton } from "@/components/ui/form";
import { DL, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { setCompanyActiveAction } from "@/app/actions/admin";
import { formatDate, loc } from "@/lib/format";

export default async function AdminCompanyPage({ params }: PageProps<"/[locale]/admin/companies/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: legal }, { data: members }, { data: vers }, ref] = await Promise.all([
    supabase.from("company_legal").select("*").eq("company_id", id).maybeSingle(),
    supabase.from("company_members").select("member_role, created_at, profiles(full_name, role)").eq("company_id", id),
    supabase.from("supplier_verifications").select("id, status, submitted_at, reviewed_at").eq("company_id", id).order("created_at", { ascending: false }),
    getReference(),
  ]);
  const C = t.admin.companies;
  return (
    <div className="space-y-6">
      <PageHeader title={loc(locale, c.name_ar, c.name)}
        description={<span className="flex items-center gap-2">{t.enums.companyKind[c.kind]} · <StatusBadge status={c.verification_status} label={t.enums.verificationStatus[c.verification_status]} /></span>}
        actions={<>
          <Link href={`/${locale}/companies/${c.slug}`} className="btn btn-secondary">{t.common.view}</Link>
          <ActionButton action={setCompanyActiveAction} hidden={{ id, active: String(!c.is_active) }} errors={t.errors} confirm={t.common.areYouSure}
            className={c.is_active ? "btn btn-secondary text-red-600" : "btn btn-primary"}>{c.is_active ? C.deactivate : C.activate}</ActionButton>
        </>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.common.details}>
          <DL items={[
            [t.company.country, `${c.city}, ${countryName(ref, c.country_code, locale)}`],
            [t.company.businessType, t.enums.businessType[c.business_type as keyof typeof t.enums.businessType]],
            [t.company.website, c.website ?? "—"], [t.company.yearEstablished, c.year_established ?? "—"],
            [t.common.created, formatDate(c.created_at, locale)], [C.activeToggle, c.is_active ? t.common.yes : t.common.no],
          ]} />
        </Section>
        <Section title={C.legal}>
          <DL items={[
            [t.company.crNumber, legal?.commercial_registration_no ?? "—"], [t.company.taxNumber, legal?.tax_number ?? "—"],
            [t.company.contactName, legal?.contact_name ?? "—"], [t.company.contactEmail, legal?.contact_email ?? "—"],
            [t.company.contactPhone, legal?.contact_phone ?? "—"], [t.company.address, legal?.address_line ?? "—"],
          ]} />
        </Section>
        <Section title={C.members}>
          <ul className="space-y-1 text-sm">{(members ?? []).map((m, i) => <li key={i}>{m.profiles?.full_name || "—"} · {t.enums.memberRole[m.member_role]}</li>)}</ul>
        </Section>
        {c.kind === "supplier" && (
          <Section title={t.admin.verifications.history}>
            <ul className="space-y-1 text-sm">{(vers ?? []).map((v) => (
              <li key={v.id} className="flex items-center gap-2"><Link className="link" href={`/${locale}/admin/verifications/${v.id}`}>{formatDate(v.submitted_at, locale)}</Link><StatusBadge status={v.status} label={t.enums.verificationStatus[v.status]} /></li>
            ))}</ul>
          </Section>
        )}
      </div>
    </div>
  );
}
