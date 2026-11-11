"use client";
import { useState } from "react";

type Item = { description: string; quantity: string; unit_price: string };
export function LineItemsEditor({ initial, labels }: {
  initial: Item[]; labels: { description: string; quantity: string; unitPrice: string; add: string; remove: string };
}) {
  const [rows, setRows] = useState<Item[]>(initial);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
          <input name="item_description" defaultValue={r.description} placeholder={labels.description} maxLength={400} className="input" aria-label={labels.description} />
          <input name="item_quantity" type="number" step="any" min={0} defaultValue={r.quantity} placeholder={labels.quantity} className="input" aria-label={labels.quantity} />
          <input name="item_unit_price" type="number" step="0.01" min={0} defaultValue={r.unit_price} placeholder={labels.unitPrice} className="input" aria-label={labels.unitPrice} />
          <button type="button" className="btn btn-ghost btn-sm" aria-label={labels.remove} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows([...rows, { description: "", quantity: "", unit_price: "" }])}>+ {labels.add}</button>
    </div>
  );
}
