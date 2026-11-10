import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { saveSettingAction } from "@/app/actions/admin";

export default async function SettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale, true);
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("*").order("key");
  const S = t.admin.settings;
  return (
    <div className="max-w-4xl">
      <PageHeader title={S.title} description={S.jsonHint} />
      <div className="card divide-y divide-slate-100">
        {(data ?? []).map((s) => (
          <ActionForm key={s.key} action={saveSettingAction} errors={t.errors} success={t.common.saved} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
            <input type="hidden" name="key" value={s.key} />
            <div>
              <p className="font-mono text-sm font-semibold text-navy-900">{s.key} {s.is_public && <Badge tone="blue">{S.public}</Badge>}</p>
              <p className="text-xs text-slate-500">{s.description}</p>
            </div>
            <input name="value" defaultValue={JSON.stringify(s.value)} className="input font-mono" dir="ltr" aria-label={S.value} />
            <SubmitButton className="btn btn-secondary btn-sm">{t.common.save}</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </div>
  );
}
