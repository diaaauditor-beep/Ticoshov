import { resolveLocale } from "@/i18n/get-dictionary";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton, TextField, SelectField } from "@/components/ui/form";
import { PageHeader, Section } from "@/components/ui/primitives";
import { saveCategoryAction } from "@/app/actions/admin";

export default async function CategoriesAdminPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale, t } = await resolveLocale(params);
  await requireStaff(locale, true);
  const supabase = await createClient();
  const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
  const C = t.admin.categories;
  const roots = (cats ?? []).filter((c) => !c.parent_id);
  const ordered = roots.flatMap((r) => [r, ...(cats ?? []).filter((c) => c.parent_id === r.id)]);
  const parentOpts = roots.map((r) => ({ value: r.id, label: locale === "ar" ? r.name_ar : r.name_en }));
  return (
    <div className="space-y-6">
      <PageHeader title={C.title} />
      <Section title={C.add}>
        <ActionForm action={saveCategoryAction} errors={t.errors} success={t.common.saved} onSuccessReset className="grid gap-3 sm:grid-cols-6 sm:items-end">
          <TextField name="name_en" label={C.nameEn} required className="sm:col-span-2" dir="ltr" />
          <TextField name="name_ar" label={C.nameAr} required className="sm:col-span-2" dir="rtl" />
          <SelectField name="parent_id" label={C.parent} options={parentOpts} placeholder={C.topLevel} />
          <TextField name="sort_order" type="number" label={C.order} defaultValue="0" />
          <input type="hidden" name="is_active" value="on" />
          <SubmitButton className="btn btn-primary sm:col-span-6 sm:justify-self-end">{C.add}</SubmitButton>
        </ActionForm>
      </Section>
      <div className="card divide-y divide-slate-100">
        {ordered.map((c) => (
          <ActionForm key={c.id} action={saveCategoryAction} errors={t.errors} className={`grid items-center gap-2 px-4 py-2.5 sm:grid-cols-[2fr_2fr_1.5fr_80px_80px_auto] ${c.parent_id ? "ps-10" : "bg-slate-50"}`}>
            <input type="hidden" name="id" value={c.id} />
            <input name="name_en" defaultValue={c.name_en} className="input py-1.5" aria-label={C.nameEn} dir="ltr" />
            <input name="name_ar" defaultValue={c.name_ar} className="input py-1.5" aria-label={C.nameAr} dir="rtl" />
            <select name="parent_id" defaultValue={c.parent_id ?? ""} className="input py-1.5" aria-label={C.parent}>
              <option value="">{C.topLevel}</option>
              {parentOpts.filter((p) => p.value !== c.id).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input name="sort_order" type="number" defaultValue={c.sort_order} className="input py-1.5" aria-label={C.order} />
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_active" defaultChecked={c.is_active} className="size-4" />{C.active}</label>
            <SubmitButton className="btn btn-secondary btn-sm">{C.save}</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </div>
  );
}
