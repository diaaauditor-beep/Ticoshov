import Link from "next/link";
import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/get-dictionary";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { signInAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy-900">{t.auth.loginTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.auth.loginText}</p>
      <div className="mt-6 space-y-3">
        {sp.error === "link" && <Notice tone="red">{t.auth.linkInvalid}</Notice>}
        {sp.error === "inactive" && <Notice tone="red">{t.errors.inactive}</Notice>}
      </div>
      <ActionForm action={signInAction} errors={t.errors} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />
        <TextField name="email" type="email" label={t.auth.email} required autoComplete="email" dir="ltr" />
        <TextField name="password" type="password" label={t.auth.password} required autoComplete="current-password" dir="ltr" />
        <div className="flex justify-end text-sm"><Link href={`/${locale}/forgot-password`} className="link">{t.auth.forgot}</Link></div>
        <SubmitButton className="btn btn-primary w-full">{t.common.signIn}</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t.auth.noAccount} <Link className="link" href={`/${locale}/register`}>{t.common.signUp}</Link>
      </p>
    </div>
  );
}
