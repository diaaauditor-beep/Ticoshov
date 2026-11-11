"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { file, files, num, str, valuesOf, type ActionState } from "@/lib/forms";
import { fieldErrorsOf, quotationSchema, rfqSchema, shipmentSchema } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";
import { isLocale } from "@/i18n/config";
import type { Database } from "@/lib/supabase/database.types";

type DealStatus = Database["public"]["Enums"]["deal_status"];
type TradeDoc = Database["public"]["Enums"]["trade_doc_type"];
const localeOf = (fd: FormData) => (isLocale(str(fd, "locale")) ? str(fd, "locale") : "ar");
const refresh = () => revalidatePath("/", "layout");

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

// ---------------------------------------------------------------- RFQs
export async function createRfqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const values = valuesOf(fd);
  const parsed = rfqSchema.safeParse({
    title: str(fd, "title"), description: str(fd, "description"), category_id: str(fd, "category_id"),
    product_id: str(fd, "product_id"), quantity: str(fd, "quantity"), unit_code: str(fd, "unit_code"),
    target_price: str(fd, "target_price"), currency_code: str(fd, "currency_code"), delivery_country: str(fd, "delivery_country"),
    delivery_city: str(fd, "delivery_city"), incoterm: str(fd, "incoterm"), required_by: str(fd, "required_by"),
    expires_at: str(fd, "expires_at"),
  });
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const r = parsed.data;
  const { supabase, userId } = await uid();
  if (!userId) return { error: "forbidden" };
  const keys = fd.getAll("spec_key").map(String);
  const vals = fd.getAll("spec_value").map(String);
  const specifications = keys.map((k, i) => ({ key: k.trim().slice(0, 80), value: (vals[i] ?? "").trim().slice(0, 400) })).filter((s) => s.key && s.value);
  const target = str(fd, "target_company_id");
  const { data, error } = await supabase.from("rfqs").insert({
    ...r, specifications, buyer_company_id: str(fd, "buyer_company_id"), created_by: userId,
    target_company_id: /^[0-9a-f-]{36}$/.test(target) ? target : null,
    expires_at: new Date(`${r.expires_at}T23:59:59Z`).toISOString(),
  }).select("id").single();
  if (error || !data) return { error: errorKey(error), values };
  for (const f of files(fd, "attachments").slice(0, 5)) {
    try {
      const up = await uploadFile("private-files", `rfq/${data.id}`, f, "document");
      await supabase.from("rfq_attachments").insert({ rfq_id: data.id, storage_path: up.path, file_name: up.name, mime_type: up.type, size_bytes: up.size, uploaded_by: userId });
    } catch { /* RFQ already created; failed attachment can be re-uploaded */ }
  }
  redirect(`/${locale}/dashboard/rfqs/${data.id}`);
}

export async function setRfqStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const status = str(fd, "status");
  if (status !== "closed" && status !== "cancelled") return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("rfqs").update({ status }).eq("id", str(fd, "id"));
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- Quotations
export async function saveQuotationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = valuesOf(fd);
  const parsed = quotationSchema.safeParse({
    unit_price: str(fd, "unit_price"), quantity: str(fd, "quantity"), currency_code: str(fd, "currency_code"),
    moq: str(fd, "moq"), lead_time_days: str(fd, "lead_time_days"), incoterm: str(fd, "incoterm"),
    delivery_terms: str(fd, "delivery_terms"), payment_terms: str(fd, "payment_terms"), valid_until: str(fd, "valid_until"),
    notes: str(fd, "notes"),
  });
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const q = parsed.data;
  const { supabase, userId } = await uid();
  if (!userId) return { error: "forbidden" };
  const quotationId = str(fd, "quotation_id");
  let id = quotationId;
  if (id) {
    const { error } = await supabase.from("quotations").update({ ...q, total_amount: 0 }).eq("id", id);
    if (error) return { error: errorKey(error), values };
  } else {
    const { data, error } = await supabase.from("quotations").insert({
      ...q, total_amount: 0, rfq_id: str(fd, "rfq_id"), supplier_company_id: str(fd, "supplier_company_id"), created_by: userId,
    }).select("id").single();
    if (error || !data) return { error: errorKey(error), values };
    id = data.id;
  }
  // optional line items (replace the set)
  const desc = fd.getAll("item_description").map(String);
  const qty = fd.getAll("item_quantity").map(String);
  const price = fd.getAll("item_unit_price").map(String);
  const items = desc.map((d, i) => ({ description: d.trim().slice(0, 400), quantity: Number(qty[i]), unit_price: Number(price[i]), sort_order: i }))
    .filter((it) => it.description && it.quantity > 0 && it.unit_price >= 0);
  await supabase.from("quotation_items").delete().eq("quotation_id", id);
  if (items.length) {
    const ins = await supabase.from("quotation_items").insert(items.map((it) => ({ ...it, quotation_id: id })));
    if (ins.error) return { error: errorKey(ins.error), values };
  }
  for (const f of files(fd, "attachments").slice(0, 5)) {
    try {
      const up = await uploadFile("private-files", `quotation/${id}`, f, "document");
      await supabase.from("quotation_attachments").insert({ quotation_id: id, storage_path: up.path, file_name: up.name, uploaded_by: userId });
    } catch (e) {
      return { error: errorKey(e), values };
    }
  }
  refresh();
  return { ok: true };
}

export async function withdrawQuotationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("quotations").update({ status: "withdrawn" }).eq("id", str(fd, "id"));
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function acceptQuotationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const supabase = await createClient();
  const revision = Number(str(fd, "revision"));
  const { data, error } = await supabase.rpc("accept_quotation", {
    p_quotation: str(fd, "id"), p_note: str(fd, "note") || undefined,
    p_expected_revision: Number.isInteger(revision) && revision > 0 ? revision : undefined,
  });
  if (error && /revised/i.test(error.message)) refresh();
  if (error) return { error: errorKey(error) };
  redirect(`/${locale}/dashboard/deals/${data}`);
}

export async function rejectQuotationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_quotation", { p_quotation: str(fd, "id"), p_reason: str(fd, "reason") });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function startNegotiationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_negotiation", { p_quotation: str(fd, "id") });
  if (error) return { error: errorKey(error) };
  redirect(`/${locale}/dashboard/deals/${data}`);
}

export async function openConversationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_conversation", { p_quotation: str(fd, "id") });
  if (error) return { error: errorKey(error) };
  redirect(`/${locale}/dashboard/messages/${data}`);
}

// ---------------------------------------------------------------- Messages
export async function sendMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const body = str(fd, "body").slice(0, 5000);
  const conversationId = str(fd, "conversation_id");
  const f = file(fd, "attachment");
  if (!body && !f) return { error: "required" };
  const { supabase, userId } = await uid();
  if (!userId) return { error: "forbidden" };
  let attachment: { path: string; name: string } | null = null;
  if (f) {
    try {
      attachment = await uploadFile("private-files", `conversation/${conversationId}`, f, "document");
    } catch (e) {
      return { error: errorKey(e) };
    }
  }
  const senderCompany = str(fd, "sender_company_id");
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId, sender_id: userId, sender_company_id: senderCompany || null,
    body: body || (attachment ? `📎 ${attachment.name}` : ""), attachment_path: attachment?.path ?? null, attachment_name: attachment?.name ?? null,
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function reportMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, userId } = await uid();
  const reason = str(fd, "reason").slice(0, 1000);
  if (reason.length < 3) return { error: "required" };
  const { error } = await supabase.from("message_reports").insert({ message_id: str(fd, "message_id"), reporter_id: userId, reason });
  if (error) return { error: errorKey(error) };
  return { ok: true };
}

// ---------------------------------------------------------------- Deals
export async function updateDealStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_deal_status", {
    p_deal: str(fd, "deal_id"), p_to: str(fd, "to") as DealStatus, p_note: str(fd, "note") || undefined,
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function declarePaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_payment", { p_deal: str(fd, "deal_id") });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function saveShipmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = valuesOf(fd);
  const parsed = shipmentSchema.safeParse({
    carrier: str(fd, "carrier"), tracking_number: str(fd, "tracking_number"), transport_mode: str(fd, "transport_mode"),
    incoterm: str(fd, "incoterm"), origin_country: str(fd, "origin_country"), destination_country: str(fd, "destination_country"),
    port_of_loading: str(fd, "port_of_loading"), port_of_discharge: str(fd, "port_of_discharge"), etd: str(fd, "etd"),
    eta: str(fd, "eta"), status: str(fd, "status") || "preparing", notes: str(fd, "notes"),
  });
  if (!parsed.success) return { error: "invalid", fieldErrors: fieldErrorsOf(parsed.error), values };
  const { supabase, userId } = await uid();
  const id = str(fd, "shipment_id");
  const { error } = id
    ? await supabase.from("shipments").update(parsed.data).eq("id", id)
    : await supabase.from("shipments").insert({ ...parsed.data, deal_id: str(fd, "deal_id"), created_by: userId });
  if (error) return { error: errorKey(error), values };
  refresh();
  return { ok: true };
}

export async function uploadTradeDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const dealId = str(fd, "deal_id");
  const f = file(fd, "file");
  if (!f) return { error: "required" };
  const { supabase, userId } = await uid();
  try {
    const up = await uploadFile("private-files", `deal/${dealId}`, f, "document");
    const { error } = await supabase.from("shipment_documents").insert({
      deal_id: dealId, shipment_id: str(fd, "shipment_id") || null, doc_type: (str(fd, "doc_type") || "other") as TradeDoc,
      storage_path: up.path, file_name: up.name, mime_type: up.type, size_bytes: up.size, company_id: str(fd, "company_id"), uploaded_by: userId,
    });
    if (error) {
      await supabase.storage.from("private-files").remove([up.path]);
      return { error: errorKey(error) };
    }
  } catch (e) {
    return { error: errorKey(e) };
  }
  refresh();
  return { ok: true };
}

export async function openDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const description = str(fd, "description");
  if (description.length < 10) return { error: "required", fieldErrors: { description: "required" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_dispute", { p_deal: str(fd, "deal_id"), p_reason: str(fd, "reason"), p_description: description });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function submitReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const rating = num(fd, "rating");
  if (!rating || rating < 1 || rating > 5) return { error: "required" };
  const { supabase, userId } = await uid();
  const { error } = await supabase.from("reviews").insert({
    deal_id: str(fd, "deal_id"), reviewer_company_id: str(fd, "reviewer_company_id"), reviewee_company_id: str(fd, "reviewee_company_id"),
    rating, comment: str(fd, "comment").slice(0, 2000) || null, created_by: userId,
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- Commissions & notifications
export async function reportCommissionPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const amount = num(fd, "amount");
  const paidOn = str(fd, "paid_on");
  if (!amount || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: "invalid" };
  const { supabase, userId } = await uid();
  const commissionId = str(fd, "commission_id");
  let evidence: string | null = null;
  const f = file(fd, "evidence");
  if (f) {
    try {
      evidence = (await uploadFile("private-files", `commission/${commissionId}`, f, "document")).path;
    } catch (e) {
      return { error: errorKey(e) };
    }
  }
  const { error } = await supabase.from("commission_payments").insert({
    commission_id: commissionId, amount, paid_on: paidOn, method: str(fd, "method").slice(0, 80) || null,
    reference: str(fd, "reference").slice(0, 120) || null, evidence_path: evidence, submitted_by: userId, status: "submitted",
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function markNotificationsReadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(fd, "id");
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- service providers on a deal
export async function addDealProviderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const provider = str(fd, "provider_id");
  if (!provider) return { error: "required", fieldErrors: { provider_id: "required" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_deal_service_provider", {
    p_deal: str(fd, "deal_id"), p_provider: provider, p_service: str(fd, "service") || "customs_clearance", p_note: str(fd, "note"),
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}

export async function removeDealProviderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_deal_service_provider", { p_assignment: str(fd, "id") });
  if (error) return { error: errorKey(error) };
  refresh();
  if (str(fd, "leave") === "1") redirect(`/${str(fd, "locale") === "en" ? "en" : "ar"}/dashboard/deals`);
  return { ok: true };
}

export async function providerShipmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("provider_update_shipment", {
    p_shipment: str(fd, "shipment_id"), p_status: str(fd, "status") as Database["public"]["Enums"]["shipment_status"],
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { ok: true };
}
