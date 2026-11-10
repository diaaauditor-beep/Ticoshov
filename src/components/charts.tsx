/**
 * Minimal, dependency-free SVG charts. Single-series only (one hue, no legend —
 * the section title names the series). Every bar carries a native hover tooltip
 * (<title>) and an accessible table fallback is rendered alongside.
 */
type Datum = { label: string; value: number };

export function ColumnChart({ data, empty, valueLabel }: { data: Datum[]; empty: string; valueLabel: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 560, H = 200, pad = 28, bw = Math.min(36, (W - pad) / data.length - 8);
  const step = (W - pad) / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={valueLabel}>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={pad} x2={W} y1={H - g * (H - 16)} y2={H - g * (H - 16)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad - 6} y={H - g * (H - 16) + 4} textAnchor="end" fontSize="10" fill="#64748b">{Math.round(max * g)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 16);
          const x = pad + i * step + (step - bw) / 2;
          return (
            <g key={d.label} className="group">
              <rect x={pad + i * step} y={0} width={step} height={H} fill="transparent" />
              <path d={`M${x},${H} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${Math.max(h - 4, 0)} z`} fill="#20345b" className="group-hover:fill-[#3e5888]">
                <title>{`${d.label}: ${d.value}`}</title>
              </path>
              <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="#64748b">{d.label.slice(2)}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function BarList({ data, empty }: { data: Datum[]; empty: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group text-sm" title={`${d.label}: ${d.value}`}>
          <div className="mb-1 flex justify-between gap-2"><span className="text-slate-700">{d.label}</span><span className="font-semibold text-charcoal tabular-nums">{d.value}</span></div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-navy-700 transition group-hover:bg-navy-500" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
