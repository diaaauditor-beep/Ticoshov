import type { ReactNode } from "react";
import Link from "next/link";

const tones = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  navy: "bg-navy-50 text-navy-700 ring-navy-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  brass: "bg-brass-50 text-brass-600 ring-brass-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  approved: "green", completed: "green", paid: "green", accepted: "green", published: "green", delivered: "green",
  confirmed: "green", resolved: "green", open: "blue", submitted: "blue", pending: "amber", under_review: "amber",
  needs_documents: "amber", due: "amber", awaiting_payment_confirmation: "amber", partially_paid: "amber",
  negotiating: "navy", negotiation: "navy", quotation_accepted: "navy", payment_confirmed: "navy", production: "navy",
  ready_for_shipment: "navy", shipped: "navy", in_transit: "navy", booked: "navy", preparing: "slate", at_customs: "amber",
  rejected: "red", cancelled: "slate", withdrawn: "slate", expired: "slate", overdue: "red", disputed: "red",
  exception: "red", waived: "slate", closed: "slate", awarded: "green", draft: "slate", archived: "slate",
  reviewed: "green", dismissed: "slate",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTone[status] ?? "slate"}>{label ?? status}</Badge>;
}

export function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
      <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-navy-50 text-navy-500">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M3 7h18M6 7v12h12V7M9 11h6" /></svg>
      </div>
      <p className="font-medium text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, children, actions, className = "" }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-navy-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-navy-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:border-navy-300">{body}</Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export function DL({ items }: { items: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v], i) => (
        <div key={i} className="flex flex-col">
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className="font-medium text-charcoal">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "navy" | "red" | "green" }) {
  const cls = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    navy: "border-navy-200 bg-navy-50 text-navy-800",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[tone];
  return <div className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Pagination({ page, pageCount, hrefFor, labels }: {
  page: number; pageCount: number; hrefFor: (p: number) => string; labels: { prev: string; next: string; page: string };
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="pagination">
      {page > 1 ? <Link className="btn btn-secondary btn-sm" href={hrefFor(page - 1)}>{labels.prev}</Link> : <span />}
      <span className="text-slate-500">{labels.page} {page} / {pageCount}</span>
      {page < pageCount ? <Link className="btn btn-secondary btn-sm" href={hrefFor(page + 1)}>{labels.next}</Link> : <span />}
    </nav>
  );
}
