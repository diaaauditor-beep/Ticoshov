"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { files, list, str, valuesOf, type ActionState } from "@/lib/forms";
import { fieldErrorsOf, productSchema } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";
import { isLocale } from "@/i18n/config";

export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = isLocale(str(fd, "locale")) ? str(fd, "locale") : "ar";
  const values = valuesOf(fd);
  const productId = str(fd, "product_id");
  const companyId = str(fd, "company_id");
  const parsed = productSchema.safeParse({
    name_en: str(fd, "name_en"), name_ar: str(fd, "name_ar"), description_en: str(fd, "description_en"),
    description_ar: str(fd, "description_ar"), category_id: str(fd, "category_id"), sku: str(fd, "sku"),
    moq: str(fd, "moq"), unit_code: str(fd, "unit_code"), price_min: str(fd, "price_min"), price_max: str(fd, "price_max"),
    currency_code: str(fd, "currency_code"), origin_country: str(fd, "origin_country"),
    available_quantity: str(fd, "available_quantity"), lead_time_days: str(fd, "lead_time_days"),
    export_available: fd.get("export_available") === "on", export_countries: list(fd, "export_countries"),
    status: str(fd, "status") || "draft",
  });
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const p = parsed.data;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "forbidden" };
  const row = { ...p, published_at: p.status === "published" ? new Date().toISOString() : null };

  let id = productId;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { error: errorKey(error), values };
  } else {
    const { data, error } = await supabase.from("products").insert({ ...row, company_id: companyId, created_by: auth.user.id }).select("id").single();
    if (error || !data) return { error: errorKey(error), values };
    id = data.id;
  }

  // Specifications: replace the full set
  const keys = fd.getAll("spec_key").map(String);
  const vals = fd.getAll("spec_value").map(String);
  const specs = keys
    .map((k, i) => ({ key_en: k.trim().slice(0, 80), value: (vals[i] ?? "").trim().slice(0, 400), sort_order: i }))
    .filter((s) => s.key_en && s.value);
  await supabase.from("product_specifications").delete().eq("product_id", id);
  if (specs.length) {
    const { error } = await supabase.from("product_specifications").insert(specs.map((s) => ({ ...s, product_id: id })));
    if (error) return { error: errorKey(error), values };
  }

  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
  let order = count ?? 0;
  for (const img of files(fd, "images").slice(0, 10)) {
    try {
      const up = await uploadFile("public-assets", `products/${companyId}/${id}`, img, "image");
      await supabase.from("product_images").insert({ product_id: id, storage_path: up.path, sort_order: order++ });
    } catch (e) {
      return { error: errorKey(e), values };
    }
  }
  revalidatePath(`/${locale}/products`);
  redirect(`/${locale}/dashboard/products/${id}?saved=1`);
}

export async function deleteProductImageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_images").delete().eq("id", str(fd, "id")).select("storage_path").single();
  if (error) return { error: errorKey(error) };
  await supabase.storage.from("public-assets").remove([data.storage_path]);
  revalidatePath("/[locale]/dashboard/products/[id]", "page");
  return { ok: true };
}

export async function deleteProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = isLocale(str(fd, "locale")) ? str(fd, "locale") : "ar";
  const supabase = await createClient();
  const id = str(fd, "id");
  const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    // Products referenced by RFQs cannot be deleted; archive instead.
    const arch = await supabase.from("products").update({ status: "archived" }).eq("id", id);
    if (arch.error) return { error: errorKey(arch.error) };
  } else if (imgs?.length) {
    await supabase.storage.from("public-assets").remove(imgs.map((i) => i.storage_path));
  }
  redirect(`/${locale}/dashboard/products`);
}
