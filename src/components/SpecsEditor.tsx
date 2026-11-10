"use client";
import { useState } from "react";

export function SpecsEditor({ initial, labels }: {
  initial: Array<{ key: string; value: string }>;
  labels: { key: string; value: string; add: string; remove: string };
}) {
  const [rows, setRows] = useState(initial.length ? initial : [{ key: "", value: "" }]);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
          <input name="spec_key" defaultValue={r.key} placeholder={labels.key} maxLength={80} className="input" aria-label={labels.key} />
          <input name="spec_value" defaultValue={r.value} placeholder={labels.value} maxLength={400} className="input" aria-label={labels.value} />
          <button type="button" className="btn btn-ghost btn-sm" aria-label={labels.remove}
            onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows([...rows, { key: "", value: "" }])}>+ {labels.add}</button>
    </div>
  );
}
