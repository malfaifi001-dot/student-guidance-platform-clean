import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 font-black text-white">
                T
              </div>

              <p className="text-xl font-black text-slate-950">
                Teachix
              </p>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              منصة مدرسية رقمية تساعد فريق المدرسة على إنجاز الأعمال،
              توثيقها، متابعتها، وإصدار تقاريرها من مكان واحد.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950">
              المنصة
            </h3>

            <div className="mt-5 space-y-3 text-sm font-bold text-slate-500">
              <Link href="/#users" className="block hover:text-sky-600">
                لمن المنصة؟
              </Link>

              <Link href="/#features" className="block hover:text-sky-600">
                المميزات
              </Link>

              <Link href="/#services" className="block hover:text-sky-600">
                الخدمات
              </Link>

              <Link href="/register" className="block hover:text-sky-600">
                إنشاء حساب
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950">
              معلومات
            </h3>

            <div className="mt-5 space-y-3 text-sm font-bold text-slate-500">
              <Link href="/about" className="block hover:text-sky-600">
                عن المنصة
              </Link>

              <Link href="/contact" className="block hover:text-sky-600">
                تواصل معنا
              </Link>

              <Link href="/privacy" className="block hover:text-sky-600">
                سياسة الخصوصية
              </Link>

              <Link href="/terms" className="block hover:text-sky-600">
                الشروط والأحكام
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-slate-100 pt-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 Teachix — جميع الحقوق محفوظة
          </p>

          <p>
            منصة مدرسية عربية
          </p>
        </div>
      </div>
    </footer>
  );
}