"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav-items";
import { SignOutButton } from "./sign-out-button";

export function Rail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="om-sb sticky top-[63px] flex h-[calc(100vh-63px)] w-[214px] flex-none flex-col gap-1 overflow-y-auto border-r border-white/[.09] p-3 pb-6">
      {items.map((item, i) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[12.5px] font-medium ${
              active ? "bg-accent/[.18] text-ink" : "text-ink/75 hover:bg-white/[.07]"
            }`}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
            ) : null}
            <span className="w-4 flex-none font-mono text-[9.5px] opacity-50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-auto rounded-xl border border-dashed border-lime/30 bg-lime/[.05] p-3">
        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lime">
          Periodo 3
        </div>
        <div className="mt-1.5 text-[11.5px] leading-snug text-ink/60">
          Cierre de notas: 28 nov
        </div>
      </div>

      <SignOutButton />
    </nav>
  );
}
