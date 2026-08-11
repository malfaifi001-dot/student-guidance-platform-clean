import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderCheck,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  School,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";

const audiences = [
  {
    title: "مدير المدرسة",
    description: "متابعة العمل المدرسي والتقارير والأداء من مكان واحد.",
    icon: School,
  },
  {
    title: "المعلم",
    description: "إنجاز المهام والخدمات والتقارير بطريقة واضحة ومنظمة.",
    icon: GraduationCap,
  },
  {
    title: "رائد النشاط",
    description: "تنظيم الأنشطة والبرامج والتكليفات وتوثيق الإنجاز.",
    icon: Trophy,
  },
  {
    title: "الموجه الطلابي",
    description: "إدارة الخدمات الطلابية والحالات والتقارير والشواهد.",
    icon: UserRoundCheck,
  },
];

const features = [
  {
    title: "كل العمل في مكان واحد",
    description:
      "بدل التنقل بين الملفات والنماذج، تجمع Teachix أعمال المدرسة داخل تجربة موحدة.",
    icon: LayoutDashboard,
  },
  {
    title: "توثيق منظم",
    description:
      "احفظ الأعمال والشواهد والمرفقات بطريقة تساعدك على الرجوع إليها متى احتجتها.",
    icon: FolderCheck,
  },
  {
    title: "تقارير جاهزة",
    description:
      "حوّل الأعمال المنجزة إلى تقارير واضحة دون إعادة إدخال البيانات في كل مرة.",
    icon: FileText,
  },
  {
    title: "كل دور يرى ما يخصه",
    description:
      "تجربة وصلاحيات منفصلة تناسب دور المستخدم والخدمات المرتبطة به.",
    icon: ShieldCheck,
  },
];

const services = [
  {
    title: "التقارير",
    description: "إنشاء ومراجعة وإخراج التقارير من بيانات العمل الفعلية.",
    icon: FileText,
  },
  {
    title: "الاستبيانات",
    description: "إنشاء الاستبيانات واستقبال الردود وتحليل النتائج.",
    icon: MessageSquareText,
  },
  {
    title: "تحليل النتائج",
    description: "قراءة النتائج وتحويل البيانات إلى مؤشرات قابلة للاستفادة.",
    icon: BarChart3,
  },
  {
    title: "الأنشطة",
    description: "تنظيم البرامج والأنشطة والتكليفات والشواهد المرتبطة بها.",
    icon: Trophy,
  },
  {
    title: "الخدمات الطلابية",
    description: "إدارة الأعمال والخدمات المرتبطة بالطلاب ضمن خطوات واضحة.",
    icon: UsersRound,
  },
  {
    title: "الشواهد والملفات",
    description: "توثيق الإنجاز وحفظ الملفات والمرفقات في مكان منظم.",
    icon: ClipboardCheck,
  },
];

const reviews = [
  {
    quote:
      "التصميم الواضح واختصار الخطوات يجعل الوصول للعمل المطلوب أسرع وأسهل.",
    role: "نموذج تقييم — مستخدم مدرسي",
  },
  {
    quote:
      "وجود الخدمات والتقارير والشواهد في مكان واحد يقلل التشتت أثناء العمل اليومي.",
    role: "نموذج تقييم — مستخدم تجريبي",
  },
  {
    quote:
      "أهم ما يميز التجربة أن كل مستخدم يصل مباشرة إلى الأدوات التي يحتاجها.",
    role: "نموذج تقييم — تجربة استخدام",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNavbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-100">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-40 top-16 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
            <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-blue-50 blur-3xl" />
          </div>

          <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/70 px-4 py-2 text-sm font-bold text-sky-700">
                <Sparkles className="h-4 w-4" />
                منصة مدرسية واحدة لفريق المدرسة
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[1.2] tracking-[-0.035em] text-slate-950 sm:text-6xl lg:text-7xl">
                كل أعمال مدرستك،
                <span className="mt-2 block text-sky-600">
                  في مكان واحد.
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-500 sm:text-xl">
                Teachix تساعد فريق المدرسة على إنجاز الأعمال، توثيقها،
                متابعتها، وإصدار تقاريرها ضمن تجربة عربية واضحة وسهلة.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-7 py-4 text-sm font-black text-white shadow-lg shadow-sky-600/15 transition hover:bg-sky-700"
                >
                  إنشاء حساب
                  <ArrowLeft className="h-4 w-4" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  تسجيل الدخول
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-4 text-sm font-bold text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  تجربة عربية
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  متعددة الأدوار
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  مصممة للعمل المدرسي
                </span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative mx-auto max-w-[520px]">
                <div className="absolute -inset-10 rounded-[3rem] bg-sky-50/70 blur-2xl" />

                <div className="relative rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.28)]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-xs font-bold text-slate-400">
                        Teachix
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        مساحة العمل المدرسية
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      <BookOpenCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          تقرير جاهز للمراجعة
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          تم جمع البيانات من العمل المنجز
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-sky-600" />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          نشاط موثق
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          الشواهد محفوظة داخل السجل
                        </p>
                      </div>
                      <ClipboardCheck className="h-5 w-5 text-sky-600" />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          تحليل نتائج
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          المؤشرات جاهزة للمتابعة
                        </p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-sky-600" />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      أعمالك منظمة وجاهزة للرجوع إليها
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-8 -right-10 rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-xl shadow-slate-200/50">
                  <p className="text-xs font-bold text-slate-400">
                    حالة العمل
                  </p>
                  <p className="mt-1 text-sm font-black text-sky-700">
                    كل شيء في مكانه
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USERS */}
        <section
          id="users"
          className="scroll-mt-28 bg-white px-5 py-28 sm:px-8 lg:px-10 lg:py-36"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-sky-600">
                لمن المنصة؟
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                مناسبة لكل أدوار المدرسة
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500">
                كل مستخدم يدخل إلى مساحة عمل تناسب دوره والخدمات المسموحة له،
                بدون قوائم أو إجراءات لا تخصه.
              </p>
            </div>

            <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
              {audiences.map((item) => (
                <article key={item.title}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-slate-950">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="features"
          className="scroll-mt-28 border-y border-slate-100 bg-slate-50/60 px-5 py-28 sm:px-8 lg:px-10 lg:py-36"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="lg:sticky lg:top-32">
                <p className="text-sm font-black text-sky-600">
                  لماذا Teachix؟
                </p>

                <h2 className="mt-4 max-w-lg text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  أقل تشتت.
                  <span className="block text-slate-400">
                    عمل أوضح.
                  </span>
                </h2>

                <p className="mt-6 max-w-lg text-base leading-8 text-slate-500">
                  صممنا التجربة حول العمل الذي تريد إنجازه، وليس حول كثرة
                  الصفحات والخيارات.
                </p>
              </div>

              <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
                {features.map((item) => (
                  <article
                    key={item.title}
                    className="border-t border-slate-200 pt-7"
                  >
                    <item.icon className="h-6 w-6 text-sky-600" />

                    <h3 className="mt-5 text-xl font-black text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section
          id="services"
          className="scroll-mt-28 bg-white px-5 py-28 sm:px-8 lg:px-10 lg:py-36"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-sky-600">
                الخدمات
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                خدمات تساعدك على إنجاز العمل
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500">
                مجموعة من الأدوات المدرسية المترابطة، تعمل ضمن تجربة واحدة
                وتحافظ على البيانات والسجلات في مكان منظم.
              </p>
            </div>

            <div className="mt-16 grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-sky-200 hover:shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white">
                      <item.icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section
          id="reviews"
          className="scroll-mt-28 border-y border-slate-100 bg-slate-50/60 px-5 py-28 sm:px-8 lg:px-10 lg:py-36"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-sky-600">
                تجربة الاستخدام
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                البساطة تظهر في التفاصيل
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500">
                النصوص التالية نماذج تقييمات تجريبية داخل التصميم، ويمكن
                استبدالها لاحقًا بتقييمات مستخدمين فعلية.
              </p>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.quote}
                  className="rounded-2xl border border-slate-200 bg-white p-7"
                >
                  <div className="text-4xl font-black leading-none text-sky-200">
                    “
                  </div>

                  <p className="mt-4 text-base font-bold leading-8 text-slate-700">
                    {review.quote}
                  </p>

                  <p className="mt-7 border-t border-slate-100 pt-5 text-xs font-bold text-slate-400">
                    {review.role}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white px-5 py-28 sm:px-8 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[2rem] bg-sky-600 px-6 py-16 text-center text-white sm:px-10 lg:py-20">
              <p className="text-sm font-black text-sky-100">
                ابدأ مع Teachix
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                نظّم أعمال مدرستك من مكان واحد
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-sky-100">
                أنشئ حسابك وابدأ تجربة مدرسية أكثر وضوحًا وتنظيمًا.
              </p>

              <Link
                href="/register"
                className="mt-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-sky-700 transition hover:bg-sky-50"
              >
                إنشاء حساب
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}