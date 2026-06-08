"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/lib/marketing/site";

export function MarketingNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="container-app flex min-h-16 items-center justify-between gap-3 py-3 lg:h-20 lg:py-0">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" onClick={closeMenu}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-base font-bold text-white sm:h-11 sm:w-11 sm:text-lg">
            ت
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900 sm:text-lg">
              {siteConfig.shortName}
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              منصة التوجيه الطلابي
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-sky-700"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            تسجيل الدخول
          </Link>

          <Link
            href="/register"
            className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            إنشاء حساب
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 lg:hidden"
          aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={isOpen}
        >
          <span className="sr-only">{isOpen ? "إغلاق القائمة" : "فتح القائمة"}</span>
          {isOpen ? (
            <span className="text-2xl leading-none">×</span>
          ) : (
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-slate-800" />
              <span className="block h-0.5 w-5 rounded-full bg-slate-800" />
              <span className="block h-0.5 w-5 rounded-full bg-slate-800" />
            </span>
          )}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
              >
                {item.title}
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/login"
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                onClick={closeMenu}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                إنشاء حساب
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
