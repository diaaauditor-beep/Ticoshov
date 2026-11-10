import type { Dictionary } from "@/i18n/get-dictionary";
import { bytes } from "@/lib/format";

export function FileList({ files, t, label }: {
  files: Array<{ id: string; storage_path: string; file_name: string; size_bytes?: number | null; tag?: string }>;
  t: Dictionary; label?: string;
}) {
  if (!files.length) return <p className="text-sm text-slate-500">{t.common.noFiles}</p>;
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">
              {f.tag && <span className="me-2 font-medium text-navy-900">{f.tag}</span>}
              <span className="text-slate-600">{f.file_name}</span> <span className="text-xs text-slate-400">{bytes(f.size_bytes)}</span>
            </span>
            <a className="link shrink-0 text-xs" href={`/files?path=${encodeURIComponent(f.storage_path)}`} target="_blank" rel="noopener">{t.common.download}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
