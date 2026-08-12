"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { TeachixLogo } from "@/components/brand/teachix-logo";
import { siteConfig } from "@/lib/marketing/site";

export function MarketingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div
        className={[
          "mx-auto min-h-[72px] max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10",
          isAuthPage
            ? "flex justify-between xl:grid xl:grid-cols-[1fr_auto_1fr]"
            : "flex justify-between",
        ].join(" ")}
      >
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 items-center"
          aria-label={siteConfig.name}
        >
          <TeachixLogo />
        </Link>

        <nav className="hidden items-center gap-9 whitespace-nowrap xl:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-slate-500 transition hover:text-sky-600"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {isAuthPage ? (
          <div className="hidden xl:block" aria-hidden="true" />
        ) : (
          <div className="hidden items-center gap-3 xl:flex">
            <Link
              href="/login"
              className="px-4 py-3 text-sm font-black text-slate-600 transition hover:text-sky-600"
            >
              تسجيل الدخول
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700"
            >
              ابدأ الآن
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 xl:hidden"
          aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 bg-white xl:hidden">
          <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
            <nav className="flex flex-col gap-1">
              {siteConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-sky-600"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            {!isAuthPage ? (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600"
                >
                  تسجيل الدخول
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white"
                >
                  ابدأ الآن
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
