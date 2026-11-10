import { FileField, SelectField, TextArea, TextField } from "@/components/ui/form";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { options, type Reference } from "@/lib/reference";
import { loc } from "@/lib/format";

type Defaults = Partial<Record<string, string | number | null | string[]>>;

export function CheckboxGroup({ name, items, selected, columns = "sm:grid-cols-3" }: {
  name: string; items: Array<{ value: string; label: string }>; selected: string[]; columns?: string;
}) {
  return (
    <div className={`grid max-h-64 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 ${columns}`}>
      {items.map((i) => (
        <label key={i.value} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name={name} value={i.value} defaultChecked={selected.includes(i.value)} className="size-4 rounded border-slate-300" />
          {i.label}
        </label>
      ))}
    </div>
  );
}

export function CompanyFields({ t, locale, ref, d = {}, selectedCategories = [] }: {
  t: Dictionary; locale: Locale; ref: Reference; d?: Defaults; selectedCategories?: string[];
}) {
  const o = options(ref, locale);
  const businessTypes = Object.entries(t.enums.businessType).map(([value, label]) => ({ value, label }));
  const v = (k: string) => (d[k] == null ? undefined : String(d[k]));
  const arr = (k: string) => (Array.isArray(d[k]) ? (d[k] as string[]) : []);
  const allCategories = ref.categories.filter((c) => c.is_active).map((c) => ({
    value: c.id, label: c.parent_id ? `— ${loc(locale, c.name_ar, c.name_en)}` : loc(locale, c.name_ar, c.name_en),
  }));
  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">{t.onboarding.publicInfo}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label={t.company.name} required defaultValue={v("name")} maxLength={160} />
          <TextField name="name_ar" label={t.company.nameAr} defaultValue={v("name_ar")} dir="rtl" maxLength={160} />
          <SelectField name="country_code" label={t.company.country} required options={o.countries} defaultValue={v("country_code")} placeholder="" />
          <TextField name="city" label={t.company.city} required defaultValue={v("city")} maxLength={120} />
          <SelectField name="business_type" label={t.company.businessType} required options={businessTypes} defaultValue={v("business_type")} placeholder="" />
          <TextField name="year_established" type="number" min={1800} max={2100} label={t.company.yearEstablished} defaultValue={v("year_established")} />
          <TextField name="website" type="url" label={t.company.website} defaultValue={v("website")} dir="ltr" placeholder="https://" />
          <SelectField name="employees_range" label={t.company.employees} defaultValue={v("employees_range")} placeholder="—"
            options={["1-10", "11-50", "51-200", "201-500", "500+"].map((x) => ({ value: x, label: x }))} />
        </div>
        <TextArea name="description" label={t.company.description} defaultValue={v("description")} maxLength={4000} dir="ltr" />
        <TextArea name="description_ar" label={t.company.descriptionAr} defaultValue={v("description_ar")} maxLength={4000} dir="rtl" />
        <FileField name="logo" label={t.company.logo} hint={t.company.logoHint} accept="image/png,image/jpeg,image/webp" />
        <div>
          <p className="label">{t.company.categories}</p>
          <CheckboxGroup name="category_ids" items={allCategories} selected={selectedCategories} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">{t.company.exportMarkets}</p>
            <CheckboxGroup name="export_markets" items={o.allCountries} selected={arr("export_markets")} columns="sm:grid-cols-2" />
          </div>
          <div>
            <p className="label">{t.company.importMarkets}</p>
            <CheckboxGroup name="import_markets" items={o.allCountries} selected={arr("import_markets")} columns="sm:grid-cols-2" />
          </div>
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold text-navy-900">{t.onboarding.privateInfo}</legend>
        <p className="text-xs text-slate-500">{t.onboarding.privateHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="commercial_registration_no" label={t.company.crNumber} defaultValue={v("commercial_registration_no")} dir="ltr" maxLength={60} />
          <TextField name="tax_number" label={t.company.taxNumber} defaultValue={v("tax_number")} dir="ltr" maxLength={60} />
          <TextField name="contact_name" label={t.company.contactName} defaultValue={v("contact_name")} maxLength={120} />
          <TextField name="contact_email" type="email" label={t.company.contactEmail} defaultValue={v("contact_email")} dir="ltr" />
          <TextField name="contact_phone" type="tel" label={t.company.contactPhone} defaultValue={v("contact_phone")} dir="ltr" pattern="\+[0-9]{6,15}" />
          <TextField name="address_line" label={t.company.address} defaultValue={v("address_line")} maxLength={300} />
        </div>
      </fieldset>
    </div>
  );
}
