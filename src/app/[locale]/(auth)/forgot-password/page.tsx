import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { forgotPasswordAction } from "@/app/actions/auth";

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale, t } = await resolveLocale(params);
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy-900">{t.auth.forgotTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.auth.forgotText}</p>
      <ActionForm action={forgotPasswordAction} errors={t.errors} success={t.auth.linkSent} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <TextField name="email" type="email" label={t.auth.email} required autoComplete="email" dir="ltr" />
        <SubmitButton className="btn btn-primary w-full">{t.auth.sendLink}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm"><Link className="link" href={`/${locale}/login`}>{t.common.signIn}</Link></p>
    </div>
  );
}
