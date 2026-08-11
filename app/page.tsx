import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderCheck,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { RoleStorySection } from "@/components/marketing/role-story-section";

const reviews = [
  {
    name: "نورة العتيبي",
    role: "معلمة",
    initials: "ن",
    quote:
      "أكثر شيء فرق معي أن التقارير والتوثيق أصبحت في مكان واحد. صرت أرجع لعملي بسهولة بدل البحث بين ملفات كثيرة.",
  },
  {
    name: "خالد الشهري",
    role: "رائد نشاط",
    initials: "خ",
    quote:
      "إسناد النشاط ومتابعة التنفيذ والشواهد من نفس المساحة اختصر علي خطوات كثيرة، خصوصًا وقت تجهيز تقرير البرنامج.",
  },
  {
    name: "سارة القحطاني",
    role: "موجهة طلابية",
    initials: "س",
    quote:
      "متابعة الحالات والخدمات الإرشادية أصبحت أوضح. كل إجراء مرتبط بالسجل نفسه، وهذا يسهل المتابعة وإصدار التقرير.",
  },
  {
    name: "محمد الغامدي",
    role: "مدير مدرسة",
    initials: "م",
    quote:
      "يعجبني أن كل دور لديه مساحة عمل واضحة. أستطيع متابعة العمل المدرسي بدون الدخول في تفاصيل لا تخصني.",
  },
];

function ReviewCard({
  review,
  index,
  mobile = false,
}: {
  review: (typeof reviews)[number];
  index: number;
  mobile?: boolean;
}) {
  return (
    <article
      className={[
        "group flex flex-col border border-slate-200 bg-white transition duration-300",
        "hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)]",
        mobile
          ? "min-h-[300px] w-[88vw] shrink-0 snap-center rounded-[26px] p-5"
          : "min-h-[330px] rounded-[28px] p-7",
        !mobile && index === 1
          ? "xl:translate-y-8"
          : !mobile && index === 3
            ? "xl:translate-y-5"
            : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className={mobile ? "flex min-w-0 items-center gap-3" : "flex items-center gap-3"}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-base font-black text-sky-700 ring-1 ring-sky-100">
            {review.initials}
          </div>

          <div className={mobile ? "min-w-0" : undefined}>
            <h3 className="text-sm font-black text-slate-950">
              {review.name}
            </h3>

            <p className="mt-1 text-xs font-bold text-slate-400">
              {review.role}
            </p>
          </div>
        </div>

        <div className={mobile ? "flex shrink-0 items-center gap-0.5" : "flex items-center gap-0.5"}>
          {Array.from({ length: 5 }).map((_, starIndex) => (
            <Star
              key={starIndex}
              className="h-3.5 w-3.5 fill-sky-500 text-sky-500"
            />
          ))}
        </div>
      </div>

      <div className="mt-8 text-5xl font-black leading-none text-sky-100">
        “
      </div>

      <p className="mt-3 flex-1 text-sm font-bold leading-8 text-slate-600 sm:text-[15px]">
        {review.quote}
      </p>
    </article>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-950">
      <MarketingNavbar />

      <main>
        {/* =====================================================
            HERO
        ====================================================== */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-72 top-10 h-[620px] w-[620px] rounded-full bg-sky-50/80 blur-3xl" />
            <div className="absolute -left-72 top-60 h-[500px] w-[500px] rounded-full bg-blue-50/50 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[760px] lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-10 lg:py-24 xl:gap-16 xl:py-28">
            <div className="max-w-3xl">
              <h1 className="text-[2.35rem] font-black leading-[1.18] tracking-[-0.045em] text-slate-950 min-[430px]:text-[2.7rem] sm:text-6xl lg:text-[4rem] xl:text-[4.8rem]">
                كل أعمال مدرستك،
                <span className="mt-2 block text-sky-600">
                  في مكان واحد.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:mt-8 sm:text-xl sm:leading-9">
                Teachix تجمع أعمال فريق المدرسة وتساعد على إنجازها، توثيقها،
                متابعتها، وإصدار تقاريرها ضمن تجربة عربية بسيطة وواضحة.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-sky-600/15 transition hover:-translate-y-0.5 hover:bg-sky-700"
                >
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  تسجيل الدخول
                </Link>
              </div>


            </div>

            <div className="relative mx-auto hidden w-full max-w-[650px] md:block lg:max-w-[700px]">
              <div className="absolute inset-8 rounded-[3.5rem] bg-sky-100/70 blur-3xl" />

              <div className="relative lg:scale-[1.04] xl:scale-[1.08]">
                <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.38)] sm:min-h-[520px] sm:rounded-[32px] sm:p-7 lg:min-h-[580px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <p className="text-xs font-bold text-sky-600">
                        Teachix
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-950">
                        مساحة العمل
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="min-h-[165px] rounded-[26px] bg-slate-50 p-6">
                      <FileText className="h-6 w-6 text-sky-600" />

                      <p className="mt-7 text-base font-black">
                        التقارير
                      </p>

                      <div className="mt-4 h-2.5 w-24 rounded-full bg-slate-200" />
                    </div>

                    <div className="min-h-[165px] rounded-[26px] bg-slate-50 p-6">
                      <BarChart3 className="h-6 w-6 text-sky-600" />

                      <p className="mt-7 text-base font-black">
                        تحليل النتائج
                      </p>

                      <div className="mt-4 h-2.5 w-20 rounded-full bg-slate-200" />
                    </div>

                    <div className="min-h-[165px] rounded-[26px] bg-slate-50 p-6">
                      <ClipboardCheck className="h-6 w-6 text-sky-600" />

                      <p className="mt-7 text-base font-black">
                        التوثيق
                      </p>

                      <div className="mt-4 h-2.5 w-28 rounded-full bg-slate-200" />
                    </div>

                    <div className="min-h-[165px] rounded-[26px] bg-slate-50 p-6">
                      <FolderCheck className="h-6 w-6 text-sky-600" />

                      <p className="mt-7 text-base font-black">
                        الملفات
                      </p>

                      <div className="mt-4 h-2.5 w-20 rounded-full bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            USERS STORY
        ====================================================== */}
        <RoleStorySection />

        {/* =====================================================
            LESS CLUTTER
        ====================================================== */}
        <section
          id="features"
          className="scroll-mt-24 overflow-hidden border-y border-slate-100 bg-[#f8fafc] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32 xl:py-40"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-24">
              <div>
                <p className="text-sm font-black text-sky-600">
                  لماذا Teachix؟
                </p>

                <h2 className="mt-5 text-4xl font-black leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
                  أقل تشتت.
                  <span className="block text-slate-400">
                    عمل أوضح.
                  </span>
                </h2>

                <p className="mt-8 max-w-xl text-lg leading-9 text-slate-500">
                  بدل أن تتوزع الأعمال بين الملفات والنماذج والرسائل، تجمع
                  Teachix دورة العمل داخل تجربة واحدة واضحة من البداية حتى
                  التقرير النهائي.
                </p>

                <Link
                  href="/register"
                  className="mt-9 inline-flex items-center gap-2 text-sm font-black text-sky-600 transition hover:text-sky-700"
                >
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <article className="min-h-[240px] rounded-[28px] border border-sky-100 bg-sky-50/55 p-8 transition duration-300 hover:-translate-y-1 hover:bg-sky-50">
                  <LayoutDashboard className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black">
                    كل العمل في مكان واحد
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500">
                    أعمال المدرسة محفوظة داخل مساحة واضحة بدل التنقل بين أدوات
                    منفصلة.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-cyan-100 bg-cyan-50/40 p-8 transition duration-300 hover:-translate-y-1 hover:bg-cyan-50/70">
                  <FolderCheck className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black">
                    توثيق منظم
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500">
                    الشواهد والمرفقات والملفات مرتبطة مباشرة بالعمل الذي تم
                    إنجازه.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-blue-100 bg-blue-50/40 p-8 transition duration-300 hover:-translate-y-1 hover:bg-blue-50/70">
                  <FileText className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black">
                    تقارير جاهزة
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500">
                    التقرير امتداد للعمل المنجز، دون الحاجة لإعادة كتابة نفس
                    البيانات.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-indigo-100 bg-indigo-50/35 p-8 transition duration-300 hover:-translate-y-1 hover:bg-indigo-50/60">
                  <ShieldCheck className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black">
                    تجربة لكل دور
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500">
                    كل مستخدم يرى الخدمات والإجراءات المرتبطة بصلاحياته فقط.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            REVIEWS
        ====================================================== */}
        <section
          id="reviews"
          className="relative scroll-mt-24 overflow-hidden border-y border-sky-100/70 bg-[#f5f9fe] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32 xl:py-40"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-52 top-20 h-[420px] w-[420px] rounded-full bg-sky-100/65 blur-3xl" />
            <div className="absolute -left-56 bottom-0 h-[380px] w-[380px] rounded-full bg-blue-100/40 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-sky-600">
                تجارب المستخدمين
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 min-[430px]:text-4xl sm:text-5xl lg:text-6xl">
                العمل أسهل عندما تكون الأدوات واضحة.
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
                نماذج تقييمات تجريبية توضح كيف تخدم Teachix أدوار المدرسة
                المختلفة. سيتم استبدالها لاحقًا بتجارب مستخدمين فعلية.
              </p>
            </div>

            <div className="relative mt-12 md:hidden">
              <div
                dir="rtl"
                className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-3 [scrollbar-width:none] min-[430px]:gap-5 sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
              >
                {reviews.map((review, index) => (
                  <ReviewCard
                    key={review.name}
                    review={review}
                    index={index}
                    mobile
                  />
                ))}
              </div>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100"
              >
                <ArrowRight className="h-4 w-4" />
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100"
              >
                <ArrowLeft className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-16 hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-4">
              {reviews.map((review, index) => (
                <ReviewCard
                  key={review.name}
                  review={review}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            CTA
        ====================================================== */}
        <section className="bg-[#f5f9fe] px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-12 lg:px-10 lg:pb-32 lg:pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 px-5 py-14 text-center text-white shadow-[0_35px_90px_-45px_rgba(2,132,199,0.65)] sm:rounded-[32px] sm:px-10 sm:py-20 lg:py-24">
              <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-40 -left-28 h-96 w-96 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[70%] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <Sparkles className="mx-auto h-7 w-7 text-sky-200" />

                <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black leading-tight min-[430px]:text-4xl sm:text-5xl">
                  ابدأ تنظيم أعمال مدرستك مع Teachix
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-sky-100">
                  أنشئ حسابك وابدأ العمل ضمن تجربة مدرسية أوضح وأكثر تنظيمًا.
                </p>

                <Link
                  href="/register"
                  className="mt-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-sky-700 transition hover:bg-sky-50"
                >
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
