import Link from "next/link";
import {
  ArrowUpLeft,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

const features = [
  {
    title: "إدارة الحالات الطلابية",
    desc: "تنظيم الحالات ومتابعتها بخطوات واضحة وسجلات قابلة للرجوع.",
    icon: UsersRound,
  },
  {
    title: "الخدمات الإرشادية",
    desc: "إدارة الخدمات والبرامج والأنشطة الإرشادية من مكان واحد.",
    icon: Workflow,
  },
  {
    title: "التقارير الذكية",
    desc: "مؤشرات وتقارير تساعد الموجه على اتخاذ قرارات أسرع.",
    icon: BarChart3,
  },
  {
    title: "رفع بيانات الطلاب",
    desc: "استيراد بيانات الطلاب ومراجعتها قبل اعتمادها داخل المنصة.",
    icon: Database,
  },
  {
    title: "التقويم والتنبيهات",
    desc: "تنظيم المواعيد والمهام والتنبيهات المرتبطة بالعمل الإرشادي.",
    icon: CalendarDays,
  },
  {
    title: "الاشتراكات والباقات",
    desc: "جاهزية كاملة كنظام SaaS قابل للتوسع للمدارس والمستخدمين.",
    icon: WalletCards,
  },
];

const steps = [
  "أضف بيانات المدرسة",
  "ارفع بيانات الطلاب",
  "ابدأ إدارة العمل الإرشادي",
];

const plans = ["أساسية", "احترافية", "متقدمة"];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <MarketingNavbar />

      <main>
        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.28),transparent_35%),radial-gradient(circle_at_left,rgba(56,189,248,0.18),transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-teal-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                منصة SaaS عربية لإدارة التوجيه الطلابي
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl lg:text-7xl">
                منصة التوجيه الطلابي
                <span className="block bg-gradient-to-l from-teal-200 via-sky-200 to-white bg-clip-text text-transparent">
                  إدارة إرشادية أذكى من مكان واحد
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-9 text-slate-300">
                نظام ذكي يساعد الموجه والموجهة الطلابية على تنظيم الحالات،
                الخدمات، البرامج، التقارير، بيانات الطلاب، والتواصل المدرسي
                ضمن تجربة عربية واضحة واحترافية.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-3xl bg-teal-400 px-7 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-teal-500/20 transition hover:bg-teal-300"
                >
                  ابدأ الآن
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-3xl border border-white/15 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  تسجيل الدخول
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {["تجربة عربية بالكامل", "مناسب للمدارس", "جاهز للتوسع"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                <div className="rounded-[1.5rem] bg-slate-100 p-5 text-slate-900">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400">لوحة التحكم</p>
                      <h2 className="text-xl font-black">ملخص العمل الإرشادي</h2>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-teal-600" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["الحالات", "24"],
                      ["الخدمات", "13"],
                      ["التقارير", "8"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-3xl bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400">{label}</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-black">آخر المهام</h3>
                      <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                    </div>
                    {["مراجعة حالة طالب", "اعتماد خدمة إرشادية", "تحديث بيانات الطلاب"].map((item) => (
                      <div key={item} className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold">
                        <span>{item}</span>
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">نشط</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-slate-50 px-4 py-20 text-slate-900 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-teal-600">المزايا</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">كل ما يحتاجه الموجه الطلابي</h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <item.icon className="h-9 w-9 text-teal-600" />
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 leading-8 text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 text-slate-900 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black text-teal-600">طريقة العمل</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">ابدأ خلال دقائق</h2>
              <p className="mt-5 max-w-xl leading-8 text-slate-600">
                خطوات واضحة تساعد المدرسة على تجهيز البيئة ثم بدء العمل الإرشادي بشكل منظم.
              </p>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-lg font-black">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-slate-50 px-4 py-20 text-slate-900 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <p className="text-sm font-black text-teal-600">الباقات</p>
              <h2 className="mt-3 text-3xl font-black sm:text-5xl">باقات مرنة للمدارس</h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <h3 className="text-2xl font-black">{plan}</h3>
                  <p className="mt-3 leading-8 text-slate-600">
                    مناسبة لتنظيم العمل الإرشادي وإدارة الخدمات والتقارير.
                  </p>
                  <Link href="/register" className="mt-7 inline-flex w-full justify-center rounded-3xl bg-slate-900 px-6 py-4 text-sm font-black text-white transition hover:bg-teal-600">
                    اشترك الآن
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur sm:p-12">
            <BrainCircuit className="mx-auto h-12 w-12 text-teal-300" />
            <h2 className="mt-6 text-3xl font-black sm:text-5xl">
              ابدأ تنظيم عملك الإرشادي اليوم
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
              منصة عربية حديثة تساعدك على إدارة العمل الإرشادي بثقة ووضوح.
            </p>
            <Link href="/register" className="mt-8 inline-flex rounded-3xl bg-teal-400 px-8 py-4 text-sm font-black text-slate-950 transition hover:bg-teal-300">
              الدخول للمنصة
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}