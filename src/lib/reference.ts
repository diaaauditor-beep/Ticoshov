import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import { loc } from "@/lib/format";

export const getReference = cache(async () => {
  const supabase = await createClient();
  const [countries, currencies, units, incoterms, categories] = await Promise.all([
    supabase.from("countries").select("*").order("name_en"),
    supabase.from("currencies").select("*").order("code"),
    supabase.from("units").select("*").eq("is_active", true).order("name_en"),
    supabase.from("incoterms").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  return {
    countries: countries.data ?? [],
    currencies: currencies.data ?? [],
    units: units.data ?? [],
    incoterms: incoterms.data ?? [],
    categories: categories.data ?? [],
  };
});

export type Reference = Awaited<ReturnType<typeof getReference>>;

export function options(ref: Reference, locale: Locale) {
  const activeCountries = ref.countries.filter((c) => c.is_active);
  const roots = ref.categories.filter((c) => !c.parent_id && c.is_active);
  const categoryTree = roots.flatMap((r) => [
    { value: r.id, label: loc(locale, r.name_ar, r.name_en) },
    ...ref.categories
      .filter((c) => c.parent_id === r.id && c.is_active)
      .map((c) => ({ value: c.id, label: `— ${loc(locale, c.name_ar, c.name_en)}` })),
  ]);
  return {
    countries: activeCountries.map((c) => ({ value: c.code, label: loc(locale, c.name_ar, c.name_en) })),
    allCountries: ref.countries.map((c) => ({ value: c.code, label: loc(locale, c.name_ar, c.name_en) })),
    currencies: ref.currencies.filter((c) => c.is_active).map((c) => ({ value: c.code, label: `${c.code} · ${loc(locale, c.name_ar, c.name_en)}` })),
    units: ref.units.map((u) => ({ value: u.code, label: loc(locale, u.name_ar, u.name_en) })),
    incoterms: ref.incoterms.map((i) => ({ value: i.code, label: `${i.code} · ${loc(locale, i.name_ar, i.name_en)}` })),
    categories: categoryTree,
    rootCategories: roots,
  };
}

export function countryName(ref: Reference, code: string | null | undefined, locale: Locale) {
  const c = ref.countries.find((x) => x.code === code);
  return c ? loc(locale, c.name_ar, c.name_en) : code ?? "—";
}
export function categoryName(ref: Reference, id: string | null | undefined, locale: Locale) {
  const c = ref.categories.find((x) => x.id === id);
  return c ? loc(locale, c.name_ar, c.name_en) : "—";
}
export function unitName(ref: Reference, code: string | null | undefined, locale: Locale) {
  const u = ref.units.find((x) => x.code === code);
  return u ? loc(locale, u.name_ar, u.name_en) : code ?? "";
}
