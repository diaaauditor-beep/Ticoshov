import { isoDateFromNow } from "@/lib/format";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, options } from "@/lib/reference";
import { ActionForm, FileField, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/primitives";
import { SpecsEditor } from "@/components/SpecsEditor";
import { createRfqAction } from "@/app/actions/trade";
import { loc } from "@/lib/format";

export default async function NewRfqPage({ params, searchParams }: PageProps<"/[locale]/dashboard/rfqs/new">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  if (viewer.company.kind !== "buyer") redirect(`/${locale}/dashboard/rfqs`);
  const sp = await searchParams;
  const supabase = await createClient();
  const ref = await getReference();
  const o = options(ref, locale);
  const productId = typeof sp.product === "string" && /^[0-9a-f-]{36}$/.test(sp.product) ? sp.product : "";
  const supplierId = typeof sp.supplier === "string" && /^[0-9a-f-]{36}$/.test(sp.supplier) ? sp.supplier : "";
  const { data: product } = productId
    ? await supabase.from("products").select("id, name_en, name_ar, category_id, unit_code, moq, currency_code, company_id, companies(name, name_ar)").eq("id", productId).maybeSingle()
    : { data: null };
  const { data: supplier } = supplierId && !product
    ? await supabase.from("companies").select("id, name, name_ar").eq("id", supplierId).eq("kind", "supplier").maybeSingle()
    : { data: null };
  const defaultExpiry = isoDateFromNow(30);
  const today = new Date().toISOString().slice(0, 10);
  const targetName = product ? loc(locale, product.companies?.name_ar, product.companies?.name) : supplier ? loc(locale, supplier.name_ar, supplier.name) : null;

  return (
    <div className="max-w-4xl">
      <PageHeader title={t.rfq.newTitle} description={t.rfq.newText} />
      <ActionForm action={createRfqAction} errors={t.errors} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="buyer_company_id" value={viewer.company.id} />
        {product && <input type="hidden" name="product_id" value={product.id} />}
        {supplier && <input type="hidden" name="target_company_id" value={supplier.id} />}
        {targetName && (
          <Notice tone="navy">
            {product && <>{t.rfq.product}: <strong>{loc(locale, product.name_ar, product.name_en)}</strong> · </>}
            {t.rfq.targetSupplier}: <strong>{targetName}</strong>
          </Notice>
        )}
        <div className="card card-pad space-y-4">
          <TextField name="title" label={t.rfq.titleField} required minLength={4} maxLength={200} placeholder={t.rfq.titlePlaceholder}
            defaultValue={product ? loc(locale, product.name_ar, product.name_en) : undefined} />
          <TextArea name="description" label={t.rfq.description} required minLength={10} maxLength={8000} rows={6} placeholder={t.rfq.descriptionPlaceholder} />
          <SelectField name="category_id" label={t.common.category} required={!product} options={o.categories} defaultValue={product?.category_id} placeholder="" />
        </div>
        <div className="card card-pad grid gap-4 sm:grid-cols-3">
          <TextField name="quantity" type="number" step="any" min={0} label={t.rfq.quantity} required defaultValue={product ? String(product.moq) : undefined} />
          <SelectField name="unit_code" label={t.product.unit} required options={o.units} defaultValue={product?.unit_code ?? "piece"} />
          <span className="hidden sm:block" />
          <TextField name="target_price" type="number" step="0.01" min={0} label={`${t.rfq.targetPrice} (${t.common.optional})`} />
          <SelectField name="currency_code" label={t.common.currency} options={o.currencies} defaultValue={product?.currency_code ?? "SAR"} />
          <SelectField name="incoterm" label={t.rfq.incoterm} options={o.incoterms} placeholder="—" />
          <SelectField name="delivery_country" label={t.rfq.deliveryCountry} required options={o.allCountries} defaultValue={viewer.company.country_code} />
          <TextField name="delivery_city" label={t.rfq.deliveryCity} maxLength={120} defaultValue={viewer.company.city} />
          <span className="hidden sm:block" />
          <TextField name="required_by" type="date" min={today} label={t.rfq.requiredBy} />
          <TextField name="expires_at" type="date" min={today} label={t.rfq.expiresAt} required defaultValue={defaultExpiry} />
        </div>
        <div className="card card-pad">
          <p className="label">{t.rfq.specs}</p>
          <SpecsEditor initial={[]} labels={{ key: t.product.specKey, value: t.product.specValue, add: t.product.addSpec, remove: t.common.remove }} />
        </div>
        <div className="card card-pad">
          <FileField name="attachments" label={t.rfq.attachments} multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" hint={t.errors.fileRejected.split(":")[1]} />
        </div>
        <div className="flex justify-end"><SubmitButton>{t.rfq.submit}</SubmitButton></div>
      </ActionForm>
    </div>
  );
}
