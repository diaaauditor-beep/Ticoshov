"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { file, list, str, valuesOf, type ActionState } from "@/lib/forms";
import { companySchema, fieldErrorsOf } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";
import { isLocale } from "@/i18n/config";
import type { Database } from "@/lib/supabase/database.types";

type DocType = Database["public"]["Enums"]["verification_doc_type"];

function parseCompany(fd: FormData) {
  return companySchema.safeParse({
    name: str(fd, "name"), name_ar: str(fd, "name_ar"), country_code: str(fd, "country_code"), city: str(fd, "city"),
    business_type: str(fd, "business_type"), description: str(fd, "description"), description_ar: str(fd, "description_ar"),
    website: str(fd, "website"), year_established: str(fd, "year_established"), employees_range: str(fd, "employees_range"),
    commercial_registration_no: str(fd, "commercial_registration_no"), tax_number: str(fd, "tax_number"),
    contact_name: str(fd, "contact_name"), contact_email: str(fd, "contact_email"), contact_phone: str(fd, "contact_phone"),
    address_line: str(fd, "address_line"), category_ids: list(fd, "category_ids"),
    export_markets: list(fd, "export_markets"), import_markets: list(fd, "import_markets"),
  });
}

export async function createCompanyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = isLocale(str(fd, "locale")) ? str(fd, "locale") : "ar";
  const values = valuesOf(fd);
  const parsed = parseCompany(fd);
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const c = parsed.data;
  const supabase = await createClient();
  const { data: companyId, error } = await supabase.rpc("create_company", {
    p_name: c.name, p_name_ar: c.name_ar ?? "", p_country: c.country_code, p_city: c.city, p_business_type: c.business_type,
    p_description: c.description ?? "", p_description_ar: c.description_ar ?? "", p_website: c.website ?? "",
    p_year_established: (c.year_established ?? null) as number, p_cr_number: c.commercial_registration_no ?? "", p_tax_number: c.tax_number ?? "",
    p_contact_name: c.contact_name ?? "", p_contact_email: c.contact_email ?? "", p_contact_phone: c.contact_phone ?? "",
    p_address: c.address_line ?? "", p_category_ids: c.category_ids, p_export_markets: c.export_markets,
  });
  if (error || !companyId) return { error: errorKey(error), values };
  if (c.import_markets.length || c.employees_range) {
    await supabase.from("companies").update({ import_markets: c.import_markets, employees_range: c.employees_range }).eq("id", companyId);
  }
  const logo = file(fd, "logo");
  if (logo) {
    try {
      const up = await uploadFile("public-assets", `companies/${companyId}`, logo, "image");
      await supabase.from("companies").update({ logo_path: up.path }).eq("id", companyId);
    } catch { /* logo is optional — the company is created; it can be added later */ }
  }
  const { data: profile } = await supabase.from("profiles").select("role").single();
  redirect(`/${locale}/dashboard${profile?.role === "supplier" ? "/verification?welcome=1" : "?welcome=1"}`);
}

export async function updateCompanyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const companyId = str(fd, "company_id");
  const values = valuesOf(fd);
  const parsed = parseCompany(fd);
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const c = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({
    name: c.name, name_ar: c.name_ar, country_code: c.country_code, city: c.city, business_type: c.business_type,
    description: c.description, description_ar: c.description_ar, website: c.website, year_established: c.year_established,
    employees_range: c.employees_range, export_markets: c.export_markets, import_markets: c.import_markets,
  }).eq("id", companyId);
  if (error) return { error: errorKey(error), values };
  const legal = await supabase.from("company_legal").update({
    commercial_registration_no: c.commercial_registration_no, tax_number: c.tax_number, contact_name: c.contact_name,
    contact_email: c.contact_email, contact_phone: c.contact_phone, address_line: c.address_line,
  }).eq("company_id", companyId);
  if (legal.error) return { error: errorKey(legal.error), values };
  await supabase.from("company_categories").delete().eq("company_id", companyId);
  if (c.category_ids.length) {
    const ins = await supabase.from("company_categories").insert(c.category_ids.map((category_id) => ({ company_id: companyId, category_id })));
    if (ins.error) return { error: errorKey(ins.error), values };
  }
  const logo = file(fd, "logo");
  if (logo) {
    try {
      const up = await uploadFile("public-assets", `companies/${companyId}`, logo, "image");
      await supabase.from("companies").update({ logo_path: up.path }).eq("id", companyId);
    } catch (e) {
      return { error: errorKey(e), values };
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadVerificationDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const companyId = str(fd, "company_id");
  const verificationId = str(fd, "verification_id");
  const docType = str(fd, "doc_type") as DocType;
  const f = file(fd, "file");
  if (!f || !docType) return { error: "required" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  try {
    const up = await uploadFile("private-files", `verification/${companyId}`, f, "document");
    const { error } = await supabase.from("verification_documents").insert({
      verification_id: verificationId, company_id: companyId, doc_type: docType, storage_path: up.path,
      file_name: up.name, mime_type: up.type, size_bytes: up.size, uploaded_by: auth.user!.id,
    });
    if (error) {
      await supabase.storage.from("private-files").remove([up.path]);
      return { error: errorKey(error) };
    }
  } catch (e) {
    return { error: errorKey(e) };
  }
  revalidatePath("/[locale]/dashboard/verification", "page");
  return { ok: true };
}

export async function deleteVerificationDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("verification_documents").delete().eq("id", str(fd, "id")).select("storage_path").single();
  if (error) return { error: errorKey(error) };
  await supabase.storage.from("private-files").remove([data.storage_path]);
  revalidatePath("/[locale]/dashboard/verification", "page");
  return { ok: true };
}

export async function submitVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_verification", { p_company: str(fd, "company_id") });
  if (error) return { error: errorKey(error) };
  revalidatePath("/[locale]/dashboard/verification", "page");
  return { ok: true };
}
