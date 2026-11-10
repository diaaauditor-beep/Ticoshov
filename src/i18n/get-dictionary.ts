import "server-only";
import en from "./dictionaries/en";
import ar from "./dictionaries/ar";
import type { Locale } from "./config";
import { isLocale } from "./config";
import { notFound } from "next/navigation";

export type { Dictionary } from "./dictionaries/en";

export function getDictionary(locale: Locale) {
  return locale === "ar" ? ar : en;
}

/** Resolve and validate the [locale] route param. */
export async function resolveLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, t: getDictionary(locale) };
}
