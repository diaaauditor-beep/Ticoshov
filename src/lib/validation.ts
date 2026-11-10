import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const phone = z.string().trim().regex(/^\+[0-9]{6,15}$/).optional().or(z.literal("")).transform((v) => v || null);
const email = z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null);
const url = z.string().trim().regex(/^https?:\/\/\S+$/i).optional().or(z.literal("")).transform((v) => v || null);
const country = z.string().regex(/^[A-Z]{2}$/);
const uuid = z.string().uuid();
const positive = z.coerce.number().positive().max(1e12);
const nonneg = z.coerce.number().min(0).max(1e12);
const optNonneg = z.union([z.literal(""), z.undefined(), z.null()]).transform(() => null).or(nonneg);

export const companySchema = z.object({
  name: text(160).min(2),
  name_ar: optText(160),
  country_code: country,
  city: text(120).min(1),
  business_type: z.enum(["manufacturer", "factory", "wholesaler", "supplier", "importer", "distributor", "retailer", "trading_company", "other"]),
  description: optText(4000),
  description_ar: optText(4000),
  website: url,
  year_established: z.union([z.literal(""), z.undefined()]).transform(() => null).or(z.coerce.number().int().min(1800).max(2100)),
  employees_range: optText(40),
  commercial_registration_no: optText(60),
  tax_number: optText(60),
  contact_name: optText(120),
  contact_email: email,
  contact_phone: phone,
  address_line: optText(300),
  category_ids: z.array(uuid).max(30),
  export_markets: z.array(country).max(60),
  import_markets: z.array(country).max(60),
});

export const productSchema = z.object({
  name_en: text(200).min(2),
  name_ar: text(200).min(2),
  description_en: optText(8000),
  description_ar: optText(8000),
  category_id: uuid,
  sku: optText(80),
  moq: positive,
  unit_code: z.string().regex(/^[a-z0-9_]{1,20}$/),
  price_min: optNonneg,
  price_max: optNonneg,
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  origin_country: country,
  available_quantity: optNonneg,
  lead_time_days: z.union([z.literal(""), z.undefined()]).transform(() => null).or(z.coerce.number().int().min(0).max(730)),
  export_available: z.boolean(),
  export_countries: z.array(country).max(60),
  status: z.enum(["draft", "published", "archived"]),
}).refine((p) => p.price_min == null || p.price_max == null || p.price_max >= p.price_min, { path: ["price_max"], message: "invalid" });

export const rfqSchema = z.object({
  title: text(200).min(4),
  description: text(8000).min(10),
  category_id: uuid.optional().or(z.literal("")).transform((v) => v || null),
  product_id: uuid.optional().or(z.literal("")).transform((v) => v || null),
  quantity: positive,
  unit_code: z.string().regex(/^[a-z0-9_]{1,20}$/),
  target_price: optNonneg,
  currency_code: z.string().regex(/^[A-Z]{3}$/).optional().or(z.literal("")).transform((v) => v || null),
  delivery_country: country,
  delivery_city: optText(120),
  incoterm: z.string().regex(/^[A-Z]{3}$/).optional().or(z.literal("")).transform((v) => v || null),
  required_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((r) => r.category_id || r.product_id, { path: ["category_id"], message: "required" });

export const quotationSchema = z.object({
  unit_price: nonneg,
  quantity: positive,
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  moq: z.union([z.literal(""), z.undefined()]).transform(() => null).or(positive),
  lead_time_days: z.coerce.number().int().min(0).max(730),
  incoterm: z.string().regex(/^[A-Z]{3}$/).optional().or(z.literal("")).transform((v) => v || null),
  delivery_terms: optText(2000),
  payment_terms: optText(2000),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: optText(4000),
});

export const shipmentSchema = z.object({
  carrier: optText(120),
  tracking_number: optText(120),
  transport_mode: z.enum(["sea", "air", "land", "multimodal", "courier"]).optional().or(z.literal("")).transform((v) => v || null),
  incoterm: z.string().regex(/^[A-Z]{3}$/).optional().or(z.literal("")).transform((v) => v || null),
  origin_country: country.optional().or(z.literal("")).transform((v) => v || null),
  destination_country: country.optional().or(z.literal("")).transform((v) => v || null),
  port_of_loading: optText(120),
  port_of_discharge: optText(120),
  etd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  eta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  status: z.enum(["preparing", "booked", "in_transit", "at_customs", "delivered", "exception"]),
  notes: optText(2000),
});

/** Turn zod issues into { field: "invalid" | "required" } for the form. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.code === "too_small" && issue.minimum === 1 ? "required" : issue.message === "required" ? "required" : "invalid";
  }
  return out;
}
