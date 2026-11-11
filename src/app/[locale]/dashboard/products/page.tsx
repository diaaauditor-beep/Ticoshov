import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDate, formatNumber, loc, priceRange } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export default async function MyProductsPage({ params }: PageProps<"/[locale]/dashboard/products">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  if (viewer.company.kind !== "supplier") redirect(`/${locale}/dashboard`);
  const supabase = await createClient();
  const { data: products } = await supabase.from("products")
    .select("id, name_en, name_ar, sku, moq, unit_code, price_min, price_max, currency_code, status, updated_at, product_images(storage_path, sort_order)")
    .eq("company_id", viewer.company.id).order("updated_at", { ascending: false });
  const base = `/${locale}/dashboard/products`;
  return (
    <div>
      <PageHeader title={t.product.myTitle} actions={<Link href={`${base}/new`} className="btn btn-primary">{t.nav.newProduct}</Link>} />
      {!products?.length ? (
        <EmptyState title={t.product.noProducts} description={t.product.noProductsText}
          action={<Link href={`${base}/new`} className="btn btn-primary">{t.nav.newProduct}</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th></th><th>{t.product.nameEn}</th><th>{t.product.sku}</th><th>{t.product.moqShort}</th><th>{t.product.price}</th><th>{t.common.status}</th><th>{t.common.updated}</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const img = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
                return (
                  <tr key={p.id}>
                    <td className="w-14">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicUrl(img.storage_path)!} alt="" className="size-10 rounded object-cover" />
                      ) : <span className="block size-10 rounded bg-slate-100" />}
                    </td>
                    <td><Link className="font-medium text-navy-900 hover:underline" href={`${base}/${p.id}`}>{loc(locale, p.name_ar, p.name_en)}</Link></td>
                    <td className="font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="tabular-nums">{formatNumber(p.moq, locale)}</td>
                    <td className="whitespace-nowrap tabular-nums">{priceRange(p.price_min, p.price_max, p.currency_code, locale) ?? t.product.priceOnRequest}</td>
                    <td><StatusBadge status={p.status} label={t.enums.productStatus[p.status]} /></td>
                    <td className="text-slate-500">{formatDate(p.updated_at, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
