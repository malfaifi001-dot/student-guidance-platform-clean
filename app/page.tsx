import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FolderCheck,
  GraduationCap,
  School,
  Trophy,
  UsersRound,
  FileCheck2,
  LayoutDashboard,
  ShieldCheck,
  Star,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { TeachixLogo } from "@/components/brand/teachix-logo";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { TeachixStructuredData } from "@/components/marketing/teachix-structured-data";
import { RoleStorySection } from "@/components/marketing/role-story-section";
import { SocialSection } from "@/components/marketing/social-section";
import { TEACHIX_TAGLINE } from "@/lib/constants/brand";

const homeDescription =
  "Teachix منصة مدرسية رقمية متكاملة لمدير المدرسة والمعلم والموجه الطلابي ورائد النشاط، لتنظيم الأعمال وتوثيقها ومتابعتها وإصدار التقارير من مكان واحد.";

export const metadata: Metadata = {
  title: { absolute: TEACHIX_TAGLINE },
  description: homeDescription,
  alternates: {
    canonical: "https://teachix.sa/",
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/",
    siteName: "تيتش اكس",
    title: "Teachix | منصة مدرسية رقمية متكاملة",
    description: homeDescription,
  },
};

const reviews = [
  {
    name: "نورة القحطاني",
    role: "قائدة",
    initials: "ن",
    quote:
      "اللي عجبني إن كل شيء صار مرتب وواضح، وأقدر أوصل للمعلومة بسرعة بدل ما أدوّر بين أكثر من ملف.",
  },
  {
    name: "خالد الشهري",
    role: "رائد نشاط",
    initials: "خ",
    quote:
      "صراحة وفّر علي وقت كثير في تجهيز التقارير، خصوصًا ترتيب الشواهد ومتابعة التنفيذ. صار الشغل أسهل وأسرع.",
  },
  {
    name: "سارة القحطاني",
    role: "موجهة طلابية",
    initials: "س",
    quote:
      "متابعة الحالات صارت أسهل بكثير، وكل إجراء واضح قدامي وأعرف وش تم ووش باقي يحتاج متابعة.",
  },
  {
    name: "محمد الغامدي",
    role: "مدير مدرسة",
    initials: "م",
    quote:
      "صار عندي تصور أوضح عن سير العمل، وأقدر أتابع النتائج والتقارير بدون ما أدخل في تفاصيل كثيرة.",
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
        "group flex flex-col border border-slate-200 bg-white transition duration-300 dark:border-white/10 dark:bg-[#0D1B2E]",
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-base font-black text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-400/20 dark:text-sky-300">
            {review.initials}
          </div>

          <div className={mobile ? "min-w-0" : undefined}>
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-100">
              {review.name}
            </h3>

            <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
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

      <p className="mt-3 flex-1 text-sm font-bold leading-8 text-slate-600 dark:text-slate-300 sm:text-[15px]">
        {review.quote}
      </p>
    </article>
  );
}

export default function HomePage() {
  return (
    <div className="marketing-home min-h-screen overflow-x-clip bg-white text-slate-950 transition-colors duration-300 dark:bg-[#07111F] dark:text-slate-100">
      <TeachixStructuredData />
      <MarketingNavbar />

      <main>
        {/* =====================================================
            HERO
        ====================================================== */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-72 top-10 h-[620px] w-[620px] rounded-full bg-sky-50/80 blur-3xl dark:bg-sky-500/10" />
            <div className="absolute -left-72 top-60 h-[500px] w-[500px] rounded-full bg-blue-50/50 blur-3xl dark:bg-blue-500/10" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-10 md:gap-12 md:pb-20 md:pt-12 lg:min-h-[680px] lg:grid-cols-[1fr_1fr] lg:gap-12 lg:px-10 lg:pb-20 lg:pt-12 xl:min-h-[800px] xl:gap-16 xl:pb-28 xl:pt-16">
            <div className="max-w-3xl">
              <h1 className="text-[2rem] font-black leading-[1.18] tracking-[-0.04em] text-slate-950 dark:text-slate-100 min-[430px]:text-[2.2rem] sm:text-[2.65rem] md:text-[2.9rem] lg:text-[3.15rem] xl:text-[3.8rem]">
                أعمالك اليومية،
                <span className="mt-2 block text-sky-600">
                  أسرع وأسهل من مكان واحد.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400 sm:mt-8 sm:text-xl sm:leading-9">
                <span className="font-bold text-slate-950 dark:text-slate-100">Teachix</span>{" "}
                تجمع مهام فريق المدرسة، وتساعد على إنجازها، توثيقها،
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
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#102138] dark:text-slate-100 dark:hover:bg-[#16304f]"
                >
                  تسجيل الدخول
                </Link>
              </div>

              <nav aria-label="روابط Teachix العامة" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                <Link href="/free/curriculum-distribution" className="font-black text-sky-700 transition hover:text-sky-600 dark:text-sky-300">
                  حمّل توزيع منهجك مجانًا
                </Link>
                <Link href="/services" className="transition hover:text-sky-600">خدمات Teachix</Link>
                <Link href="/features" className="transition hover:text-sky-600">مميزات Teachix</Link>
                <Link href="/about" className="transition hover:text-sky-600">عن Teachix</Link>
                <Link href="/contact" className="transition hover:text-sky-600">تواصل معنا</Link>
              </nav>


            </div>

            <div className="relative mx-auto hidden w-full md:block md:max-w-[570px] lg:max-w-[540px] xl:max-w-[680px]">
              <div className="absolute inset-10 rounded-[4rem] bg-sky-100/70 blur-3xl dark:bg-sky-500/10" />

              <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_42px_120px_-55px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-[#0D1B2E] dark:shadow-[0_42px_120px_-55px_rgba(0,0,0,0.7)] md:p-5 lg:p-6 xl:rounded-[34px] xl:p-7">
                {/* Header */}
                <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-5 dark:border-white/10">
                  <div>
                    <TeachixLogo size="sm" />

                    <h2 className="mt-1.5 text-xl font-black text-slate-950 dark:text-slate-100 xl:text-2xl">
                      لجميع منسوبي المدرسة
                    </h2>
                  </div>

                  <div className="rounded-full bg-sky-50 px-4 py-2 text-[11px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    أربع تجارب، مساحة واحدة
                  </div>
                </div>

                {/* Teacher + Counselor */}
                <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/55 p-4 dark:border-white/10 dark:bg-[#102138] xl:p-5">
                  <div>
                    <p className="text-[11px] font-black text-sky-600">
                      التعليم والإرشاد
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">
                      إنجاز العمل ومتابعة الطالب
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#102138]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[9px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          المعلم
                        </span>

                        <GraduationCap className="h-4 w-4 text-sky-500" />
                      </div>

                      <p className="mt-4 text-sm font-black text-slate-950 dark:text-slate-100">
                        ملف الإنجاز
                      </p>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full w-[86%] rounded-full bg-sky-500" />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#102138]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          الموجه الطلابي
                        </span>

                        <UsersRound className="h-4 w-4 text-sky-500" />
                      </div>

                      <p className="mt-4 text-sm font-black text-slate-950 dark:text-slate-100">
                        متابعة حالة
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Principal + Activity leader */}
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-[#102138] xl:p-5">
                  <div>
                    <p className="text-[11px] font-black text-sky-600">
                      الإدارة والنشاط
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">
                      تنظيم اليوم وتنفيذ البرامج
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#0D1B2E]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          مدير المدرسة
                        </span>

                        <School className="h-4 w-4 text-sky-500" />
                      </div>

                      <p className="mt-4 text-sm font-black text-slate-950 dark:text-slate-100">
                        الجدول الدراسي
                      </p>

                      <div className="mt-3 grid grid-cols-5 gap-1">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <span
                            key={`hero-schedule-${index}`}
                            className={[
                              "h-3 rounded",
                              index === 3 || index === 7
                                ? "bg-sky-200"
                                : "bg-slate-100 dark:bg-slate-700",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#0D1B2E]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[9px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          رائد النشاط
                        </span>

                        <Trophy className="h-4 w-4 text-sky-500" />
                      </div>

                      <p className="mt-4 text-sm font-black text-slate-950 dark:text-slate-100">
                        برنامج نشاط
                      </p>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full w-[72%] rounded-full bg-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shared result */}
                <div className="mt-4 flex items-center justify-between gap-4 rounded-[22px] border border-sky-100 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#102138] xl:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <FileCheck2 className="h-4.5 w-4.5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-slate-100">
                        العمل يتحول إلى سجل واضح
                      </p>

                      <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        متابعة · توثيق · تقارير
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    جاهز
                  </span>
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
          className="scroll-mt-24 overflow-hidden border-y border-slate-100 bg-[#f8fafc] px-5 py-16 dark:border-white/10 dark:bg-[#07111F] sm:px-8 sm:py-20 md:py-24 lg:px-10 lg:py-28 xl:py-40"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-24">
              <div>
                <p className="text-sm font-black text-sky-600">
                  لماذا Teachix؟
                </p>

                <h2 className="mt-5 text-4xl font-black leading-[1.12] tracking-[-0.045em] text-slate-950 dark:text-slate-100 sm:text-[2.6rem] md:text-5xl lg:text-[3.25rem] xl:text-7xl">
                  أقل تشتت.
                  <span className="block text-slate-400 dark:text-slate-500">
                    عمل أوضح.
                  </span>
                </h2>

                <p className="mt-8 max-w-xl text-lg leading-9 text-slate-500 dark:text-slate-400">
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
                <article className="min-h-[240px] rounded-[28px] border border-sky-100 bg-sky-50/55 p-8 transition duration-300 hover:-translate-y-1 hover:bg-sky-50 dark:border-white/10 dark:bg-[#102138] dark:hover:bg-[#16304f]">
                  <LayoutDashboard className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black text-slate-950 dark:text-slate-100">
                    كل العمل في مكان واحد
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500 dark:text-slate-400">
                    أعمال المدرسة محفوظة داخل مساحة واضحة بدل التنقل بين أدوات
                    منفصلة.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-cyan-100 bg-cyan-50/40 p-8 transition duration-300 hover:-translate-y-1 hover:bg-cyan-50/70 dark:border-white/10 dark:bg-[#102138] dark:hover:bg-[#16304f]">
                  <FolderCheck className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black text-slate-950 dark:text-slate-100">
                    توثيق منظم
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500 dark:text-slate-400">
                    الشواهد والمرفقات والملفات مرتبطة مباشرة بالعمل الذي تم
                    إنجازه.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-blue-100 bg-blue-50/40 p-8 transition duration-300 hover:-translate-y-1 hover:bg-blue-50/70 dark:border-white/10 dark:bg-[#102138] dark:hover:bg-[#16304f]">
                  <FileText className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black text-slate-950 dark:text-slate-100">
                    تقارير جاهزة
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500 dark:text-slate-400">
                    التقرير امتداد للعمل المنجز، دون الحاجة لإعادة كتابة نفس
                    البيانات.
                  </p>
                </article>

                <article className="min-h-[240px] rounded-[28px] border border-indigo-100 bg-indigo-50/35 p-8 transition duration-300 hover:-translate-y-1 hover:bg-indigo-50/60 dark:border-white/10 dark:bg-[#102138] dark:hover:bg-[#16304f]">
                  <ShieldCheck className="h-7 w-7 text-sky-600" />

                  <h3 className="mt-9 text-2xl font-black text-slate-950 dark:text-slate-100">
                    تجربة لكل دور
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-slate-500 dark:text-slate-400">
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
          className="relative scroll-mt-24 overflow-hidden border-y border-sky-100/70 bg-[#f5f9fe] px-5 py-16 dark:border-white/10 dark:bg-[#0D1B2E] sm:px-8 sm:py-20 md:py-24 lg:px-10 lg:py-28 xl:py-40"
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100 min-[430px]:text-4xl sm:text-[2.6rem] md:text-5xl lg:text-[3.25rem] xl:text-6xl">
                العمل أسهل عندما تكون الأدوات واضحة.
              </h2>


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
                className="pointer-events-none absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100 dark:bg-[#102138] dark:ring-white/10"
              >
                <ArrowRight className="h-4 w-4" />
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100 dark:bg-[#102138] dark:ring-white/10"
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
        <section className="bg-[#f5f9fe] px-5 pb-20 pt-10 dark:bg-[#0D1B2E] sm:px-8 sm:pb-24 sm:pt-12 lg:px-10 lg:pb-32 lg:pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[26px] bg-sky-600 px-5 py-14 text-center text-white shadow-[0_35px_90px_-45px_rgba(2,132,199,0.65)] sm:rounded-[30px] sm:px-8 sm:py-16 md:px-10 lg:py-20 xl:rounded-[32px] xl:py-24">
              <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute -bottom-40 -left-28 h-96 w-96 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[70%] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <TeachixLogo iconOnly inverted className="mx-auto w-[4.5rem]" />

                <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black leading-tight min-[430px]:text-4xl sm:text-[2.6rem] md:text-5xl xl:text-[3.25rem]">
                  ابدأ تنظيم أعمالك اليومية مع Teachix
                </h2>



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

      <SocialSection />

      <MarketingFooter />
    </div>
  );
}
