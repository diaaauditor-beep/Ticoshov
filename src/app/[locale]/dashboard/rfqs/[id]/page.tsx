import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReference, countryName, unitName, categoryName, options } from "@/lib/reference";
import { ActionButton, ActionForm, FileField, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { Badge, DL, Notice, PageHeader, Section, StatusBadge, VerifiedBadge } from "@/components/ui/primitives";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import { FileList } from "@/components/FileList";
import { formatDate, formatMoney, formatNumber, loc } from "@/lib/format";
import {
  acceptQuotationAction, openConversationAction, rejectQuotationAction, saveQuotationAction,
  setRfqStatusAction, startNegotiationAction, withdrawQuotationAction,
} from "@/app/actions/trade";

export default async function RfqDetailPage({ params }: PageProps<"/[locale]/dashboard/rfqs/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireCompany(locale);
  const supabase = await createClient();
  const { data: rfq } = await supabase.from("rfqs")
    .select("*, buyer:companies!rfqs_buyer_company_id_fkey(name, name_ar, country_code, city), target:companies!rfqs_target_company_id_fkey(name, name_ar), products(name_en, name_ar), rfq_attachments(id, storage_path, file_name, size_bytes)")
    .eq("id", id).maybeSingle();
  if (!rfq) notFound();
  const ref = await getReference();
  const o = options(ref, locale);
  const isBuyer = rfq.buyer_company_id === viewer.company.id;
  const { data: quotes } = await supabase.from("quotations")
    .select("*, supplier:companies!quotations_supplier_company_id_fkey(id, slug, name, name_ar, verification_status, country_code), quotation_items(*), quotation_attachments(id, storage_path, file_name), deals(id, status)")
    .eq("rfq_id", id).order("total_amount");
  const unit = unitName(ref, rfq.unit_code, locale);
  const specs = (Array.isArray(rfq.specifications) ? rfq.specifications : []) as Array<{ key: string; value: string }>;
  const mine = quotes?.find((q) => q.supplier_company_id === viewer.company.id);
  const active = (quotes ?? []).filter((q) => q.status !== "withdrawn");
  const minPrice = Math.min(...active.map((q) => Number(q.unit_price)));
  const minLead = Math.min(...active.map((q) => q.lead_time_days));
  const canQuote = !isBuyer && viewer.company.kind === "supplier" && viewer.company.verification_status === "approved" && rfq.status === "open" && new Date(rfq.expires_at) > new Date();
  const editable = mine && (mine.status === "submitted" || mine.status === "negotiating");
  const today = new Date().toISOString().slice(0, 10);
  const defaultValid = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{rfq.title} <StatusBadge status={rfq.status} label={t.enums.rfqStatus[rfq.status]} /></span>}
        description={<span className="font-mono">{rfq.reference}</span>}
        actions={isBuyer && rfq.status === "open" && (
          <>
            <ActionButton action={setRfqStatusAction} hidden={{ id, status: "closed" }} errors={t.errors} confirm={t.common.areYouSure}>{t.rfq.close}</ActionButton>
            <ActionButton action={setRfqStatusAction} hidden={{ id, status: "cancelled" }} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-secondary btn-sm text-red-600">{t.rfq.cancel}</ActionButton>
          </>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Section title={t.rfq.description}>
          <p className="text-sm leading-7 whitespace-pre-line text-slate-700">{rfq.description}</p>
          {specs.length > 0 && (
            <table className="mt-4 w-full text-sm"><tbody>
              {specs.map((s, i) => <tr key={i} className="border-b border-slate-100 last:border-0"><th className="w-2/5 py-1.5 text-start font-medium text-slate-500">{s.key}</th><td className="py-1.5">{s.value}</td></tr>)}
            </tbody></table>
          )}
          <div className="mt-4"><FileList files={rfq.rfq_attachments} t={t} label={t.rfq.attachments} /></div>
        </Section>
        <Section title={t.common.details}>
          <DL items={[
            [t.rfq.buyerCompany, `${loc(locale, rfq.buyer?.name_ar, rfq.buyer?.name)} · ${countryName(ref, rfq.buyer?.country_code, locale)}`],
            [t.common.category, categoryName(ref, rfq.category_id, locale)],
            [t.rfq.product, rfq.products ? <Link className="link" href={`/${locale}/products/${rfq.product_id}`}>{loc(locale, rfq.products.name_ar, rfq.products.name_en)}</Link> : "—"],
            [t.rfq.quantity, `${formatNumber(rfq.quantity, locale)} ${unit}`],
            [t.rfq.targetPrice, rfq.target_price != null ? formatMoney(rfq.target_price, rfq.currency_code, locale) : "—"],
            [t.rfq.deliveryCountry, `${countryName(ref, rfq.delivery_country, locale)}${rfq.delivery_city ? ` · ${rfq.delivery_city}` : ""}`],
            [t.rfq.incoterm, rfq.incoterm ?? "—"],
            [t.rfq.requiredBy, formatDate(rfq.required_by, locale)],
            [t.rfq.closesOn, formatDate(rfq.expires_at, locale)],
            [t.rfq.targetSupplier, rfq.target ? loc(locale, rfq.target.name_ar, rfq.target.name) : t.rfq.publicRfq],
          ]} />
        </Section>
      </div>

      {isBuyer && (
        <Section title={`${t.rfq.compare} (${active.length})`}>
          {active.length === 0 ? <p className="text-sm text-slate-500">{t.rfq.noQuotations}</p> : (
            <div className="-mx-5 overflow-x-auto">
              <table className="table min-w-[720px]">
                <thead><tr>
                  <th>{t.common.supplier}</th><th>{t.quote.unitPrice}</th><th>{t.quote.total}</th><th>{t.quote.moq}</th>
                  <th>{t.quote.leadTimeShort}</th><th>{t.quote.incoterm}</th><th>{t.quote.paymentTermsShort}</th><th>{t.quote.validUntil}</th><th>{t.common.status}</th><th></th>
                </tr></thead>
                <tbody>
                  {active.map((q) => {
                    const open = q.status === "submitted" || q.status === "negotiating";
                    const deal = q.deals;
                    return (
                      <tr key={q.id} className={q.status === "accepted" ? "bg-emerald-50/50" : ""}>
                        <td>
                          <Link href={`/${locale}/companies/${q.supplier?.slug}`} className="font-medium text-navy-900 hover:underline">{loc(locale, q.supplier?.name_ar, q.supplier?.name)}</Link>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.supplier?.verification_status === "approved" && <VerifiedBadge label={t.company.verified} />}
                            {Number(q.unit_price) === minPrice && active.length > 1 && <Badge tone="green">{t.quote.best}</Badge>}
                            {q.lead_time_days === minLead && active.length > 1 && <Badge tone="blue">{t.quote.fastest}</Badge>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{formatMoney(q.unit_price, q.currency_code, locale)}</td>
                        <td className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(q.total_amount, q.currency_code, locale)}<div className="text-xs font-normal text-slate-500">{formatNumber(q.quantity, locale)} {unit}</div></td>
                        <td className="tabular-nums">{q.moq ? formatNumber(q.moq, locale) : "—"}</td>
                        <td className="whitespace-nowrap">{q.lead_time_days} {t.quote.days}</td>
                        <td>{q.incoterm ?? "—"}</td>
                        <td className="max-w-48 text-xs text-slate-600">{q.payment_terms ?? "—"}</td>
                        <td className="whitespace-nowrap">{formatDate(q.valid_until, locale)}</td>
                        <td><StatusBadge status={q.status} label={t.enums.quotationStatus[q.status]} />{q.revision > 1 && <div className="mt-1 text-xs text-slate-500">{t.quote.revision} {q.revision}</div>}</td>
                        <td>
                          <div className="flex flex-col items-start gap-1.5">
                            {deal && <Link href={`/${locale}/dashboard/deals/${deal.id}`} className="btn btn-primary btn-sm">{t.quote.openDeal}</Link>}
                            {open && rfq.status === "open" && (
                              <>
                                <ActionButton action={acceptQuotationAction} hidden={{ id: q.id, locale }} errors={t.errors} confirm={t.quote.acceptConfirm} className="btn btn-accent btn-sm">{t.quote.accept}</ActionButton>
                                {q.status === "submitted" && <ActionButton action={startNegotiationAction} hidden={{ id: q.id, locale }} errors={t.errors}>{t.quote.negotiate}</ActionButton>}
                                <ActionButton action={rejectQuotationAction} hidden={{ id: q.id }} errors={t.errors} confirm={t.quote.rejectConfirm} className="btn btn-ghost btn-sm text-red-600">{t.quote.reject}</ActionButton>
                              </>
                            )}
                            {!deal && <ActionButton action={openConversationAction} hidden={{ id: q.id, locale }} errors={t.errors} className="btn btn-ghost btn-sm">{t.quote.message}</ActionButton>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {active.some((q) => q.notes || q.delivery_terms || q.quotation_items.length || q.quotation_attachments.length) && (
                <div className="mt-4 grid gap-4 px-5 md:grid-cols-2">
                  {active.map((q) => (q.notes || q.delivery_terms || q.quotation_items.length || q.quotation_attachments.length) ? (
                    <div key={q.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-navy-900">{loc(locale, q.supplier?.name_ar, q.supplier?.name)}</p>
                      {q.delivery_terms && <p className="mt-1"><span className="text-slate-500">{t.quote.deliveryTerms}:</span> {q.delivery_terms}</p>}
                      {q.notes && <p className="mt-1 whitespace-pre-line text-slate-700">{q.notes}</p>}
                      {q.quotation_items.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-slate-600">{q.quotation_items.map((it) => <li key={it.id}>{it.description} — {formatNumber(it.quantity, locale)} × {formatMoney(it.unit_price, q.currency_code, locale)} = {formatMoney(it.line_total, q.currency_code, locale)}</li>)}</ul>
                      )}
                      {q.quotation_attachments.length > 0 && <div className="mt-2"><FileList files={q.quotation_attachments} t={t} /></div>}
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {!isBuyer && (
        <Section title={t.rfq.yourQuotation}>
          {mine && (
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusBadge status={mine.status} label={t.enums.quotationStatus[mine.status]} />
              <span className="text-sm text-slate-600">{formatMoney(mine.total_amount, mine.currency_code, locale)} · {t.quote.revision} {mine.revision}</span>
              {mine.deals && <Link href={`/${locale}/dashboard/deals/${mine.deals.id}`} className="btn btn-primary btn-sm">{t.quote.openDeal}</Link>}
              {!mine.deals && <ActionButton action={openConversationAction} hidden={{ id: mine.id, locale }} errors={t.errors}>{t.quote.message}</ActionButton>}
              {editable && <ActionButton action={withdrawQuotationAction} hidden={{ id: mine.id }} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-ghost btn-sm text-red-600">{t.quote.withdraw}</ActionButton>}
            </div>
          )}
          {!mine && !canQuote && <Notice>{viewer.company.verification_status !== "approved" ? t.rfq.verifyToQuote : t.errors.rfqClosed}</Notice>}
          {((!mine && canQuote) || editable) && (
            <ActionForm action={saveQuotationAction} errors={t.errors} success={t.common.saved} className="space-y-4">
              <input type="hidden" name="rfq_id" value={rfq.id} />
              <input type="hidden" name="supplier_company_id" value={viewer.company.id} />
              {mine && <input type="hidden" name="quotation_id" value={mine.id} />}
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField name="unit_price" type="number" step="0.01" min={0} label={t.quote.unitPrice} required defaultValue={mine ? String(mine.unit_price) : undefined} />
                <TextField name="quantity" type="number" step="any" min={0} label={`${t.quote.quantity} (${unit})`} required defaultValue={String(mine?.quantity ?? rfq.quantity)} />
                <SelectField name="currency_code" label={t.common.currency} required options={o.currencies} defaultValue={mine?.currency_code ?? rfq.currency_code ?? "USD"} />
                <TextField name="moq" type="number" step="any" min={0} label={t.quote.moq} defaultValue={mine?.moq != null ? String(mine.moq) : undefined} />
                <TextField name="lead_time_days" type="number" min={0} max={730} label={t.quote.leadTime} required defaultValue={mine ? String(mine.lead_time_days) : undefined} />
                <SelectField name="incoterm" label={t.quote.incoterm} options={o.incoterms} defaultValue={mine?.incoterm ?? rfq.incoterm ?? ""} placeholder="—" />
                <TextField name="valid_until" type="date" min={today} label={t.quote.validUntil} required defaultValue={mine?.valid_until ?? defaultValid} />
              </div>
              <TextArea name="delivery_terms" label={t.quote.deliveryTerms} rows={2} maxLength={2000} defaultValue={mine?.delivery_terms ?? undefined} />
              <TextArea name="payment_terms" label={t.quote.paymentTerms} rows={2} maxLength={2000} defaultValue={mine?.payment_terms ?? undefined} />
              <TextArea name="notes" label={t.quote.notes} rows={3} maxLength={4000} defaultValue={mine?.notes ?? undefined} />
              <div>
                <p className="label">{t.common.details} ({t.common.optional})</p>
                <LineItemsEditor initial={(mine?.quotation_items ?? []).map((it) => ({ description: it.description, quantity: String(it.quantity), unit_price: String(it.unit_price) }))}
                  labels={{ description: t.common.details, quantity: t.quote.quantity, unitPrice: t.quote.unitPrice, add: t.product.addSpec, remove: t.common.remove }} />
              </div>
              {mine && mine.quotation_attachments.length > 0 && <FileList files={mine.quotation_attachments} t={t} label={t.quote.attachments} />}
              <FileField name="attachments" label={t.quote.attachments} multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" />
              <div className="flex justify-end"><SubmitButton>{mine ? t.quote.update : t.quote.submit}</SubmitButton></div>
            </ActionForm>
          )}
        </Section>
      )}
    </div>
  );
}
