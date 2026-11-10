import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference } from "@/lib/reference";
import { Notice, PageHeader, Section } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/form";
import { ProductForm } from "@/components/ProductForm";
import { deleteProductAction, deleteProductImageAction } from "@/app/actions/products";
import { publicUrl } from "@/lib/storage";

export default async function EditProductPage({ params, searchParams }: PageProps<"/[locale]/dashboard/products/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", id).eq("company_id", viewer.company.id).maybeSingle();
  if (!product) notFound();
  const [{ data: specs }, { data: images }, ref] = await Promise.all([
    supabase.from("product_specifications").select("key_en, value").eq("product_id", id).order("sort_order"),
    supabase.from("product_images").select("id, storage_path").eq("product_id", id).order("sort_order"),
    getReference(),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t.product.editTitle}
        actions={<>
          {product.status === "published" && <Link href={`/${locale}/products/${id}`} className="btn btn-secondary">{t.common.view}</Link>}
          <ActionButton action={deleteProductAction} hidden={{ id, locale }} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-secondary text-red-600">{t.common.delete}</ActionButton>
        </>} />
      {sp.saved && <Notice tone="green">{t.product.saved}</Notice>}
      {images && images.length > 0 && (
        <Section title={t.product.images}>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(img.storage_path)!} alt="" className="size-24 rounded-md border border-slate-200 object-cover" />
                <ActionButton action={deleteProductImageAction} hidden={{ id: img.id }} errors={t.errors} className="btn btn-ghost btn-sm text-red-600">{t.product.deleteImage}</ActionButton>
              </div>
            ))}
          </div>
        </Section>
      )}
      <ProductForm t={t} locale={locale} reference={ref} companyId={viewer.company.id} product={product}
        specs={(specs ?? []).map((s) => ({ key: s.key_en, value: s.value }))} canPublish={viewer.company.verification_status === "approved"} />
    </div>
  );
}
