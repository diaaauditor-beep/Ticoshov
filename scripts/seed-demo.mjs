#!/usr/bin/env node
// OPTIONAL demo data for local development and staging walkthroughs.
// Every record is clearly marked: companies have is_demo = true, names start with "[DEMO]",
// and users use the reserved example.com domain. Never run against production.
//
//   node --env-file=.env.local scripts/seed-demo.mjs            # create
//   node --env-file=.env.local scripts/seed-demo.mjs --remove   # delete all demo users & companies
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_DEMO_SEED !== "yes") {
  console.error("Refusing to seed a non-local project. Set ALLOW_DEMO_SEED=yes for a staging project (never production).");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-password-2026!";
const DEMO = [
  { email: "demo-supplier-eg@example.com", role: "supplier", company: { name: "[DEMO] Nile Modest Wear Factory", name_ar: "[تجريبي] مصنع النيل للأزياء المحتشمة", country_code: "EG", city: "Cairo", business_type: "manufacturer" } },
  { email: "demo-supplier-eg2@example.com", role: "supplier", company: { name: "[DEMO] Delta Fabrics", name_ar: "[تجريبي] أقمشة الدلتا", country_code: "EG", city: "Mahalla", business_type: "factory" } },
  { email: "demo-buyer-sa@example.com", role: "buyer", company: { name: "[DEMO] Riyadh Abaya House", name_ar: "[تجريبي] دار عبايات الرياض", country_code: "SA", city: "Riyadh", business_type: "retailer" } },
];

async function listDemoUsers() {
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((u) => DEMO.some((d) => d.email === u.email));
}

if (process.argv.includes("--remove")) {
  const { error } = await sb.from("companies").delete().eq("is_demo", true);
  if (error) { console.error(error.message); process.exit(1); }
  for (const u of await listDemoUsers()) await sb.auth.admin.deleteUser(u.id);
  console.log("✔ Demo companies and users removed.");
  process.exit(0);
}

const cats = Object.fromEntries((await sb.from("categories").select("id, slug")).data.map((c) => [c.slug, c.id]));
const existing = await listDemoUsers();
for (const d of DEMO) {
  if (existing.some((u) => u.email === d.email)) { console.log(`• ${d.email} already exists, skipped`); continue; }
  const { data: u, error } = await sb.auth.admin.createUser({ email: d.email, password: PASSWORD, email_confirm: true, user_metadata: { role: d.role, full_name: d.company.name } });
  if (error) throw error;
  const slug = d.company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: co, error: e2 } = await sb.from("companies").insert({
    ...d.company, kind: d.role, slug, is_demo: true, verification_status: "approved", verified_at: new Date().toISOString(),
    description: "Demonstration company — not a real business.", description_ar: "شركة تجريبية للعرض فقط — ليست نشاطًا حقيقيًا.",
    export_markets: d.role === "supplier" ? ["SA", "AE"] : [], created_by: u.user.id,
  }).select("id").single();
  if (e2) throw e2;
  await sb.from("company_legal").insert({ company_id: co.id, contact_name: "Demo contact", contact_email: d.email });
  await sb.from("company_members").insert({ company_id: co.id, user_id: u.user.id, member_role: "owner" });
  if (d.role === "supplier") {
    await sb.from("company_categories").insert([{ company_id: co.id, category_id: cats["abayas"] }, { company_id: co.id, category_id: cats["scarves-hijabs"] }]);
    await sb.from("products").insert([
      { company_id: co.id, category_id: cats["abayas"], name_en: "[DEMO] Classic Crepe Abaya", name_ar: "[تجريبي] عباية كريب كلاسيك", moq: 200, unit_code: "piece", price_min: 11, price_max: 16, currency_code: "USD", origin_country: "EG", lead_time_days: 30, status: "published", published_at: new Date().toISOString(), created_by: u.user.id },
      { company_id: co.id, category_id: cats["scarves-hijabs"], name_en: "[DEMO] Chiffon Hijab", name_ar: "[تجريبي] طرحة شيفون", moq: 500, unit_code: "piece", price_min: 1.2, price_max: 2, currency_code: "USD", origin_country: "EG", lead_time_days: 21, status: "published", published_at: new Date().toISOString(), created_by: u.user.id },
    ]);
  }
  console.log(`✔ ${d.email} → ${d.company.name}`);
}
console.log(`Demo password: ${PASSWORD}  (demo records are flagged is_demo and hidden from the landing page)`);
