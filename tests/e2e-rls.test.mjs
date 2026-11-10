// TICOSHOV end-to-end workflow + Row Level Security tests.
// Runs against a LOCAL Supabase stack (never production): `npx supabase start` then
//   node --env-file=.env.local --test tests/
// Uses the service-role key ONLY to create test users and to assert database state;
// every business action is performed with the end user's own session (RLS applies).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL?.includes("127.0.0.1") && !URL?.includes("localhost")) {
  throw new Error("Refusing to run: tests must target a local Supabase stack.");
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(URL, SERVICE, opts);
const anon = createClient(URL, ANON, opts);
const run = Date.now().toString(36);
const PASSWORD = "Test-password-123!";

async function makeUser(label, role) {
  const email = `${label}-${run}@test.local`;
  const { data, error } = await svc.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { role, full_name: label },
  });
  if (error) throw error;
  const client = createClient(URL, ANON, opts);
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
// rows visible to the caller; a permission error also counts as "no rows"
const rows = ({ data, error }) => (error ? [] : data);
const denied = (r, msg) => assert.ok(r.error, msg ?? "expected an error but the call succeeded");

const ctx = {};

async function companyFor(user, name, country) {
  return ok(await user.client.rpc("create_company", {
    p_name: name, p_name_ar: null, p_country: country, p_city: "City", p_business_type: "manufacturer",
    p_description: null, p_description_ar: null, p_website: null, p_year_established: null,
    p_cr_number: "CR-123", p_tax_number: "TAX-9", p_contact_name: "Contact", p_contact_email: "c@example.com",
    p_contact_phone: "+201000000000", p_address: "Street 1", p_category_ids: [ctx.category], p_export_markets: ["SA"],
  }));
}

before(async () => {
  ctx.category = ok(await svc.from("categories").select("id").eq("slug", "abayas").single()).id;
  ctx.admin = await makeUser("admin", "buyer");
  ok(await svc.from("profiles").update({ role: "admin" }).eq("id", ctx.admin.id));
  ctx.ops = await makeUser("ops", "buyer");
  ok(await svc.from("profiles").update({ role: "operations" }).eq("id", ctx.ops.id));
  ctx.supplier = await makeUser("supplier", "supplier");
  ctx.supplier2 = await makeUser("supplier2", "supplier");
  ctx.buyer = await makeUser("buyer", "buyer");
  ctx.outsider = await makeUser("outsider", "buyer");
});

// ---------------------------------------------------------------- roles & profiles
test("signup metadata cannot grant admin; clients cannot escalate their role", async () => {
  const sneaky = await svc.auth.admin.createUser({
    email: `sneaky-${run}@test.local`, password: PASSWORD, email_confirm: true, user_metadata: { role: "admin" },
  });
  const prof = ok(await svc.from("profiles").select("role").eq("id", sneaky.data.user.id).single());
  assert.equal(prof.role, "buyer");

  await ctx.buyer.client.from("profiles").update({ role: "admin" }).eq("id", ctx.buyer.id);
  const after = ok(await svc.from("profiles").select("role").eq("id", ctx.buyer.id).single());
  assert.equal(after.role, "buyer", "buyer must not be able to become admin");

  const name = await ctx.buyer.client.from("profiles").update({ full_name: "Buyer Renamed" }).eq("id", ctx.buyer.id).select();
  assert.equal(ok(name)[0]?.full_name, "Buyer Renamed", "users can edit their own non-privileged fields");

  denied(await ctx.buyer.client.rpc("admin_set_user", { p_user: ctx.buyer.id, p_role: "admin", p_active: true }));
  denied(await ctx.ops.client.rpc("admin_set_user", { p_user: ctx.buyer.id, p_role: "admin", p_active: true }), "operations is not admin");
});

test("onboarding: companies created through RPC; one company per user", async () => {
  ctx.supCo = await companyFor(ctx.supplier, "Nile Abaya Factory", "EG");
  ctx.sup2Co = await companyFor(ctx.supplier2, "Delta Textiles", "EG");
  ctx.buyCo = await companyFor(ctx.buyer, "Riyadh Modest Wear", "SA");
  ctx.outCo = await companyFor(ctx.outsider, "Other Buyer", "SA");
  denied(await ctx.buyer.client.rpc("create_company", {
    p_name: "Second", p_name_ar: null, p_country: "SA", p_city: "x", p_business_type: "retailer", p_description: null,
    p_description_ar: null, p_website: null, p_year_established: null, p_cr_number: null, p_tax_number: null,
    p_contact_name: null, p_contact_email: null, p_contact_phone: null, p_address: null, p_category_ids: null, p_export_markets: null,
  }), "second company must be rejected");
  denied(await ctx.admin.client.rpc("create_company", {
    p_name: "Admin Co", p_name_ar: null, p_country: "EG", p_city: "x", p_business_type: "other", p_description: null,
    p_description_ar: null, p_website: null, p_year_established: null, p_cr_number: null, p_tax_number: null,
    p_contact_name: null, p_contact_email: null, p_contact_phone: null, p_address: null, p_category_ids: null, p_export_markets: null,
  }), "staff accounts do not own companies");
  denied(await ctx.outsider.client.from("companies").insert({ kind: "supplier", name: "Direct", slug: "direct-xyz", country_code: "EG", city: "c", business_type: "other" }));
  const sup = ok(await svc.from("companies").select("verification_status").eq("id", ctx.supCo).single());
  assert.equal(sup.verification_status, "pending");
  const buy = ok(await svc.from("companies").select("verification_status").eq("id", ctx.buyCo).single());
  assert.equal(buy.verification_status, "approved");
});

test("sensitive company data is private; verification status cannot be self-approved", async () => {
  const legal = ok(await ctx.outsider.client.from("company_legal").select("*").eq("company_id", ctx.supCo));
  assert.equal(legal.length, 0, "other companies must not read legal data");
  const own = ok(await ctx.supplier.client.from("company_legal").select("tax_number").eq("company_id", ctx.supCo));
  assert.equal(own[0]?.tax_number, "TAX-9");
  const staff = ok(await ctx.ops.client.from("company_legal").select("tax_number").eq("company_id", ctx.supCo));
  assert.equal(staff.length, 1, "staff can read legal data");
  const a = rows(await anon.from("company_legal").select("*"));
  assert.equal(a.length, 0);

  await ctx.supplier.client.from("companies").update({ verification_status: "approved" }).eq("id", ctx.supCo);
  const s = ok(await svc.from("companies").select("verification_status").eq("id", ctx.supCo).single());
  assert.equal(s.verification_status, "pending", "suppliers cannot approve themselves");

  const pend = ok(await anon.from("companies").select("id").eq("id", ctx.supCo));
  assert.equal(pend.length, 0, "unverified suppliers are not public");
});

test("verification workflow with private documents", async () => {
  const ver = ok(await ctx.supplier.client.from("supplier_verifications").select("id, status").eq("company_id", ctx.supCo).single());
  denied(await ctx.supplier.client.rpc("submit_verification", { p_company: ctx.supCo }), "needs at least one document");
  const path = `verification/${ctx.supCo}/${crypto.randomUUID()}.pdf`;
  ok(await ctx.supplier.client.storage.from("private-files").upload(path, new Blob(["%PDF-1.4 test"], { type: "application/pdf" })));
  ok(await ctx.supplier.client.from("verification_documents").insert({
    verification_id: ver.id, company_id: ctx.supCo, doc_type: "commercial_registration", storage_path: path, file_name: "cr.pdf",
  }));
  // outsiders can neither upload into nor read another company's verification folder
  denied(await ctx.outsider.client.storage.from("private-files").upload(`verification/${ctx.supCo}/${crypto.randomUUID()}.pdf`, new Blob(["x"], { type: "application/pdf" })));
  denied(await ctx.outsider.client.storage.from("private-files").download(path));
  denied(await anon.storage.from("private-files").download(path));
  assert.ok((await ctx.ops.client.storage.from("private-files").download(path)).data, "staff can read documents");

  ok(await ctx.supplier.client.rpc("submit_verification", { p_company: ctx.supCo }));
  denied(await ctx.supplier.client.rpc("review_verification", { p_verification: ver.id, p_status: "approved", p_message: null, p_internal_notes: null }));
  ok(await ctx.ops.client.rpc("start_verification_review", { p_verification: ver.id }));
  ok(await ctx.ops.client.rpc("review_verification", { p_verification: ver.id, p_status: "approved", p_message: "Welcome", p_internal_notes: "checked CR" }));
  const co = ok(await svc.from("companies").select("verification_status").eq("id", ctx.supCo).single());
  assert.equal(co.verification_status, "approved");
  const leaked = rows(await ctx.supplier.client.from("verification_internal_notes").select("notes").eq("verification_id", ver.id));
  assert.equal(leaked.length, 0, "internal notes must not leak to the company");
  const staffNotes = ok(await ctx.ops.client.from("verification_internal_notes").select("notes").eq("verification_id", ver.id).single());
  assert.equal(staffNotes.notes, "checked CR");
  const visible = ok(await anon.from("companies").select("id").eq("id", ctx.supCo));
  assert.equal(visible.length, 1, "approved suppliers are public");

  // approve supplier2 directly for the remaining tests
  ok(await svc.from("companies").update({ verification_status: "approved" }).eq("id", ctx.sup2Co));
});

// ---------------------------------------------------------------- catalog
test("products: only members manage them; drafts are private", async () => {
  const base = { category_id: ctx.category, name_en: "Classic Abaya", name_ar: "عباية كلاسيك", moq: 100, unit_code: "piece", currency_code: "USD", origin_country: "EG", price_min: 12, price_max: 18 };
  ctx.product = ok(await ctx.supplier.client.from("products").insert({ ...base, company_id: ctx.supCo, status: "published" }).select("id").single()).id;
  const draft = ok(await ctx.supplier.client.from("products").insert({ ...base, company_id: ctx.supCo, status: "draft", name_en: "Secret draft" }).select("id").single()).id;
  denied(await ctx.outsider.client.from("products").insert({ ...base, company_id: ctx.supCo }), "cannot add products to another company");
  denied(await ctx.buyer.client.from("products").insert({ ...base, company_id: ctx.buyCo }), "buyers cannot list products");
  const upd = ok(await ctx.outsider.client.from("products").update({ price_min: 1 }).eq("id", ctx.product).select());
  assert.equal(upd.length, 0, "cannot edit another company's product");
  assert.equal(ok(await anon.from("products").select("id").eq("id", ctx.product)).length, 1);
  assert.equal(ok(await anon.from("products").select("id").eq("id", draft)).length, 0, "drafts are not public");
  const found = ok(await anon.from("products").select("id").textSearch("search_vector", "abaya", { type: "websearch", config: "simple" }));
  assert.ok(found.some((p) => p.id === ctx.product), "full-text search finds the product");
});

// ---------------------------------------------------------------- trading lifecycle
test("RFQ → quotations → comparison visibility → negotiation → acceptance", async () => {
  const rfq = ok(await ctx.buyer.client.from("rfqs").insert({
    buyer_company_id: ctx.buyCo, title: "500 abayas", description: "Black crepe, sizes 52-58", category_id: ctx.category,
    quantity: 500, unit_code: "piece", currency_code: "USD", delivery_country: "SA", specifications: [{ key: "fabric", value: "crepe" }],
  }).select("id, reference").single());
  ctx.rfq = rfq.id;
  assert.match(rfq.reference, /^RFQ-\d{4}-\d{6}$/);
  denied(await ctx.outsider.client.from("rfqs").insert({ buyer_company_id: ctx.buyCo, title: "xxxx", description: "xxxxxxxxxxxx", category_id: ctx.category, quantity: 1, unit_code: "piece", delivery_country: "SA" }));
  denied(await ctx.supplier.client.from("rfqs").insert({ buyer_company_id: ctx.supCo, title: "xxxx", description: "xxxxxxxxxxxx", category_id: ctx.category, quantity: 1, unit_code: "piece", delivery_country: "SA" }), "suppliers cannot create RFQs");

  const n = ok(await svc.from("notifications").select("type").eq("user_id", ctx.supplier.id).eq("type", "rfq_new"));
  assert.ok(n.length >= 1, "matching suppliers are notified of new RFQs");

  const until = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const quote = (co, price) => ({ rfq_id: ctx.rfq, supplier_company_id: co, unit_price: price, quantity: 500, total_amount: 0, currency_code: "USD", lead_time_days: 30, valid_until: until, incoterm: "FOB" });
  const q1 = ok(await ctx.supplier.client.from("quotations").insert(quote(ctx.supCo, 15)).select("id, total_amount, status").single());
  const q2 = ok(await ctx.supplier2.client.from("quotations").insert(quote(ctx.sup2Co, 14)).select("id").single());
  ctx.q1 = q1.id; ctx.q2 = q2.id;
  assert.equal(Number(q1.total_amount), 7500, "total computed server-side");
  denied(await ctx.supplier.client.from("quotations").insert(quote(ctx.sup2Co, 1)), "cannot quote on behalf of another company");
  denied(await ctx.buyer.client.from("quotations").insert(quote(ctx.buyCo, 1)));

  // competitors never see each other's quotes; buyer sees all
  assert.equal(ok(await ctx.supplier.client.from("quotations").select("id").eq("rfq_id", ctx.rfq)).length, 1);
  assert.equal(ok(await ctx.buyer.client.from("quotations").select("id").eq("rfq_id", ctx.rfq)).length, 2);
  assert.equal(ok(await ctx.outsider.client.from("quotations").select("id").eq("rfq_id", ctx.rfq)).length, 0);
  assert.equal(ok(await ctx.outsider.client.from("rfqs").select("id").eq("id", ctx.rfq)).length, 0, "other buyers cannot see the RFQ");

  // suppliers cannot accept their own quote
  await ctx.supplier.client.from("quotations").update({ status: "accepted" }).eq("id", ctx.q1);
  assert.equal(ok(await svc.from("quotations").select("status").eq("id", ctx.q1).single()).status, "submitted");
  denied(await ctx.supplier.client.rpc("accept_quotation", { p_quotation: ctx.q1 }));

  // negotiation creates a deal and a conversation
  ctx.deal = ok(await ctx.buyer.client.rpc("start_negotiation", { p_quotation: ctx.q1 }));
  const d0 = ok(await svc.from("deals").select("status, reference").eq("id", ctx.deal).single());
  assert.equal(d0.status, "negotiation");
  assert.match(d0.reference, /^TCS-\d{4}-\d{6}$/);
  const conv = ok(await svc.from("conversations").select("id").eq("rfq_id", ctx.rfq).eq("supplier_company_id", ctx.supCo).single());
  ctx.conv = conv.id;

  // revised quote (same status update bumps revision & syncs deal value)
  ok(await ctx.supplier.client.from("quotations").update({ unit_price: 14.5 }).eq("id", ctx.q1));
  const rev = ok(await svc.from("quotations").select("revision, total_amount").eq("id", ctx.q1).single());
  assert.equal(rev.revision, 2);
  assert.equal(Number(rev.total_amount), 7250);
  assert.equal(Number(ok(await svc.from("deals").select("deal_value").eq("id", ctx.deal).single()).deal_value), 7250);

  ok(await ctx.buyer.client.rpc("accept_quotation", { p_quotation: ctx.q1 }));
  const d1 = ok(await svc.from("deals").select("status").eq("id", ctx.deal).single());
  assert.equal(d1.status, "quotation_accepted");
  assert.equal(ok(await svc.from("quotations").select("status").eq("id", ctx.q2).single()).status, "rejected", "competing quotes are closed");
  assert.equal(ok(await svc.from("rfqs").select("status").eq("id", ctx.rfq).single()).status, "awarded");
  const c = ok(await svc.from("commissions").select("*").eq("deal_id", ctx.deal).single());
  assert.equal(c.status, "pending");
  assert.equal(Number(c.rate), 5, "default commission rate from platform settings");
  assert.equal(Number(c.amount), 362.5);
  ctx.commission = c.id;
});

test("messaging: parties only, moderation, locked conversations", async () => {
  ok(await ctx.buyer.client.from("messages").insert({ conversation_id: ctx.conv, body: "Can you do navy blue too?" }));
  const m = ok(await ctx.supplier.client.from("messages").insert({ conversation_id: ctx.conv, body: "Yes, same price." }).select("id").single());
  denied(await ctx.outsider.client.from("messages").insert({ conversation_id: ctx.conv, body: "spam" }));
  assert.equal(ok(await ctx.outsider.client.from("messages").select("id").eq("conversation_id", ctx.conv)).length, 0);
  denied(await ctx.supplier2.client.from("messages").insert({ conversation_id: ctx.conv, body: "competitor" }));
  const sent = ok(await svc.from("messages").select("sender_company_id").eq("id", m.id).single());
  assert.equal(sent.sender_company_id, ctx.supCo, "sender company is set server-side");

  ok(await ctx.buyer.client.from("message_reports").insert({ message_id: m.id, reason: "test report" }));
  ok(await ctx.ops.client.from("messages").update({ is_hidden: true }).eq("id", m.id));
  const seen = ok(await ctx.buyer.client.from("messages").select("id").eq("id", m.id));
  assert.equal(seen.length, 0, "hidden messages are removed from party view");
  const upd = ok(await ctx.supplier.client.from("messages").update({ body: "edited" }).eq("id", m.id).select());
  assert.equal(upd.length, 0, "messages are immutable for parties");

  ok(await ctx.ops.client.from("conversations").update({ is_locked: true }).eq("id", ctx.conv));
  denied(await ctx.buyer.client.from("messages").insert({ conversation_id: ctx.conv, body: "after lock" }));
  ok(await ctx.ops.client.from("conversations").update({ is_locked: false }).eq("id", ctx.conv));
});

test("deal lifecycle: transition rules, payment declarations, shipment, documents, completion", async () => {
  const st = async () => ok(await svc.from("deals").select("status").eq("id", ctx.deal).single()).status;
  const move = (u, to) => u.client.rpc("update_deal_status", { p_deal: ctx.deal, p_to: to });

  denied(await move(ctx.outsider, "awaiting_payment_confirmation"), "non-parties cannot move deals");
  denied(await move(ctx.supplier, "completed"), "cannot skip to completed");
  ok(await move(ctx.buyer, "awaiting_payment_confirmation"));
  await ctx.buyer.client.from("deals").update({ status: "completed" }).eq("id", ctx.deal); // no UPDATE policy: silently filtered
  assert.equal(await st(), "awaiting_payment_confirmation");

  ok(await ctx.buyer.client.rpc("declare_payment", { p_deal: ctx.deal, p_note: "paid by bank transfer" }));
  assert.equal(await st(), "awaiting_payment_confirmation", "one declaration is not enough");
  ok(await ctx.supplier.client.rpc("declare_payment", { p_deal: ctx.deal, p_note: "received" }));
  assert.equal(await st(), "payment_confirmed");
  denied(await move(ctx.buyer, "cancelled"), "cannot cancel after payment is confirmed");

  denied(await move(ctx.buyer, "production"), "only the supplier starts production");
  ok(await move(ctx.supplier, "production"));
  ok(await move(ctx.supplier, "ready_for_shipment"));

  ok(await ctx.supplier.client.from("shipments").insert({ deal_id: ctx.deal, carrier: "Test Line", tracking_number: "TRK1", transport_mode: "sea", origin_country: "EG", destination_country: "SA" }));
  denied(await ctx.outsider.client.from("shipments").insert({ deal_id: ctx.deal, carrier: "x" }));
  const docPath = `deal/${ctx.deal}/${crypto.randomUUID()}.pdf`;
  ok(await ctx.supplier.client.storage.from("private-files").upload(docPath, new Blob(["%PDF"], { type: "application/pdf" })));
  ok(await ctx.supplier.client.from("shipment_documents").insert({ deal_id: ctx.deal, doc_type: "commercial_invoice", storage_path: docPath, file_name: "invoice.pdf", company_id: ctx.supCo }));
  assert.ok((await ctx.buyer.client.storage.from("private-files").download(docPath)).data, "counterparty can read trade documents");
  denied(await ctx.outsider.client.storage.from("private-files").download(docPath));
  const del = await ctx.buyer.client.storage.from("private-files").remove([docPath]);
  assert.ok((await svc.storage.from("private-files").download(docPath)).data, `counterparty cannot delete documents (${JSON.stringify(del.data)})`);

  ok(await move(ctx.supplier, "shipped"));
  denied(await move(ctx.supplier, "delivered"), "only the buyer confirms receipt");
  ok(await move(ctx.buyer, "delivered"));
  denied(await move(ctx.supplier, "completed"), "only the buyer confirms completion");
  ok(await move(ctx.buyer, "completed"));
  assert.equal(await st(), "completed");
  const hist = ok(await svc.from("deal_status_history").select("to_status").eq("deal_id", ctx.deal));
  assert.ok(hist.length >= 9, "status history is recorded");
  const c = ok(await svc.from("commissions").select("status, due_date").eq("id", ctx.commission).single());
  assert.equal(c.status, "due");
  assert.ok(c.due_date, "due date is set on completion");
});

test("commission payments: supplier reports, only admin confirms; buyers & outsiders cannot see it", async () => {
  assert.equal(ok(await ctx.outsider.client.from("commissions").select("id").eq("id", ctx.commission)).length, 0);
  assert.equal(ok(await ctx.buyer.client.from("commissions").select("id").eq("id", ctx.commission)).length, 0, "default payer is supplier");
  await ctx.supplier.client.from("commissions").update({ status: "paid", amount_paid: 362.5 }).eq("id", ctx.commission);
  assert.equal(ok(await svc.from("commissions").select("status").eq("id", ctx.commission).single()).status, "due", "suppliers cannot mark commissions paid");

  const today = new Date().toISOString().slice(0, 10);
  const p1 = ok(await ctx.supplier.client.from("commission_payments").insert({ commission_id: ctx.commission, amount: 200, paid_on: today, method: "bank_transfer" }).select("id, status").single());
  assert.equal(p1.status, "submitted");
  denied(await ctx.supplier.client.from("commission_payments").insert({ commission_id: ctx.commission, amount: 10, paid_on: today, status: "confirmed" }), "cannot self-confirm");
  denied(await ctx.supplier.client.rpc("review_commission_payment", { p_payment: p1.id, p_approve: true, p_notes: null }));
  denied(await ctx.ops.client.rpc("review_commission_payment", { p_payment: p1.id, p_approve: true, p_notes: null }), "operations cannot confirm money");
  ok(await ctx.admin.client.rpc("review_commission_payment", { p_payment: p1.id, p_approve: true, p_notes: "matched bank statement" }));
  let c = ok(await svc.from("commissions").select("status, amount_paid").eq("id", ctx.commission).single());
  assert.equal(c.status, "partially_paid");
  assert.equal(Number(c.amount_paid), 200);
  const p2 = ok(await ctx.supplier.client.from("commission_payments").insert({ commission_id: ctx.commission, amount: 162.5, paid_on: today }).select("id").single());
  ok(await ctx.admin.client.rpc("review_commission_payment", { p_payment: p2.id, p_approve: true, p_notes: null }));
  c = ok(await svc.from("commissions").select("status").eq("id", ctx.commission).single());
  assert.equal(c.status, "paid");
});

test("reviews only after completion and only by parties", async () => {
  ok(await ctx.buyer.client.from("reviews").insert({ deal_id: ctx.deal, reviewer_company_id: ctx.buyCo, reviewee_company_id: ctx.supCo, rating: 5, comment: "Great" }));
  denied(await ctx.buyer.client.from("reviews").insert({ deal_id: ctx.deal, reviewer_company_id: ctx.buyCo, reviewee_company_id: ctx.supCo, rating: 1 }), "one review per party per deal");
  denied(await ctx.outsider.client.from("reviews").insert({ deal_id: ctx.deal, reviewer_company_id: ctx.outCo, reviewee_company_id: ctx.supCo, rating: 1 }));
});

test("disputes freeze the deal and staff resolve them; cancellation waives commission", async () => {
  // a second deal to dispute and cancel
  const rfq = ok(await ctx.buyer.client.from("rfqs").insert({ buyer_company_id: ctx.buyCo, title: "Scarves", description: "Chiffon scarves, 20 colours", category_id: ctx.category, quantity: 1000, unit_code: "piece", delivery_country: "SA", currency_code: "SAR" }).select("id").single()).id;
  const until = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const q = ok(await ctx.supplier2.client.from("quotations").insert({ rfq_id: rfq, supplier_company_id: ctx.sup2Co, unit_price: 9, quantity: 1000, total_amount: 0, currency_code: "SAR", lead_time_days: 20, valid_until: until }).select("id").single()).id;
  ok(await ctx.buyer.client.rpc("accept_quotation", { p_quotation: q }));
  const deal = ok(await svc.from("deals").select("id").eq("quotation_id", q).single()).id;

  denied(await ctx.outsider.client.rpc("open_dispute", { p_deal: deal, p_reason: "quality", p_description: "x" }));
  const disp = ok(await ctx.buyer.client.rpc("open_dispute", { p_deal: deal, p_reason: "other", p_description: "Supplier changed the price after acceptance" }));
  assert.equal(ok(await svc.from("deals").select("status").eq("id", deal).single()).status, "disputed");
  denied(await ctx.buyer.client.rpc("update_deal_status", { p_deal: deal, p_to: "awaiting_payment_confirmation" }), "a disputed deal is frozen");
  denied(await ctx.buyer.client.rpc("resolve_dispute", { p_dispute: disp, p_resolution: "self", p_deal_outcome: "resume" }));
  ok(await ctx.ops.client.rpc("resolve_dispute", { p_dispute: disp, p_resolution: "Agreed to cancel", p_deal_outcome: "cancelled" }));
  assert.equal(ok(await svc.from("deals").select("status").eq("id", deal).single()).status, "cancelled");
  assert.equal(ok(await svc.from("commissions").select("status").eq("deal_id", deal).single()).status, "waived");
});

test("notifications are private and cannot be forged", async () => {
  const mine = ok(await ctx.supplier.client.from("notifications").select("id, user_id"));
  assert.ok(mine.length > 0 && mine.every((n) => n.user_id === ctx.supplier.id));
  denied(await ctx.buyer.client.from("notifications").insert({ user_id: ctx.supplier.id, type: "x", title: "fake", body: "fake" }));
  const upd = ok(await ctx.buyer.client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", mine[0].id).select());
  assert.equal(upd.length, 0, "cannot touch someone else's notifications");
});

test("anonymous visitors see only public data", async () => {
  for (const t of ["profiles", "company_legal", "rfqs", "quotations", "deals", "messages", "commissions", "commission_payments", "disputes", "notifications", "audit_logs", "admin_actions", "verification_documents", "supplier_verifications", "shipment_documents"]) {
    const r = await anon.from(t).select("*").limit(1);
    assert.ok(r.error || r.data.length === 0, `anon must not read ${t}`);
  }
  const pub = ok(await anon.from("platform_settings").select("key, is_public"));
  assert.ok(pub.every((s) => s.is_public), "only public settings are exposed");
  assert.ok((await anon.rpc("admin_dashboard_stats", {})).error);
});

test("admin: dashboard stats, audit log, settings are staff-only", async () => {
  denied(await ctx.buyer.client.rpc("admin_dashboard_stats", {}));
  const s = ok(await ctx.admin.client.rpc("admin_dashboard_stats", {}));
  assert.ok(s && typeof s === "object");
  assert.equal(ok(await ctx.buyer.client.from("audit_logs").select("id").limit(1)).length, 0);
  assert.ok(ok(await ctx.admin.client.from("audit_logs").select("id").limit(1)).length > 0, "audit trail is written");
  denied(await ctx.ops.client.from("platform_settings").update({ value: 7 }).eq("key", "default_commission_rate").select().single(), "operations cannot change settings");
  ok(await ctx.admin.client.from("platform_settings").update({ value: 5 }).eq("key", "default_commission_rate"));
  ok(await ctx.admin.client.rpc("admin_set_user", { p_user: ctx.outsider.id, p_role: "buyer", p_active: false }));
  const p = ok(await svc.from("profiles").select("is_active").eq("id", ctx.outsider.id).single());
  assert.equal(p.is_active, false);
  denied(await ctx.admin.client.rpc("admin_set_user", { p_user: ctx.admin.id, p_role: "buyer", p_active: true }), "admins cannot demote themselves");
});
