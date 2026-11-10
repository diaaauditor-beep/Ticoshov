import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireViewer } from "@/lib/auth";
import { getReference } from "@/lib/reference";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { CompanyFields } from "@/components/CompanyFields";
import { Notice } from "@/components/ui/primitives";
import { createCompanyAction } from "@/app/actions/company";

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireViewer(locale);
  if (viewer.isStaff) redirect(`/${locale}/admin`);
  if (viewer.company) redirect(`/${locale}/dashboard`);
  const ref = await getReference();
  return (
    <>
      <SiteHeader locale={locale} t={t} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brass-600 uppercase">{t.enums.role[viewer.profile.role]}</p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-900">{t.onboarding.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.onboarding.text}</p>
        {viewer.profile.role === "supplier" && <div className="mt-4"><Notice tone="navy">{t.onboarding.supplierNext}</Notice></div>}
        <ActionForm action={createCompanyAction} errors={t.errors} className="card card-pad mt-6">
          <input type="hidden" name="locale" value={locale} />
          <CompanyFields t={t} locale={locale} ref={ref} d={{ country_code: viewer.profile.role === "buyer" ? "SA" : "EG", contact_name: viewer.profile.full_name, contact_email: viewer.email }} />
          <div className="mt-8 flex justify-end"><SubmitButton>{t.onboarding.create}</SubmitButton></div>
        </ActionForm>
      </main>
    </>
  );
}
