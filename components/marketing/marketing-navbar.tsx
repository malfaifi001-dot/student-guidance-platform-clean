import Link from "next/link";
import { siteConfig } from "@/lib/marketing/site";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="container-app flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white">
            ت
          </div>

          <div>
            <p className="text-lg font-black text-slate-900">
              {siteConfig.shortName}
            </p>
            <p className="text-xs text-slate-500">
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

        <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
}