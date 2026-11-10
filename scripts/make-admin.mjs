#!/usr/bin/env node
// Promote an existing user to admin (or operations) — first-admin bootstrap.
// Usage:  node --env-file=.env.local scripts/make-admin.mjs user@example.com [admin|operations]
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Run from a trusted machine only.
import { createClient } from "@supabase/supabase-js";

const [email, role = "admin"] = process.argv.slice(2);
if (!email || !["admin", "operations"].includes(role)) {
  console.error("Usage: node --env-file=.env.local scripts/make-admin.mjs <email> [admin|operations]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 1000) break;
}
if (!user) { console.error(`No user with email ${email}. Register first, then run this script.`); process.exit(1); }

// Service role bypasses RLS and the guard trigger (which only blocks client roles).
const { error } = await sb.from("profiles").update({ role, is_active: true }).eq("id", user.id);
if (error) { console.error(error.message); process.exit(1); }
await sb.from("admin_actions").insert({ actor_id: null, action: "bootstrap_role", target_table: "profiles", target_id: user.id, details: { role, via: "scripts/make-admin.mjs" } });
console.log(`✔ ${email} is now ${role}.`);
