import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { setUserAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/format";
import { cleanQuery, sp } from "@/lib/search";
import type { Database } from "@/lib/supabase/database.types";

export default async function UsersPage({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale, t } = await resolveLocale(params);
  const viewer = await requireStaff(locale, true);
  const s = await searchParams;
  const q = cleanQuery(s.q);
  const role = sp(s.role);
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("admin_list_users", {
    p_search: q || undefined, p_role: role in t.enums.role ? (role as Database["public"]["Enums"]["user_role"]) : undefined,
  });
  const U = t.admin.users;
  return (
    <div>
      <PageHeader title={U.title} />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={U.search} className="input w-64" />
        <select name="role" defaultValue={role} className="input w-auto"><option value="">{U.role}: {t.common.all}</option>{Object.entries(t.enums.role).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-secondary">{t.common.apply}</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>{U.name}</th><th>{U.email}</th><th>{t.common.company}</th><th>{t.common.created}</th><th>{U.role} / {U.active}</th></tr></thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name || "—"} {!u.is_active && <Badge tone="red">✕</Badge>}</td>
                <td dir="ltr" className="text-start">{u.email} {!u.email_confirmed && <Badge tone="amber">!</Badge>}</td>
                <td>{u.company_name ?? "—"}</td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(u.created_at, locale)}</td>
                <td>
                  {u.id === viewer.id ? <Badge tone="navy">{t.enums.role[u.role]}</Badge> : (
                    <ActionForm action={setUserAction} errors={t.errors} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input w-auto py-1 text-xs">{Object.entries(t.enums.role).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                      <select name="active" defaultValue={String(u.is_active)} className="input w-auto py-1 text-xs"><option value="true">{U.activate}</option><option value="false">{U.deactivate}</option></select>
                      <SubmitButton className="btn btn-secondary btn-sm">{t.common.save}</SubmitButton>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
