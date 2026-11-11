import { createClient } from "@/lib/supabase/server";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { ActionForm, FileField, SubmitButton, TextArea } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { reportMessageAction, sendMessageAction } from "@/app/actions/trade";
import { formatDate, loc } from "@/lib/format";

export async function Conversation({ conversationId, t, locale, myCompanyId, isStaff }: {
  conversationId: string; t: Dictionary; locale: Locale; myCompanyId: string | null; isStaff: boolean;
}) {
  const supabase = await createClient();
  const [{ data: conv }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("id, is_locked, buyer:companies!conversations_buyer_company_id_fkey(id, name, name_ar), supplier:companies!conversations_supplier_company_id_fkey(id, name, name_ar)").eq("id", conversationId).maybeSingle(),
    supabase.from("messages").select("id, body, sender_id, sender_company_id, attachment_path, attachment_name, is_hidden, created_at").eq("conversation_id", conversationId).order("created_at"),
  ]);
  if (!conv) return null;
  const nameOf = (cid: string | null) =>
    cid === null ? t.messages.staff
    : cid === myCompanyId ? t.messages.you
    : cid === conv.buyer?.id ? loc(locale, conv.buyer?.name_ar, conv.buyer?.name)
    : loc(locale, conv.supplier?.name_ar, conv.supplier?.name);
  const canSend = isStaff || (!conv.is_locked && myCompanyId);

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">{t.messages.privacy}</p>
      <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
        {!messages?.length && <p className="py-6 text-center text-sm text-slate-500">{t.messages.noMessages}</p>}
        {messages?.map((m) => {
          const mine = m.sender_company_id === myCompanyId && myCompanyId !== null;
          const staff = m.sender_company_id === null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-xs ${mine ? "bg-navy-900 text-white" : staff ? "border border-brass-200 bg-brass-50" : "border border-slate-200 bg-white"}`}>
                <p className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-navy-200" : "text-slate-500"}`}>{nameOf(m.sender_company_id)} · {formatDate(m.created_at, locale, true)}</p>
                {m.is_hidden ? <p className="italic opacity-70">{t.messages.hidden}{isStaff && `: ${m.body}`}</p> : <p className="whitespace-pre-line break-words">{m.body}</p>}
                {m.attachment_path && !m.is_hidden && (
                  <a href={`/files?path=${encodeURIComponent(m.attachment_path)}`} target="_blank" rel="noopener" className={`mt-1 inline-block text-xs underline ${mine ? "text-brass-200" : "text-navy-700"}`}>📎 {m.attachment_name}</a>
                )}
                {!mine && !staff && !isStaff && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-slate-400">{t.messages.report}</summary>
                    <ActionForm action={reportMessageAction} errors={t.errors} success={t.messages.reported} className="mt-1 flex gap-1">
                      <input type="hidden" name="message_id" value={m.id} />
                      <input name="reason" required minLength={3} maxLength={1000} placeholder={t.messages.reportReason} className="input py-1 text-xs" />
                      <SubmitButton className="btn btn-secondary btn-sm">{t.common.submit}</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {conv.is_locked && <div className="mt-3"><Notice>{t.messages.locked}</Notice></div>}
      {canSend && (
        <ActionForm action={sendMessageAction} errors={t.errors} onSuccessReset className="mt-3 space-y-2">
          <input type="hidden" name="conversation_id" value={conversationId} />
          <input type="hidden" name="sender_company_id" value={isStaff ? "" : myCompanyId ?? ""} />
          <TextArea name="body" rows={2} maxLength={5000} placeholder={t.messages.placeholder} aria-label={t.messages.placeholder} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FileField name="attachment" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" />
            <SubmitButton>{t.messages.send}</SubmitButton>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
