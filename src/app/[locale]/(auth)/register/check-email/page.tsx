import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";

export default async function CheckEmailPage({ params }: PageProps<"/[locale]/register/check-email">) {
  const { locale, t } = await resolveLocale(params);
  return (
    <div className="card card-pad text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-navy-50 text-navy-700">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M3 7l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-navy-900">{t.auth.checkEmailTitle}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t.auth.checkEmailText}</p>
      <Link href={`/${locale}/login`} className="btn btn-primary mt-6">{t.common.signIn}</Link>
    </div>
  );
}
