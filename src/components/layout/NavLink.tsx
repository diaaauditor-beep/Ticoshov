"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, badge, exact }: { href: string; label: string; badge?: number; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition ${
        active ? "bg-white/10 font-semibold text-white" : "text-navy-200 hover:bg-white/5 hover:text-white"}`}>
      <span className="flex items-center gap-2.5">
        <span className={`hidden size-1.5 rounded-full lg:inline-block ${active ? "bg-brass-300" : "bg-navy-600"}`} />
        {label}
      </span>
      {badge ? <span className="rounded-full bg-brass-400 px-1.5 text-[11px] font-bold text-navy-950">{badge}</span> : null}
    </Link>
  );
}
