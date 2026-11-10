import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { getReference } from "@/lib/reference";
import { PageHeader } from "@/components/ui/primitives";
import { ProductForm } from "@/components/ProductForm";

export default async function NewProductPage({ params }: PageProps<"/[locale]/dashboard/products/new">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireCompany(locale);
  if (viewer.company.kind !== "supplier") redirect(`/${locale}/dashboard`);
  const ref = await getReference();
  return (
    <div className="max-w-4xl">
      <PageHeader title={t.product.newTitle} />
      <ProductForm t={t} locale={locale} reference={ref} companyId={viewer.company.id} canPublish={viewer.company.verification_status === "approved"} />
    </div>
  );
}
