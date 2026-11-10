import { ActionForm, FileField, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { CheckboxGroup } from "@/components/CompanyFields";
import { SpecsEditor } from "@/components/SpecsEditor";
import { Notice } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { options, type Reference } from "@/lib/reference";
import { saveProductAction } from "@/app/actions/products";
import type { Database } from "@/lib/supabase/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductForm({ t, locale, reference, companyId, product, specs = [], canPublish }: {
  t: Dictionary; locale: Locale; reference: Reference; companyId: string; product?: Product;
  specs?: Array<{ key: string; value: string }>; canPublish: boolean;
}) {
  const o = options(reference, locale);
  const statuses = (["draft", "published", "archived"] as const)
    .filter((s) => canPublish || s !== "published" || product?.status === "published")
    .map((s) => ({ value: s, label: t.enums.productStatus[s] }));
  const v = (x: unknown) => (x == null ? undefined : String(x));
  return (
    <ActionForm action={saveProductAction} errors={t.errors} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="company_id" value={companyId} />
      {product && <input type="hidden" name="product_id" value={product.id} />}
      {!canPublish && <Notice>{t.product.publishNeedsVerification}</Notice>}
      <div className="card card-pad space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name_en" label={t.product.nameEn} required defaultValue={v(product?.name_en)} dir="ltr" maxLength={200} />
          <TextField name="name_ar" label={t.product.nameAr} required defaultValue={v(product?.name_ar)} dir="rtl" maxLength={200} />
          <SelectField name="category_id" label={t.product.category} required options={o.categories} defaultValue={v(product?.category_id)} placeholder="" />
          <TextField name="sku" label={t.product.sku} defaultValue={v(product?.sku)} dir="ltr" maxLength={80} />
        </div>
        <TextArea name="description_en" label={t.product.descriptionEn} defaultValue={v(product?.description_en)} dir="ltr" maxLength={8000} />
        <TextArea name="description_ar" label={t.product.descriptionAr} defaultValue={v(product?.description_ar)} dir="rtl" maxLength={8000} />
      </div>
      <div className="card card-pad grid gap-4 sm:grid-cols-3">
        <TextField name="moq" type="number" step="any" min={0} label={t.product.moq} required defaultValue={v(product?.moq)} />
        <SelectField name="unit_code" label={t.product.unit} required options={o.units} defaultValue={v(product?.unit_code) ?? "piece"} />
        <TextField name="available_quantity" type="number" step="any" min={0} label={t.product.available} defaultValue={v(product?.available_quantity)} />
        <TextField name="price_min" type="number" step="0.01" min={0} label={t.product.priceMin} defaultValue={v(product?.price_min)} />
        <TextField name="price_max" type="number" step="0.01" min={0} label={t.product.priceMax} defaultValue={v(product?.price_max)} />
        <SelectField name="currency_code" label={t.product.currency} required options={o.currencies} defaultValue={v(product?.currency_code) ?? "USD"} />
        <SelectField name="origin_country" label={t.product.origin} required options={o.allCountries} defaultValue={v(product?.origin_country) ?? "EG"} />
        <TextField name="lead_time_days" type="number" min={0} max={730} label={t.product.leadTime} defaultValue={v(product?.lead_time_days)} />
        <SelectField name="status" label={t.product.status} options={statuses} defaultValue={product?.status ?? "draft"} />
      </div>
      <div className="card card-pad space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="export_available" defaultChecked={product?.export_available ?? true} className="size-4 rounded border-slate-300" />
          {t.product.exportAvailable}
        </label>
        <div>
          <p className="label">{t.product.exportCountries}</p>
          <CheckboxGroup name="export_countries" items={o.allCountries} selected={product?.export_countries ?? ["SA"]} />
        </div>
      </div>
      <div className="card card-pad">
        <p className="label">{t.product.specs}</p>
        <p className="hint mb-3">{t.product.specsHint}</p>
        <SpecsEditor initial={specs} labels={{ key: t.product.specKey, value: t.product.specValue, add: t.product.addSpec, remove: t.common.remove }} />
      </div>
      <div className="card card-pad">
        <FileField name="images" label={t.product.images} hint={t.product.imagesHint} accept="image/png,image/jpeg,image/webp" multiple />
      </div>
      <div className="flex justify-end"><SubmitButton>{t.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
