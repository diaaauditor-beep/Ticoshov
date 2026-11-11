import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, options } from "@/lib/reference";
import { ActionButton, ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Notice, PageHeader, Section, Stat, StatusBadge } from "@/components/ui/primitives";
import { adjustCommissionAction, recordCommissionPaymentAction, reviewCommissionPaymentAction, saveCommissionRuleAction, toggleCommissionRuleAction } from "@/app/actions/admin";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { sp } from "@/lib/search";

export default async function AdminCommissionsPage({ params, searchParams }: PageProps<"/[locale]/admin/commissions">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status);
  const supabase = await createClient();
  const ref = await getReference();
  const o = options(ref, locale);
  let q = supabase.from("commissions").select("*, deals(id, reference), supplier:companies!commissions_supplier_company_id_fkey(name, name_ar)");
  if (status in t.enums.commissionStatus) q = q.eq("status", status as "due");
  const [{ data: rows }, { data: all }, { data: rules }, { data: payments }, { data: companies }, { data: setting }] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(300),
    supabase.from("commissions").select("amount, amount_paid, currency_code, status"),
    supabase.from("commission_rules").select("*").order("created_at", { ascending: false }),
    supabase.from("commission_payments").select("*, commissions(currency_code, deals(id, reference))").eq("status", "submitted").order("created_at"),
    supabase.from("companies").select("id, name, kind").order("name").limit(1000),
    supabase.from("platform_settings").select("value").eq("key", "default_commission_rate").maybeSingle(),
  ]);
  const C = t.admin.commissions;
  const sum = (pred: (c: { status: string }) => boolean, f: (c: { amount: number; amount_paid: number }) => number) => {
    const m = new Map<string, number>();
    for (const c of all ?? []) if (pred(c)) m.set(c.currency_code, (m.get(c.currency_code) ?? 0) + f(c));
    return [...m].filter(([, v]) => v !== 0).map(([cur, v]) => formatMoney(v, cur, locale)).join(" · ") || "—";
  };
  const targetName = (r: NonNullable<typeof rules>[number]) =>
    r.scope === "country" ? o.allCountries.find((c) => c.value === r.country_code)?.label
    : r.scope === "category" ? o.categories.find((c) => c.value === r.category_id)?.label
    : companies?.find((c) => c.id === (r.supplier_company_id ?? r.buyer_company_id))?.name;
  const admin = viewer.isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader title={C.title} description={t.commissionPage.text} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={C.earned} value={<span className="text-lg">{sum((c) => c.status !== "waived", (c) => Number(c.amount))}</span>} />
        <Stat label={C.pending} value={<span className="text-lg">{sum((c) => ["pending", "due", "partially_paid"].includes(c.status), (c) => Number(c.amount) - Number(c.amount_paid))}</span>} />
        <Stat label={C.overdue} value={<span className="text-lg">{sum((c) => c.status === "overdue", (c) => Number(c.amount) - Number(c.amount_paid))}</span>} />
        <Stat label={C.collected} value={<span className="text-lg">{sum(() => true, (c) => Number(c.amount_paid))}</span>} />
      </div>

      {admin && (payments?.length ?? 0) > 0 && (
        <Section title={C.paymentsToReview}>
          <ul className="divide-y divide-slate-100 text-sm">
            {payments!.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <Link className="link font-mono text-xs" href={`/${locale}/admin/deals/${p.commissions?.deals?.id}`}>{p.commissions?.deals?.reference}</Link>{" "}
                  · <strong>{formatMoney(p.amount, p.commissions?.currency_code, locale)}</strong> · {formatDate(p.paid_on, locale)} {p.method && `· ${p.method}`} {p.reference && `· ${p.reference}`}
                  {p.evidence_path && <> · <a className="link" href={`/files?path=${encodeURIComponent(p.evidence_path)}`} target="_blank" rel="noopener">{t.commissionPage.evidence}</a></>}
                </span>
                <span className="flex gap-2">
                  <ActionButton action={reviewCommissionPaymentAction} hidden={{ id: p.id, approve: "true" }} errors={t.errors} className="btn btn-primary btn-sm">{C.confirm}</ActionButton>
                  <ActionButton action={reviewCommissionPaymentAction} hidden={{ id: p.id, approve: "false" }} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-secondary btn-sm text-red-600">{C.reject}</ActionButton>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={C.rules}>
        <p className="mb-3 text-sm text-slate-600">{C.rulesText}</p>
        <p className="mb-4 text-sm">{C.defaultRate}: <strong>{String(setting?.value ?? "5")}%</strong> {admin && <Link className="link ms-2" href={`/${locale}/admin/settings`}>{t.common.edit}</Link>}</p>
        {(rules?.length ?? 0) > 0 && (
          <table className="table mb-4"><thead><tr><th>{C.scope}</th><th>{C.target}</th><th>{C.rate}</th><th>{t.common.status}</th><th></th></tr></thead>
            <tbody>{rules!.map((r) => (
              <tr key={r.id}>
                <td>{t.enums.ruleScope[r.scope as keyof typeof t.enums.ruleScope]}</td><td>{targetName(r) ?? "—"}</td><td>{r.rate}%</td>
                <td>{r.is_active ? t.common.yes : t.common.no}</td>
                <td>{admin && <ActionButton action={toggleCommissionRuleAction} hidden={{ id: r.id, active: String(!r.is_active) }} errors={t.errors}>{r.is_active ? t.admin.users.deactivate : t.admin.users.activate}</ActionButton>}</td>
              </tr>
            ))}</tbody></table>
        )}
        {admin && (
          <div className="grid gap-4 lg:grid-cols-4">
            {(["supplier", "buyer", "category", "country"] as const).map((scope) => (
              <ActionForm key={scope} action={saveCommissionRuleAction} errors={t.errors} success={t.common.saved} className="space-y-2 rounded-md border border-slate-200 p-3">
                <input type="hidden" name="scope" value={scope} />
                <p className="text-sm font-semibold text-navy-900">{C.addRule}: {t.enums.ruleScope[scope]}</p>
                <SelectField name="target" required placeholder="" options={
                  scope === "country" ? o.allCountries : scope === "category" ? o.categories
                  : (companies ?? []).filter((c) => c.kind === scope).map((c) => ({ value: c.id, label: c.name }))} />
                <TextField name="rate" type="number" step="0.01" min={0} max={100} required placeholder={C.rate} />
                <SubmitButton className="btn btn-secondary btn-sm">{C.addRule}</SubmitButton>
              </ActionForm>
            ))}
          </div>
        )}
      </Section>

      <Section title={C.title}>
        <form method="get" className="mb-4 flex gap-2">
          <select name="status" defaultValue={status} className="input w-auto"><option value="">{t.common.all}</option>{Object.entries(t.enums.commissionStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="btn btn-secondary">{t.common.apply}</button>
        </form>
        {!admin && <Notice tone="navy">{t.admin.staffOnly}</Notice>}
        <div className="-mx-5 overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead><tr><th>{t.common.reference}</th><th>{t.common.supplier}</th><th>{t.deal.value}</th><th>{t.commissionPage.amount}</th><th>{t.commissionPage.paid}</th><th>{t.common.status}</th><th>{C.adjust}</th></tr></thead>
            <tbody>
              {(rows ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs"><Link className="link" href={`/${locale}/admin/deals/${c.deals?.id}`}>{c.deals?.reference}</Link></td>
                  <td>{loc(locale, c.supplier?.name_ar, c.supplier?.name)}</td>
                  <td className="tabular-nums">{formatMoney(c.deal_value, c.currency_code, locale)}</td>
                  <td className="tabular-nums">{formatMoney(c.amount, c.currency_code, locale)}<div className="text-xs text-slate-500">{c.rate}% · {t.enums.rateSource[c.rate_source as keyof typeof t.enums.rateSource] ?? c.rate_source}</div></td>
                  <td className="tabular-nums">{formatMoney(c.amount_paid, c.currency_code, locale)}</td>
                  <td><StatusBadge status={c.status} label={t.enums.commissionStatus[c.status]} /><div className="text-xs text-slate-500">{formatDate(c.due_date, locale)}</div></td>
                  <td>
                    {admin && (
                      <details>
                        <summary className="cursor-pointer text-xs text-navy-700">{t.common.edit}</summary>
                        <ActionForm action={adjustCommissionAction} errors={t.errors} success={t.common.saved} className="mt-2 grid w-72 gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <input name="rate" type="number" step="0.01" min={0} max={100} defaultValue={c.rate} className="input py-1 text-xs" aria-label={C.rate} />
                          <select name="status" defaultValue={c.status} className="input py-1 text-xs" aria-label={C.setStatus}>{Object.entries(t.enums.commissionStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                          <input name="due_date" type="date" defaultValue={c.due_date ?? ""} className="input py-1 text-xs" aria-label={t.commissionPage.dueDate} />
                          <textarea name="admin_notes" defaultValue={c.admin_notes ?? ""} rows={2} className="input text-xs" placeholder={C.notes} />
                          <SubmitButton className="btn btn-secondary btn-sm">{t.common.save}</SubmitButton>
                        </ActionForm>
                        <ActionForm action={recordCommissionPaymentAction} errors={t.errors} success={t.common.saved} className="mt-3 grid w-72 gap-2 border-t border-slate-100 pt-2">
                          <input type="hidden" name="id" value={c.id} />
                          <p className="text-xs font-semibold">{t.commissionPage.submitPayment}</p>
                          <input name="amount" type="number" step="0.01" min={0} required placeholder={t.commissionPage.paymentAmount} className="input py-1 text-xs" />
                          <input name="paid_on" type="date" className="input py-1 text-xs" aria-label={t.commissionPage.paidOn} />
                          <input name="reference" placeholder={t.commissionPage.paymentRef} className="input py-1 text-xs" />
                          <SubmitButton className="btn btn-secondary btn-sm">{C.confirm}</SubmitButton>
                        </ActionForm>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
