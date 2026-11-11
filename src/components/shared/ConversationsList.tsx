import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate, loc } from "@/lib/format";

export async function ConversationsList({ t, locale, base, myCompanyId }: { t: Dictionary; locale: Locale; base: string; myCompanyId: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase.from("conversations")
    .select("id, subject, deal_id, last_message_at, created_at, is_locked, buyer:companies!conversations_buyer_company_id_fkey(id, name, name_ar), supplier:companies!conversations_supplier_company_id_fkey(id, name, name_ar)")
    .order("last_message_at", { ascending: false, nullsFirst: false }).limit(200);
  if (!data?.length) return <EmptyState title={t.messages.noConversations} />;
  return (
    <ul className="card divide-y divide-slate-100">
      {data.map((c) => {
        const other = c.buyer?.id === myCompanyId ? c.supplier : c.buyer;
        return (
          <li key={c.id}>
            <Link href={`${base}/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy-900">{myCompanyId ? loc(locale, other?.name_ar, other?.name) : `${loc(locale, c.buyer?.name_ar, c.buyer?.name)} ↔ ${loc(locale, c.supplier?.name_ar, c.supplier?.name)}`}</p>
                <p className="truncate text-sm text-slate-500">{c.subject}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatDate(c.last_message_at ?? c.created_at, locale, true)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
