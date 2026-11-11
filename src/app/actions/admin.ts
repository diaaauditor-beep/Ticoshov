"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { num, str, type ActionState } from "@/lib/forms";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
const done = (): ActionState => {
  revalidatePath("/", "layout");
  return { ok: true };
};
const fail = (e: unknown): ActionState => ({ error: errorKey(e) });

export async function setUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user", {
    p_user: str(fd, "user_id"), p_role: str(fd, "role") as Enums["user_role"], p_active: str(fd, "active") === "true",
  });
  return error ? fail(error) : done();
}

export async function setCompanyActiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ is_active: str(fd, "active") === "true" }).eq("id", str(fd, "id"));
  return error ? fail(error) : done();
}

export async function startReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_verification_review", { p_verification: str(fd, "id") });
  return error ? fail(error) : done();
}

export async function reviewVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const status = str(fd, "status") as Enums["verification_status"];
  if (!["approved", "rejected", "needs_documents", "under_review"].includes(status)) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_verification", {
    p_verification: str(fd, "id"), p_status: status, p_message: str(fd, "message"), p_internal_notes: str(fd, "internal_notes"),
  });
  return error ? fail(error) : done();
}

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(fd, "id");
  const row = {
    name_en: str(fd, "name_en"), name_ar: str(fd, "name_ar"), sort_order: num(fd, "sort_order") ?? 0,
    is_active: fd.get("is_active") === "on", parent_id: str(fd, "parent_id") || null,
  };
  if (row.name_en.length < 2 || row.name_ar.length < 2) return { error: "required" };
  if (id) {
    const { error } = await supabase.from("categories").update(row).eq("id", id);
    return error ? fail(error) : done();
  }
  const slug = (str(fd, "slug") || row.name_en).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  if (slug.length < 2) return { error: "invalid" };
  const { error } = await supabase.from("categories").insert({ ...row, slug });
  return error ? fail(error) : done();
}

export async function saveCountryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const code = str(fd, "code").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return { error: "invalid" };
  const row = {
    code, name_en: str(fd, "name_en"), name_ar: str(fd, "name_ar"), phone_code: str(fd, "phone_code"),
    default_currency: str(fd, "default_currency") || null, is_active: fd.get("is_active") === "on",
    supplier_enabled: fd.get("supplier_enabled") === "on", buyer_enabled: fd.get("buyer_enabled") === "on",
  };
  if (!row.name_en || !row.name_ar || !/^\+[0-9]{1,4}$/.test(row.phone_code)) return { error: "invalid" };
  const { error } = await supabase.from("countries").upsert(row);
  return error ? fail(error) : done();
}

export async function saveCurrencyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const code = str(fd, "code").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return { error: "invalid" };
  const { error } = await supabase.from("currencies").upsert({
    code, name_en: str(fd, "name_en"), name_ar: str(fd, "name_ar"), symbol: str(fd, "symbol") || code,
    is_active: fd.get("is_active") === "on",
  });
  return error ? fail(error) : done();
}

export async function saveCommissionRuleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const scope = str(fd, "scope");
  const target = str(fd, "target");
  const rate = num(fd, "rate");
  if (rate == null || Number.isNaN(rate) || rate < 0 || rate > 100 || !target) return { error: "invalid" };
  const { data: auth } = await supabase.auth.getUser();
  const row = {
    scope, rate, notes: str(fd, "notes") || null, created_by: auth.user?.id,
    supplier_company_id: scope === "supplier" ? target : null, buyer_company_id: scope === "buyer" ? target : null,
    category_id: scope === "category" ? target : null, country_code: scope === "country" ? target : null,
  };
  const { error } = await supabase.from("commission_rules").insert(row);
  return error ? fail(error) : done();
}

export async function toggleCommissionRuleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("commission_rules").update({ is_active: str(fd, "active") === "true" }).eq("id", str(fd, "id"));
  return error ? fail(error) : done();
}

export async function adjustCommissionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const rate = num(fd, "rate");
  if (rate == null || Number.isNaN(rate) || rate < 0 || rate > 100) return { error: "invalid" };
  const { error } = await supabase.from("commissions").update({
    rate, status: str(fd, "status") as Enums["commission_status"], due_date: str(fd, "due_date") || null,
    admin_notes: str(fd, "admin_notes").slice(0, 4000) || null, rate_source: "manual",
  }).eq("id", str(fd, "id"));
  return error ? fail(error) : done();
}

export async function reviewCommissionPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_commission_payment", {
    p_payment: str(fd, "id"), p_approve: str(fd, "approve") === "true", p_notes: str(fd, "notes"),
  });
  return error ? fail(error) : done();
}

export async function recordCommissionPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  // Admin records a payment received directly, then confirms it in the same step.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const amount = num(fd, "amount");
  if (!amount || amount <= 0) return { error: "invalid" };
  const { data, error } = await supabase.from("commission_payments").insert({
    commission_id: str(fd, "id"), amount, paid_on: str(fd, "paid_on") || new Date().toISOString().slice(0, 10),
    method: str(fd, "method") || null, reference: str(fd, "reference") || null, submitted_by: auth.user?.id, status: "submitted",
  }).select("id").single();
  if (error || !data) return fail(error);
  const r = await supabase.rpc("review_commission_payment", { p_payment: data.id, p_approve: true, p_notes: "Recorded by administrator" });
  return r.error ? fail(r.error) : done();
}

export async function refreshOverdueAction(): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refresh_overdue_commissions");
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: String(data ?? 0) };
}

export async function setDisputeReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("disputes").update({ status: "under_review", assigned_to: auth.user?.id }).eq("id", str(fd, "id"));
  return error ? fail(error) : done();
}

export async function resolveDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const resolution = str(fd, "resolution");
  if (resolution.length < 3) return { error: "required", fieldErrors: { resolution: "required" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_dispute", { p_dispute: str(fd, "id"), p_resolution: resolution, p_deal_outcome: str(fd, "outcome") });
  return error ? fail(error) : done();
}

export async function moderateMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const op = str(fd, "op");
  if (op === "hide" || op === "unhide") {
    const { error } = await supabase.from("messages").update({ is_hidden: op === "hide" }).eq("id", str(fd, "message_id"));
    if (error) return fail(error);
  }
  if (op === "lock" || op === "unlock") {
    const { error } = await supabase.from("conversations").update({ is_locked: op === "lock" }).eq("id", str(fd, "conversation_id"));
    if (error) return fail(error);
  }
  const reportId = str(fd, "report_id");
  if (reportId && (op === "hide" || op === "dismiss" || op === "reviewed")) {
    const { error } = await supabase.from("message_reports").update({
      status: op === "dismiss" ? "dismissed" : "reviewed", reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", reportId);
    if (error) return fail(error);
  }
  return done();
}

export async function saveSettingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  let value: unknown;
  try {
    value = JSON.parse(str(fd, "value"));
  } catch {
    return { error: "invalid" };
  }
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("platform_settings").update({ value: value as never, updated_by: auth.user?.id }).eq("key", str(fd, "key"));
  return error ? fail(error) : done();
}
