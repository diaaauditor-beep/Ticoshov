import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { getReference, countryName, unitName } from "@/lib/reference";
import { ActionButton, ActionForm, FileField, SelectField, SubmitButton } from "@/components/ui/form";
import { Badge, DL, Notice, PageHeader, Section, StatusBadge } from "@/components/ui/primitives";
import { FileList } from "@/components/FileList";
import { formatDate, formatNumber, loc } from "@/lib/format";
import { providerShipmentAction, removeDealProviderAction, uploadTradeDocAction } from "@/app/actions/trade";

const PROVIDER_UPLOAD_TYPES = ["customs_document", "shipping_document", "bill_of_lading", "certificate_of_origin"] as const;
const PROVIDER_SHIPMENT_STATUSES = ["in_transit", "at_customs", "delivered", "exception"] as const;

/**
 * What a customs broker / freight forwarder sees on a deal it was added to.
 * The data comes from provider_deal_summary() and RLS: no deal value, quotation,
 * payment declarations, commission, contract or conversation is ever loaded here.
 */
export async function ProviderDealView({ dealId, t, locale }: { dealId: string; t: Dictionary; locale: Locale }) {
  if (!/^[0-9a-f-]{36}$/.test(dealId)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("provider_deal_summary", { p_deal: dealId });
  const d = data?.[0];
  if (!d) notFound();
  const [ref, shipments, docs] = await Promise.all([
    getReference(),
    supabase.from("shipments").select("*").eq("deal_id", dealId).order("created_at"),
    supabase.from("shipment_documents").select("*").eq("deal_id", dealId).order("created_at"),
  ]);
  const P = t.providers;
  const shipment = shipments.data?.[0];
  const closed = d.status === "completed" || d.status === "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{d.title} <StatusBadge status={d.status} label={t.enums.dealStatus[d.status]} /></span>}
        description={<span className="font-mono">{d.reference}</span>}
        actions={<Badge tone="navy">{P.services[d.service] ?? d.service}</Badge>}
      />
      <Notice tone="navy">{P.limitedView}</Notice>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.deal.parties}>
          <DL items={[
            [t.common.supplier, <Link key="s" className="link" href={`/${locale}/companies/${d.supplier_slug}`}>{loc(locale, d.supplier_name_ar, d.supplier_name)}</Link>],
            [t.common.buyer, <Link key="b" className="link" href={`/${locale}/companies/${d.buyer_slug}`}>{loc(locale, d.buyer_name_ar, d.buyer_name)}</Link>],
            [P.route, `${countryName(ref, d.supplier_country, locale)} → ${countryName(ref, d.delivery_country, locale)}`],
            [t.quote.incoterm, d.incoterm ?? "—"],
            [t.quote.quantity, d.quantity != null ? `${formatNumber(d.quantity, locale)} ${d.unit_code ? unitName(ref, d.unit_code, locale) : ""}` : "—"],
            [P.assignedOn, formatDate(d.assigned_at, locale)],
          ]} />
          {d.note && <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><strong>{P.instructions}:</strong> {d.note}</p>}
        </Section>

        <Section title={t.deal.shipment}>
          {shipment ? (
            <>
              <DL items={[
                [t.deal.shipmentStatus, <StatusBadge key="s" status={shipment.status} label={t.enums.shipmentStatus[shipment.status]} />],
                [t.deal.mode, shipment.transport_mode ? t.enums.transportMode[shipment.transport_mode as keyof typeof t.enums.transportMode] : "—"],
                [t.deal.carrier, shipment.carrier ?? "—"], [t.deal.tracking, shipment.tracking_number ?? "—"],
                [t.deal.pol, `${shipment.port_of_loading ?? "—"} (${countryName(ref, shipment.origin_country, locale)})`],
                [t.deal.pod, `${shipment.port_of_discharge ?? "—"} (${countryName(ref, shipment.destination_country, locale)})`],
                [t.deal.etd, formatDate(shipment.etd, locale)], [t.deal.eta, formatDate(shipment.eta, locale)],
              ]} />
              {!closed && (
                <ActionForm action={providerShipmentAction} errors={t.errors} success={t.common.saved} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="shipment_id" value={shipment.id} />
                  <SelectField name="status" label={P.updateShipment} defaultValue={shipment.status}
                    options={PROVIDER_SHIPMENT_STATUSES.map((s) => ({ value: s, label: t.enums.shipmentStatus[s] }))} />
                  <SubmitButton className="btn btn-secondary">{t.common.save}</SubmitButton>
                </ActionForm>
              )}
            </>
          ) : <p className="text-sm text-slate-500">{P.noShipment}</p>}
        </Section>
      </div>

      <Section title={t.deal.documents}>
        <FileList t={t} files={(docs.data ?? []).map((x) => ({ ...x, tag: t.enums.tradeDocType[x.doc_type] }))} />
        {!closed && (
          <ActionForm action={uploadTradeDocAction} errors={t.errors} onSuccessReset className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <input type="hidden" name="deal_id" value={d.deal_id} />
            <input type="hidden" name="company_id" value={d.provider_company_id} />
            {shipment && <input type="hidden" name="shipment_id" value={shipment.id} />}
            <SelectField name="doc_type" label={t.deal.docType} options={PROVIDER_UPLOAD_TYPES.map((value) => ({ value, label: t.enums.tradeDocType[value] }))} />
            <FileField name="file" label={t.verification.file} required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.zip" />
            <SubmitButton className="btn btn-secondary">{t.deal.uploadDoc}</SubmitButton>
          </ActionForm>
        )}
        <p className="mt-2 text-xs text-slate-500">{P.uploadNote}</p>
      </Section>

      <div className="flex justify-end">
        <ActionButton action={removeDealProviderAction} hidden={{ id: d.assignment_id, leave: "1", locale }} errors={t.errors}
          confirm={P.withdrawConfirm} className="btn btn-ghost text-red-600">{P.withdraw}</ActionButton>
      </div>
    </div>
  );
}
