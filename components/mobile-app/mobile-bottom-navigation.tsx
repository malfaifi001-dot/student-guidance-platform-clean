"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type MobileNavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function MobileBottomNavigation({
  items,
}: {
  items: MobileNavigationItem[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid min-h-16 w-full max-w-md grid-cols-5 px-2">
        {items.slice(0, 5).map((item) => {
          const isActive = item.active ?? (pathname === item.href || pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[11px] font-medium transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3478B8] ${
                isActive ? "text-[#3478B8]" : "text-slate-500 hover:text-slate-950"
              }`}
            >
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
