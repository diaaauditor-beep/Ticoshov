import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { updatePasswordAction } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const { locale, t } = await resolveLocale(params);
  // The recovery link signs the user in via /auth/confirm before landing here.
  if (!(await getViewer())) redirect(`/${locale}/login?error=link`);
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy-900">{t.auth.resetTitle}</h1>
      <ActionForm action={updatePasswordAction} errors={t.errors} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <TextField name="password" type="password" label={t.auth.newPassword} hint={t.auth.passwordHint} required minLength={8} autoComplete="new-password" dir="ltr" />
        <TextField name="password_confirm" type="password" label={t.auth.confirmPassword} required autoComplete="new-password" dir="ltr" />
        <SubmitButton className="btn btn-primary w-full">{t.auth.updatePassword}</SubmitButton>
      </ActionForm>
    </div>
  );
}
