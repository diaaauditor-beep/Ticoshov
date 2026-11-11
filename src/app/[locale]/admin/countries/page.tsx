import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { PageHeader, Section } from "@/components/ui/primitives";
import { saveCountryAction, saveCurrencyAction } from "@/app/actions/admin";

export default async function CountriesAdminPage({ params }: PageProps<"/[locale]/admin/countries">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale, true);
  const supabase = await createClient();
  const [{ data: countries }, { data: currencies }] = await Promise.all([
    supabase.from("countries").select("*").order("is_active", { ascending: false }).order("name_en"),
    supabase.from("currencies").select("*").order("code"),
  ]);
  const C = t.admin.countries;
  const cur = (currencies ?? []).map((c) => c.code);
  const countryRow = (c?: NonNullable<typeof countries>[number]) => (
    <ActionForm key={c?.code ?? "new"} action={saveCountryAction} errors={t.errors} success={c ? undefined : t.common.saved} onSuccessReset={!c}
      className="grid items-center gap-2 px-4 py-2.5 sm:grid-cols-[60px_1.5fr_1.5fr_80px_90px_repeat(3,auto)_auto]">
      <input name="code" defaultValue={c?.code} readOnly={!!c} placeholder={C.code} maxLength={2} className="input py-1.5 uppercase" aria-label={C.code} dir="ltr" />
      <input name="name_en" defaultValue={c?.name_en} placeholder={C.nameEn} className="input py-1.5" aria-label={C.nameEn} dir="ltr" required />
      <input name="name_ar" defaultValue={c?.name_ar} placeholder={C.nameAr} className="input py-1.5" aria-label={C.nameAr} dir="rtl" required />
      <input name="phone_code" defaultValue={c?.phone_code} placeholder="+20" className="input py-1.5" aria-label={C.phone} dir="ltr" required />
      <select name="default_currency" defaultValue={c?.default_currency ?? ""} className="input py-1.5" aria-label={C.defaultCurrency}><option value="">—</option>{cur.map((x) => <option key={x}>{x}</option>)}</select>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? false} className="size-4" />{C.active}</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="supplier_enabled" defaultChecked={c?.supplier_enabled ?? true} className="size-4" />{C.supplierEnabled}</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="buyer_enabled" defaultChecked={c?.buyer_enabled ?? true} className="size-4" />{C.buyerEnabled}</label>
      <SubmitButton className={c ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}>{c ? t.common.save : C.addCountry}</SubmitButton>
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <PageHeader title={C.title} />
      <Section title={C.countries}><div className="-mx-5 -my-5 divide-y divide-slate-100">{(countries ?? []).map((c) => countryRow(c))}<div className="bg-slate-50">{countryRow()}</div></div></Section>
      <Section title={C.currencies}>
        <div className="-mx-5 -my-5 divide-y divide-slate-100">
          {[...(currencies ?? []), undefined].map((c) => (
            <ActionForm key={c?.code ?? "new"} action={saveCurrencyAction} errors={t.errors} onSuccessReset={!c} className={`grid items-center gap-2 px-4 py-2.5 sm:grid-cols-[80px_1.5fr_1.5fr_80px_auto_auto] ${c ? "" : "bg-slate-50"}`}>
              <input name="code" defaultValue={c?.code} readOnly={!!c} placeholder={C.code} maxLength={3} className="input py-1.5 uppercase" aria-label={C.code} dir="ltr" />
              <input name="name_en" defaultValue={c?.name_en} placeholder={C.nameEn} className="input py-1.5" required dir="ltr" aria-label={C.nameEn} />
              <input name="name_ar" defaultValue={c?.name_ar} placeholder={C.nameAr} className="input py-1.5" required dir="rtl" aria-label={C.nameAr} />
              <input name="symbol" defaultValue={c?.symbol} placeholder={C.symbol} className="input py-1.5" aria-label={C.symbol} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? true} className="size-4" />{C.active}</label>
              <SubmitButton className={c ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}>{c ? t.common.save : C.addCurrency}</SubmitButton>
            </ActionForm>
          ))}
        </div>
      </Section>
    </div>
  );
}
