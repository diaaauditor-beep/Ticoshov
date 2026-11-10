import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Viewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import { getReference, countryName, options } from "@/lib/reference";
import { ActionButton, ActionForm, FileField, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { Badge, DL, Notice, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { Conversation } from "@/components/Conversation";
import { FileList } from "@/components/FileList";
import { formatDate, formatMoney, formatNumber, loc } from "@/lib/format";
import {
  acceptQuotationAction, declarePaymentAction, openDisputeAction, reportCommissionPaymentAction, saveShipmentAction,
  submitReviewAction, updateDealStatusAction, uploadTradeDocAction,
} from "@/app/actions/trade";

type DealStatus = Database["public"]["Enums"]["deal_status"];
const FLOW: DealStatus[] = [
  "negotiation", "quotation_accepted", "awaiting_payment_confirmation", "payment_confirmed", "production",
  "ready_for_shipment", "shipped", "delivered", "completed",
];

export async function DealView({ dealId, viewer, t, locale, staffBase }: {
  dealId: string; viewer: Viewer; t: Dictionary; locale: Locale; staffBase?: string;
}) {
  if (!/^[0-9a-f-]{36}$/.test(dealId)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase.from("deals")
    .select("*, buyer:companies!deals_buyer_company_id_fkey(id, slug, name, name_ar, country_code), supplier:companies!deals_supplier_company_id_fkey(id, slug, name, name_ar, country_code), quotations(id, unit_price, quantity, moq, lead_time_days, incoterm, delivery_terms, payment_terms, valid_until, revision, status), rfqs(id, reference, unit_code, delivery_country)")
    .eq("id", dealId).maybeSingle();
  if (!d) notFound();
  const [ref, history, shipments, docs, commission, disputes, reviews, conv, requirements] = await Promise.all([
    getReference(),
    supabase.from("deal_status_history").select("*").eq("deal_id", dealId).order("created_at"),
    supabase.from("shipments").select("*").eq("deal_id", dealId).order("created_at"),
    supabase.from("shipment_documents").select("*").eq("deal_id", dealId).order("created_at"),
    supabase.from("commissions").select("*, commission_payments(*)").eq("deal_id", dealId).maybeSingle(),
    supabase.from("disputes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    supabase.from("reviews").select("reviewer_company_id, rating, comment").eq("deal_id", dealId),
    supabase.from("conversations").select("id").eq("deal_id", dealId).maybeSingle(),
    supabase.from("trade_document_requirements").select("*"),
  ]);
  const o = options(ref, locale);
  const myCompany = viewer.company?.id ?? null;
  const isBuyer = myCompany === d.buyer_company_id;
  const isSupplier = myCompany === d.supplier_company_id;
  const staff = viewer.isStaff;
  const q = d.quotations;
  const status = d.status;
  const S = t.enums.dealStatus;
  const hidden = { deal_id: d.id };
  const closed = status === "completed" || status === "cancelled";

  // Party actions for the current stage (mirrors the transition matrix in update_deal_status()).
  const next: Array<{ to: DealStatus; label: string; primary?: boolean }> = [];
  if (isSupplier && status === "payment_confirmed") next.push({ to: "production", label: S.production, primary: true });
  if (isSupplier && status === "production") next.push({ to: "ready_for_shipment", label: S.ready_for_shipment, primary: true });
  if (isSupplier && status === "ready_for_shipment") next.push({ to: "shipped", label: S.shipped, primary: true });
  if (isBuyer && status === "shipped") next.push({ to: "delivered", label: S.delivered, primary: true });
  if (isBuyer && status === "delivered") next.push({ to: "completed", label: S.completed, primary: true });
  if ((isBuyer || isSupplier) && status === "quotation_accepted") next.push({ to: "awaiting_payment_confirmation", label: S.awaiting_payment_confirmation });
  const canCancel = (isBuyer || isSupplier) && ["negotiation", "quotation_accepted", "awaiting_payment_confirmation"].includes(status);

  const supplierCountry = d.supplier?.country_code;
  const destCountry = d.rfqs?.delivery_country ?? d.buyer?.country_code;
  const checklist = (requirements.data ?? []).filter((r) => r.origin_country === supplierCountry && r.destination_country === destCountry);
  const uploadedTypes = new Set((docs.data ?? []).map((x) => x.doc_type));
  const shipment = shipments.data?.[0];
  const activeDispute = disputes.data?.find((x) => x.status === "open" || x.status === "under_review");
  const myReview = reviews.data?.find((r) => r.reviewer_company_id === myCompany);
  const comm = commission.data;
  const showCommission = comm && (staff || isSupplier || (isBuyer && comm.payer !== "supplier"));
  const flowIndex = FLOW.indexOf(status === "disputed" ? (d.status_before_dispute ?? "negotiation") : status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{d.title} <StatusBadge status={status} label={S[status]} /></span>}
        description={<span className="font-mono">{d.reference}</span>}
        actions={<span className="text-xl font-semibold text-navy-900 tabular-nums">{formatMoney(d.deal_value, d.currency_code, locale)}</span>}
      />

      {/* Progress */}
      <div className="card overflow-x-auto p-4">
        <ol className="flex min-w-[760px] items-center gap-1">
          {FLOW.map((s, i) => {
            const done = status !== "cancelled" && i <= flowIndex;
            return (
              <li key={s} className="flex flex-1 items-center gap-1">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-navy-900 text-brass-200" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                <span className={`text-[11px] leading-tight ${i === flowIndex ? "font-semibold text-navy-900" : "text-slate-500"}`}>{S[s]}</span>
                {i < FLOW.length - 1 && <span className={`mx-1 h-px flex-1 ${i < flowIndex ? "bg-navy-700" : "bg-slate-200"}`} />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Next step */}
      <Section title={t.deal.nextSteps}>
        <p className="text-sm text-slate-700">{t.deal.whatNow[status]}</p>
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {status === "negotiation" && isBuyer && q && (
            <ActionButton action={acceptQuotationAction} hidden={{ id: q.id, locale }} errors={t.errors} confirm={t.quote.acceptConfirm} className="btn btn-accent">{t.quote.accept}</ActionButton>
          )}
          {status === "negotiation" && isSupplier && d.rfqs && (
            <Link href={`/${locale}/dashboard/rfqs/${d.rfqs.id}`} className="btn btn-secondary">{t.quote.update}</Link>
          )}
          {next.map((n) => (
            <ActionButton key={n.to} action={updateDealStatusAction} hidden={{ ...hidden, to: n.to }} errors={t.errors} confirm={t.common.areYouSure}
              className={n.primary ? "btn btn-primary" : "btn btn-secondary"}>{t.deal.moveTo}: {n.label}</ActionButton>
          ))}
          {canCancel && (
            <ActionButton action={updateDealStatusAction} hidden={{ ...hidden, to: "cancelled" }} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-ghost text-red-600">{S.cancelled}</ActionButton>
          )}
        </div>
        {staff && (
          <ActionForm action={updateDealStatusAction} errors={t.errors} success={t.common.saved} className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <input type="hidden" name="deal_id" value={d.id} />
            <SelectField name="to" label={t.admin.forceStatus} options={Object.entries(S).filter(([k]) => k !== "disputed").map(([value, label]) => ({ value, label }))} defaultValue={status} />
            <TextField name="note" label={t.deal.noteOptional} maxLength={2000} />
            <SubmitButton className="btn btn-secondary">{t.common.save}</SubmitButton>
          </ActionForm>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.deal.parties}>
          <DL items={[
            [t.common.buyer, <Link key="b" className="link" href={`/${locale}/companies/${d.buyer?.slug}`}>{loc(locale, d.buyer?.name_ar, d.buyer?.name)}</Link>],
            [t.common.supplier, <Link key="s" className="link" href={`/${locale}/companies/${d.supplier?.slug}`}>{loc(locale, d.supplier?.name_ar, d.supplier?.name)}</Link>],
            [t.deal.rfqLink, d.rfqs ? (staff ? d.rfqs.reference : <Link className="link" href={`/${locale}/dashboard/rfqs/${d.rfqs.id}`}>{d.rfqs.reference}</Link>) : "—"],
            [t.deal.value, formatMoney(d.deal_value, d.currency_code, locale)],
            [t.quote.unitPrice, q ? formatMoney(q.unit_price, d.currency_code, locale) : "—"],
            [t.quote.quantity, q ? formatNumber(q.quantity, locale) : "—"],
            [t.quote.leadTimeShort, q ? `${q.lead_time_days} ${t.quote.days}` : "—"],
            [t.quote.incoterm, d.incoterm ?? "—"],
            [t.quote.paymentTermsShort, q?.payment_terms ?? "—"],
            [t.quote.deliveryTerms, q?.delivery_terms ?? "—"],
          ]} />
        </Section>

        <Section title={t.deal.paymentTitle}>
          <Notice tone="navy">{t.deal.paymentDisclaimer}</Notice>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-2"><span>{t.deal.buyerDeclared}</span><span className="text-slate-600">{d.buyer_payment_declared_at ? formatDate(d.buyer_payment_declared_at, locale, true) : t.deal.notDeclared}</span></li>
            <li className="flex justify-between gap-2"><span>{t.deal.supplierDeclared}</span><span className="text-slate-600">{d.supplier_payment_declared_at ? formatDate(d.supplier_payment_declared_at, locale, true) : t.deal.notDeclared}</span></li>
          </ul>
          {["quotation_accepted", "awaiting_payment_confirmation"].includes(status) && (
            <div className="mt-4">
              {isBuyer && !d.buyer_payment_declared_at && <ActionButton action={declarePaymentAction} hidden={hidden} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-primary">{t.deal.declareBuyer}</ActionButton>}
              {isSupplier && !d.supplier_payment_declared_at && <ActionButton action={declarePaymentAction} hidden={hidden} errors={t.errors} confirm={t.common.areYouSure} className="btn btn-primary">{t.deal.declareSupplier}</ActionButton>}
            </div>
          )}
        </Section>
      </div>

      {/* Shipment */}
      <Section title={t.deal.shipment}>
        {(isSupplier || staff) && !closed && status !== "negotiation" ? (
          <ActionForm action={saveShipmentAction} errors={t.errors} success={t.common.saved} className="space-y-4">
            <input type="hidden" name="deal_id" value={d.id} />
            {shipment && <input type="hidden" name="shipment_id" value={shipment.id} />}
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField name="status" label={t.deal.shipmentStatus} options={Object.entries(t.enums.shipmentStatus).map(([value, label]) => ({ value, label }))} defaultValue={shipment?.status ?? "preparing"} />
              <SelectField name="transport_mode" label={t.deal.mode} options={Object.entries(t.enums.transportMode).map(([value, label]) => ({ value, label }))} defaultValue={shipment?.transport_mode ?? ""} placeholder="—" />
              <SelectField name="incoterm" label={t.quote.incoterm} options={o.incoterms} defaultValue={shipment?.incoterm ?? d.incoterm ?? ""} placeholder="—" />
              <TextField name="carrier" label={t.deal.carrier} defaultValue={shipment?.carrier ?? undefined} maxLength={120} />
              <TextField name="tracking_number" label={t.deal.tracking} defaultValue={shipment?.tracking_number ?? undefined} maxLength={120} dir="ltr" />
              <span className="hidden sm:block" />
              <SelectField name="origin_country" label={t.product.origin} options={o.allCountries} defaultValue={shipment?.origin_country ?? supplierCountry ?? ""} placeholder="—" />
              <TextField name="port_of_loading" label={t.deal.pol} defaultValue={shipment?.port_of_loading ?? undefined} maxLength={120} />
              <TextField name="etd" type="date" label={t.deal.etd} defaultValue={shipment?.etd ?? undefined} />
              <SelectField name="destination_country" label={t.rfq.deliveryCountry} options={o.allCountries} defaultValue={shipment?.destination_country ?? destCountry ?? ""} placeholder="—" />
              <TextField name="port_of_discharge" label={t.deal.pod} defaultValue={shipment?.port_of_discharge ?? undefined} maxLength={120} />
              <TextField name="eta" type="date" label={t.deal.eta} defaultValue={shipment?.eta ?? undefined} />
            </div>
            <TextArea name="notes" label={t.quote.notes} rows={2} maxLength={2000} defaultValue={shipment?.notes ?? undefined} />
            <div className="flex justify-end"><SubmitButton className="btn btn-secondary">{shipment ? t.deal.updateShipment : t.deal.addShipment}</SubmitButton></div>
          </ActionForm>
        ) : shipment ? (
          <DL items={[
            [t.deal.shipmentStatus, <StatusBadge key="s" status={shipment.status} label={t.enums.shipmentStatus[shipment.status]} />],
            [t.deal.mode, shipment.transport_mode ? t.enums.transportMode[shipment.transport_mode as keyof typeof t.enums.transportMode] : "—"],
            [t.deal.carrier, shipment.carrier ?? "—"], [t.deal.tracking, shipment.tracking_number ?? "—"],
            [t.deal.pol, `${shipment.port_of_loading ?? "—"} (${countryName(ref, shipment.origin_country, locale)})`],
            [t.deal.pod, `${shipment.port_of_discharge ?? "—"} (${countryName(ref, shipment.destination_country, locale)})`],
            [t.deal.etd, formatDate(shipment.etd, locale)], [t.deal.eta, formatDate(shipment.eta, locale)],
          ]} />
        ) : <p className="text-sm text-slate-500">{t.deal.noShipment}</p>}
      </Section>

      {/* Documents */}
      <Section title={t.deal.documents}>
        {checklist.length > 0 && (
          <div className="mb-5">
            <p className="label">{t.deal.checklist}</p>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {checklist.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${uploadedTypes.has(c.doc_type) ? "bg-emerald-600 text-white" : "border border-slate-300"}`}>{uploadedTypes.has(c.doc_type) ? "✓" : ""}</span>
                  <span>{t.enums.tradeDocType[c.doc_type]} <Badge tone={c.is_required ? "amber" : "slate"}>{c.is_required ? t.deal.requiredDoc : t.deal.optionalDoc}</Badge>
                    {loc(locale, c.note_ar, c.note_en) && <span className="block text-xs text-slate-500">{loc(locale, c.note_ar, c.note_en)}</span>}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">{t.deal.checklistNote}</p>
          </div>
        )}
        <FileList t={t} files={(docs.data ?? []).map((x) => ({ ...x, tag: t.enums.tradeDocType[x.doc_type] }))} />
        {(isBuyer || isSupplier) && status !== "negotiation" && (
          <ActionForm action={uploadTradeDocAction} errors={t.errors} onSuccessReset className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <input type="hidden" name="deal_id" value={d.id} />
            <input type="hidden" name="company_id" value={myCompany ?? ""} />
            {shipment && <input type="hidden" name="shipment_id" value={shipment.id} />}
            <SelectField name="doc_type" label={t.deal.docType} options={Object.entries(t.enums.tradeDocType).map(([value, label]) => ({ value, label }))} />
            <FileField name="file" label={t.verification.file} required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.zip" />
            <SubmitButton className="btn btn-secondary">{t.deal.uploadDoc}</SubmitButton>
          </ActionForm>
        )}
      </Section>

      {/* Commission */}
      {showCommission && comm && (
        <Section title={t.deal.commission}>
          <p className="mb-3 text-xs text-slate-500">{t.deal.commissionNote}</p>
          <DL items={[
            [t.commissionPage.rate, `${comm.rate}% · ${t.enums.rateSource[comm.rate_source as keyof typeof t.enums.rateSource] ?? comm.rate_source}`],
            [t.commissionPage.amount, formatMoney(comm.amount, comm.currency_code, locale)],
            [t.commissionPage.paid, formatMoney(comm.amount_paid, comm.currency_code, locale)],
            [t.common.status, <StatusBadge key="c" status={comm.status} label={t.enums.commissionStatus[comm.status]} />],
            [t.commissionPage.dueDate, formatDate(comm.due_date, locale)],
          ]} />
          {staffBase && <Link href={`${staffBase}/commissions`} className="link mt-3 inline-block text-sm">{t.admin.commissions.title}</Link>}
          {isSupplier && ["due", "overdue", "partially_paid"].includes(comm.status) && (
            <CommissionPaymentForm t={t} commissionId={comm.id} />
          )}
        </Section>
      )}

      {/* Conversation */}
      {conv.data && (
        <Section title={t.deal.conversation}>
          <Conversation conversationId={conv.data.id} t={t} locale={locale} myCompanyId={myCompany} isStaff={staff} />
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.deal.timeline}>
          <ol className="space-y-3 border-s border-slate-200 ps-4">
            {(history.data ?? []).map((h) => (
              <li key={h.id} className="relative text-sm">
                <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-navy-700" />
                <p className="font-medium text-navy-900">{S[h.to_status]}</p>
                <p className="text-xs text-slate-500">{formatDate(h.created_at, locale, true)}</p>
                {h.note && <p className="mt-0.5 text-xs text-slate-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t.deal.dispute}>
          {(disputes.data ?? []).map((x) => (
            <div key={x.id} className="mb-3 rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.enums.disputeReason[x.reason as keyof typeof t.enums.disputeReason]}</span>
                <StatusBadge status={x.status} label={t.enums.disputeStatus[x.status]} />
              </div>
              <p className="mt-1 whitespace-pre-line text-slate-600">{x.description}</p>
              {x.resolution && <p className="mt-2 text-slate-800"><strong>{t.disputesPage.resolution}:</strong> {x.resolution}</p>}
              {staffBase && <Link href={`${staffBase}/disputes/${x.id}`} className="link mt-2 inline-block text-xs">{t.disputesPage.resolve}</Link>}
            </div>
          ))}
          {(isBuyer || isSupplier) && !activeDispute && !["negotiation", "cancelled"].includes(status) && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-red-700">{t.deal.openDispute}</summary>
              <ActionForm action={openDisputeAction} errors={t.errors} className="mt-3 space-y-3">
                <input type="hidden" name="deal_id" value={d.id} />
                <SelectField name="reason" label={t.deal.disputeReason} required options={Object.entries(t.enums.disputeReason).map(([value, label]) => ({ value, label }))} />
                <TextArea name="description" label={t.deal.disputeDescription} required minLength={10} maxLength={5000} rows={3} />
                <SubmitButton className="btn btn-danger">{t.deal.disputeSubmit}</SubmitButton>
                <p className="text-xs"><Link className="link" href={`/${locale}/legal/disputes`} target="_blank">{t.disputesPage.procedure}</Link></p>
              </ActionForm>
            </details>
          )}
          {!disputes.data?.length && !(isBuyer || isSupplier) && <p className="text-sm text-slate-500">{t.disputesPage.none}</p>}
        </Section>
      </div>

      {status === "completed" && (isBuyer || isSupplier) && (
        <Section title={t.deal.review}>
          {myReview ? <p className="text-sm text-slate-600">{t.deal.reviewed} {"★".repeat(myReview.rating)}</p> : (
            <ActionForm action={submitReviewAction} errors={t.errors} className="space-y-3">
              <input type="hidden" name="deal_id" value={d.id} />
              <input type="hidden" name="reviewer_company_id" value={myCompany ?? ""} />
              <input type="hidden" name="reviewee_company_id" value={isBuyer ? d.supplier_company_id : d.buyer_company_id} />
              <SelectField name="rating" label={t.deal.rating} required options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }))} />
              <TextArea name="comment" label={t.deal.comment} rows={2} maxLength={2000} />
              <SubmitButton>{t.deal.reviewSubmit}</SubmitButton>
            </ActionForm>
          )}
        </Section>
      )}
    </div>
  );
}

function CommissionPaymentForm({ t, commissionId }: { t: Dictionary; commissionId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-medium text-navy-700">{t.commissionPage.submitPayment}</summary>
      <ActionForm action={reportCommissionPaymentAction} errors={t.errors} success={t.commissionPage.reported} onSuccessReset className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="commission_id" value={commissionId} />
        <TextField name="amount" type="number" step="0.01" min={0} label={t.commissionPage.paymentAmount} required />
        <TextField name="paid_on" type="date" max={today} label={t.commissionPage.paidOn} required defaultValue={today} />
        <TextField name="method" label={t.commissionPage.method} maxLength={80} />
        <TextField name="reference" label={t.commissionPage.paymentRef} maxLength={120} dir="ltr" />
        <FileField name="evidence" label={t.commissionPage.evidence} accept=".pdf,.png,.jpg,.jpeg,.webp" className="sm:col-span-2" />
        <div className="sm:col-span-2"><SubmitButton className="btn btn-secondary">{t.common.submit}</SubmitButton></div>
      </ActionForm>
    </details>
  );
}

export { CommissionPaymentForm };
