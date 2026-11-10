import Link from "next/link";
import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { moderateMessageAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/format";
import { sp } from "@/lib/search";

export default async function ReportsPage({ params, searchParams }: PageProps<"/[locale]/admin/reports">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale);
  const s = await searchParams;
  const status = sp(s.status) || "open";
  const supabase = await createClient();
  const { data } = await supabase.from("message_reports")
    .select("*, messages(id, body, is_hidden, conversation_id, conversations(id, subject, is_locked)), profiles:reporter_id(full_name)")
    .eq("status", status as "open").order("created_at", { ascending: false }).limit(200);
  const R = t.admin.reports;
  return (
    <div>
      <PageHeader title={R.title} />
      <form method="get" className="mb-4 flex gap-2">
        <select name="status" defaultValue={status} className="input w-auto">{Object.entries(t.enums.reportStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      {!data?.length ? <EmptyState title={t.admin.noData} /> : (
        <ul className="space-y-3">
          {data.map((r) => {
            const m = r.messages;
            const conv = m?.conversations;
            const base = { report_id: r.id, message_id: m?.id ?? "", conversation_id: conv?.id ?? "" };
            return (
              <li key={r.id} className="card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link className="link" href={`/${locale}/admin/conversations/${conv?.id}`}>{conv?.subject}</Link>
                  <span className="text-xs text-slate-500">{formatDate(r.created_at, locale, true)} <StatusBadge status={r.status} label={t.enums.reportStatus[r.status]} /></span>
                </div>
                <blockquote className="mt-2 border-s-2 border-slate-300 ps-3 whitespace-pre-line text-slate-700">{m?.body}</blockquote>
                <p className="mt-2"><span className="text-slate-500">{R.reason}:</span> {r.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m?.is_hidden
                    ? <ActionButton action={moderateMessageAction} hidden={{ ...base, op: "unhide" }} errors={t.errors}>{R.unhide}</ActionButton>
                    : <ActionButton action={moderateMessageAction} hidden={{ ...base, op: "hide" }} errors={t.errors} className="btn btn-danger btn-sm">{R.hide}</ActionButton>}
                  {r.status === "open" && <ActionButton action={moderateMessageAction} hidden={{ ...base, op: "reviewed" }} errors={t.errors}>{R.markReviewed}</ActionButton>}
                  {r.status === "open" && <ActionButton action={moderateMessageAction} hidden={{ ...base, op: "dismiss" }} errors={t.errors}>{R.dismiss}</ActionButton>}
                  <ActionButton action={moderateMessageAction} hidden={{ ...base, report_id: "", op: conv?.is_locked ? "unlock" : "lock" }} errors={t.errors}>{conv?.is_locked ? R.unlock : R.lock}</ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
