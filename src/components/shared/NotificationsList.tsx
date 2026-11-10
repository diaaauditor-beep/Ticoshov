import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { ActionButton } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { markNotificationsReadAction } from "@/app/actions/trade";
import { fmt } from "@/i18n/interpolate";
import { formatDate } from "@/lib/format";

export async function NotificationsList({ t, locale }: { t: Dictionary; locale: Locale }) {
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const unread = data?.filter((n) => !n.read_at).length ?? 0;
  const text = (type: string, payload: Record<string, unknown>) => {
    const tpl = t.notificationsPage.types[type] ?? type;
    const status = typeof payload.status === "string" ? t.enums.dealStatus[payload.status as keyof typeof t.enums.dealStatus] ?? payload.status : undefined;
    return fmt(tpl, { ...payload, status });
  };
  return (
    <div className="max-w-3xl">
      <PageHeader title={t.notificationsPage.title}
        actions={unread > 0 && <ActionButton action={markNotificationsReadAction} errors={t.errors}>{t.notificationsPage.markAll}</ActionButton>} />
      {!data?.length ? <EmptyState title={t.notificationsPage.none} /> : (
        <ul className="card divide-y divide-slate-100">
          {data.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-3 px-5 py-3.5 ${n.read_at ? "" : "bg-navy-50/50"}`}>
              <div className="min-w-0">
                {n.link ? (
                  <Link href={`/${locale}${n.link}`} className={`text-sm hover:underline ${n.read_at ? "text-slate-700" : "font-semibold text-navy-900"}`}>{text(n.type, n.payload as Record<string, unknown>)}</Link>
                ) : <p className="text-sm">{text(n.type, n.payload as Record<string, unknown>)}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{formatDate(n.created_at, locale, true)}</p>
              </div>
              {!n.read_at && <ActionButton action={markNotificationsReadAction} hidden={{ id: n.id }} errors={t.errors} className="btn btn-ghost btn-sm">✓</ActionButton>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
