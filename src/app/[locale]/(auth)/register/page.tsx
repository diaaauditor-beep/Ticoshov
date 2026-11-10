import Link from "next/link";
import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/get-dictionary";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { signUpAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const preselected = sp.role === "supplier" ? "supplier" : "buyer";
  const roles = [
    ["buyer", t.auth.roleBuyerTitle, t.auth.roleBuyerText],
    ["supplier", t.auth.roleSupplierTitle, t.auth.roleSupplierText],
  ] as const;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy-900">{t.auth.registerTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.auth.registerText}</p>
      <ActionForm action={signUpAction} errors={t.errors} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <fieldset>
          <legend className="label">{t.auth.iAm}</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(([value, title, text]) => (
              <label key={value} className="cursor-pointer rounded-lg border border-slate-300 bg-white p-3 has-checked:border-navy-700 has-checked:ring-2 has-checked:ring-navy-700/15">
                <input type="radio" name="role" value={value} defaultChecked={value === preselected} className="sr-only" />
                <span className="block text-sm font-semibold text-navy-900">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextField name="full_name" label={t.auth.fullName} required autoComplete="name" maxLength={120} />
        <TextField name="email" type="email" label={t.auth.email} required autoComplete="email" dir="ltr" />
        <TextField name="password" type="password" label={t.auth.password} hint={t.auth.passwordHint} required minLength={8} autoComplete="new-password" dir="ltr" />
        <TextField name="password_confirm" type="password" label={t.auth.confirmPassword} required autoComplete="new-password" dir="ltr" />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="terms" required className="mt-1 size-4 rounded border-slate-300" />
          <span>
            {t.auth.acceptTerms}{" "}
            <Link href={`/${locale}/legal/terms`} className="link" target="_blank">{t.legal.terms}</Link> ·{" "}
            <Link href={`/${locale}/legal/privacy`} className="link" target="_blank">{t.legal.privacy}</Link>
          </span>
        </label>
        <SubmitButton className="btn btn-primary w-full">{t.common.signUp}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t.auth.haveAccount} <Link className="link" href={`/${locale}/login`}>{t.common.signIn}</Link>
      </p>
    </div>
  );
}
