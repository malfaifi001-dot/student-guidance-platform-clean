import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-app py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              منصة التوجيه الطلابي
            </h3>

            <p className="mt-4 text-sm leading-7 text-slate-500">
              منصة مدرسية حديثة لإدارة الخدمات التوجيهية،
              الحالات، الاجتماعات، الشواهد، والتقارير.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold text-slate-900">
              الصفحات
            </h4>

            <div className="space-y-3 text-sm text-slate-500">
              <Link href="/features" className="block hover:text-sky-700">
                المميزات
              </Link>

              <Link href="/services" className="block hover:text-sky-700">
                الخدمات
              </Link>

              <Link href="/pricing" className="block hover:text-sky-700">
                الأسعار
              </Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold text-slate-900">
              النظام
            </h4>

            <div className="space-y-3 text-sm text-slate-500">
              <Link href="/privacy" className="block hover:text-sky-700">
                سياسة الخصوصية
              </Link>

              <Link href="/terms" className="block hover:text-sky-700">
                الشروط والأحكام
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-center text-sm text-slate-400">
          © 2026 منصة التوجيه الطلابي — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}