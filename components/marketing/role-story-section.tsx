"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type StoryItemProps = {
  eyebrow: string;
  title: string;
  description: string;
  direction: "normal" | "reverse";
  icon: React.ReactNode;
  visual: React.ReactNode;
};

function MobileStoryCard({
  eyebrow,
  title,
  visual,
}: Pick<StoryItemProps, "eyebrow" | "title" | "visual">) {
  return (
    <article className="w-[88vw] shrink-0 snap-center overflow-hidden rounded-[26px] border border-white/90 bg-white/90 p-4 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.28)] backdrop-blur-sm min-[430px]:p-5">
      <div className="min-w-0">
        <p className="text-xs font-black text-sky-600">
          {eyebrow}
        </p>

        <h3 className="mt-2 text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950">
          {title}
        </h3>

        <Link
          href="/register"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-700"
        >
          ابدأ الآن
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 h-[390px] overflow-hidden rounded-[20px] bg-white min-[430px]:h-[420px]">
        <div className="w-[145%] origin-top-right scale-[0.69]">
          {visual}
        </div>
      </div>
    </article>
  );
}

function StoryItem({
  eyebrow,
  title,
  description,
  direction,
  icon,
  visual,
}: StoryItemProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const reverse = direction === "reverse";

  return (
    <article
      ref={ref}
      className="grid items-center gap-10 border-t border-slate-100 py-16 first:border-t-0 first:pt-4 sm:gap-14 sm:py-20 md:py-24 lg:min-h-[680px] lg:grid-cols-2 lg:gap-24 xl:gap-28 lg:py-28 xl:py-32"
    >
      <div
        className={[
          "max-w-xl transition-all duration-700 ease-out",
          reverse ? "lg:order-2" : "lg:order-1",
          visible
            ? "translate-x-0 opacity-100"
            : reverse
              ? "translate-x-8 opacity-0"
              : "-translate-x-8 opacity-0",
        ].join(" ")}
      >
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            {icon}
          </div>
        ) : null}

        <p className={icon ? "mt-7 text-sm font-black text-sky-600" : "text-base font-black text-sky-600"}>
          {eyebrow}
        </p>

        <h3 className="mt-3 text-3xl font-black leading-tight tracking-[-0.03em] text-slate-950 min-[430px]:text-4xl sm:text-5xl">
          {title}
        </h3>

        <p className="mt-6 max-w-lg text-base leading-8 text-slate-500 sm:text-lg sm:leading-9">
          {description}
        </p>

        <Link
          href="/register"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-sky-700"
        >
          ابدأ الآن
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div
        className={[
          "relative transition-all delay-100 duration-700 ease-out",
          reverse ? "lg:order-1" : "lg:order-2",
          visible
            ? "translate-x-0 opacity-100"
            : reverse
              ? "-translate-x-12 opacity-0"
              : "translate-x-12 opacity-0",
        ].join(" ")}
      >
        {visual}
      </div>
    </article>
  );
}

function TeacherVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[610px]">
      <div className="absolute inset-6 rounded-[4rem] bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-[520px] lg:rotate-[2deg]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.34)] sm:min-h-[560px] sm:rounded-[32px] sm:p-8">
          <div className="flex items-start justify-between border-b border-slate-100 pb-7">
            <div>
              <p className="text-xs font-black text-sky-600">
                Teachix
              </p>

              <h4 className="mt-2 text-2xl font-black text-slate-950">
                تقرير أداء الواجبات الوظيفية
              </h4>


            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              مكتمل
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                اسم المعلم
              </p>

              <div className="mt-3 h-3 w-28 rounded-full bg-slate-200" />
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                الفترة
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                الفصل الدراسي الحالي
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-900">
                  اكتمال ملف الإنجاز
                </p>
              </div>

              <p className="text-3xl font-black text-sky-600">
                92%
              </p>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[92%] rounded-full bg-sky-500" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-sky-50/70 p-5">
              <p className="text-xs font-bold text-slate-400">
                الالتزام
              </p>

              <p className="mt-2 text-lg font-black text-slate-900">
                مرتفع
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                الإنجاز
              </p>

              <p className="mt-2 text-lg font-black text-slate-900">
                ممتاز
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-400">
                المتابعة
              </p>

              <p className="mt-2 text-lg font-black text-slate-900">
                منتظمة
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
            <p className="text-xs font-bold text-slate-400">
              ملاحظات التقرير
            </p>

            <div className="mt-4 space-y-3">
              <div className="h-2.5 rounded-full bg-slate-200" />
              <div className="h-2.5 w-[88%] rounded-full bg-slate-200" />
              <div className="h-2.5 w-[72%] rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CounselorVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute inset-7 rounded-[4rem] bg-blue-50 blur-3xl" />

      <div className="relative mx-auto max-w-[570px] lg:-rotate-[2deg]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.34)] sm:min-h-[550px] sm:rounded-[32px] sm:p-8">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-6">
            <div>
              <p className="text-xs font-black text-sky-600">
                Teachix
              </p>

              <h4 className="mt-2 text-2xl font-black text-slate-950">
                الخدمات الإرشادية
              </h4>
            </div>

            <div className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
              الموجه الطلابي
            </div>
          </div>

          {/* Services */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                  <div className="h-3 w-3 rounded-full border-2 border-sky-500" />
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-sky-700">
                  نشط
                </span>
              </div>

              <p className="mt-5 text-sm font-black text-slate-950">
                متابعة حالات الطلاب
              </p>

              <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
                متابعة الحالات والإجراءات المرتبطة بها
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                </div>
              </div>

              <p className="mt-5 text-sm font-black text-slate-950">
                التواصل بين الأسرة والمدرسة
              </p>

              <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
                توثيق التواصل ونتائج المتابعة
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <div className="h-4 w-4 rounded-md border-2 border-sky-400" />
              </div>

              <p className="mt-5 text-sm font-black text-slate-950">
                البرامج الإرشادية
              </p>

              <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
                تنفيذ البرامج وتوثيق الشواهد
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <div className="space-y-1">
                  <div className="h-1.5 w-4 rounded-full bg-sky-400" />
                  <div className="h-1.5 w-3 rounded-full bg-sky-200" />
                </div>
              </div>

              <p className="mt-5 text-sm font-black text-slate-950">
                التقارير والشواهد
              </p>

              <p className="mt-2 text-xs font-bold leading-6 text-slate-400">
                تحويل العمل المنجز إلى سجل موثق
              </p>
            </div>
          </div>

          {/* Current student follow-up */}
          <div className="mt-5 rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-sky-600">
                  متابعة حالية
                </p>

                <p className="mt-2 text-base font-black text-slate-950">
                  حالة طالب قيد المتابعة
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
                قيد الإجراء
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50">
                <div className="h-5 w-5 rounded-full bg-sky-200" />
              </div>

              <div>
                <div className="h-2.5 w-28 rounded-full bg-slate-200" />
                <div className="mt-2 h-2 w-20 rounded-full bg-slate-100" />
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                <span>بدء الحالة</span>
                <span>متابعة</span>
                <span>تقرير</span>
              </div>

              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[66%] rounded-full bg-sky-500" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PrincipalVisual() {
  const timetableCells = Array.from({ length: 30 });

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute inset-7 rounded-[4rem] bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-[570px] lg:rotate-[1.5deg]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_50px_130px_-55px_rgba(15,23,42,0.36)] sm:rounded-[34px] sm:p-7">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-black text-sky-600">
                Teachix
              </p>

              <h4 className="mt-2 text-2xl font-black text-slate-950">
                إدارة الجدول الدراسي
              </h4>
            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              جاهز
            </div>
          </div>

          {/* Main actions */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-xs font-black text-sky-600">
                الجدول الدراسي
              </p>

              <h5 className="mt-2 text-base font-black text-slate-950">
                إنشاء الجدول الدراسي
              </h5>

              <p className="mt-1.5 text-xs font-bold leading-5 text-slate-400">
                تنظيم الحصص وتوزيعها على أيام الأسبوع
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black text-sky-600">
                التغطية اليومية
              </p>

              <h5 className="mt-2 text-base font-black text-slate-950">
                حصص الانتظار
              </h5>

              <p className="mt-1.5 text-xs font-bold leading-5 text-slate-400">
                متابعة الحصص الشاغرة وتغطيتها بسرعة
              </p>
            </div>
          </div>

          {/* Timetable */}
          <div className="mt-4 rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-sky-600">
                  الأسبوع الحالي
                </p>

                <h5 className="mt-1.5 text-base font-black text-slate-950">
                  توزيع الحصص
                </h5>
              </div>

              <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700">
                محدث
              </span>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-1.5">
              {timetableCells.map((_, index) => (
                <div
                  key={index}
                  className={[
                    "h-8 rounded-lg border",
                    index === 7 ||
                    index === 14 ||
                    index === 20 ||
                    index === 26
                      ? "border-sky-100 bg-sky-50"
                      : index === 10 || index === 23
                        ? "border-amber-100 bg-amber-50"
                        : "border-slate-100 bg-slate-50",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          {/* Waiting periods */}
          <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-950">
                  حصص الانتظار اليوم
                </p>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  الحصص التي تحتاج إلى تغطية
                </p>
              </div>

              <p className="text-2xl font-black text-sky-600">
                3
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white px-2 py-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-400">
                  الحصة
                </p>

                <p className="mt-1 text-xs font-black text-slate-900">
                  الثانية
                </p>
              </div>

              <div className="rounded-xl bg-white px-2 py-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-400">
                  الحصة
                </p>

                <p className="mt-1 text-xs font-black text-slate-900">
                  الرابعة
                </p>
              </div>

              <div className="rounded-xl bg-white px-2 py-2.5 text-center">
                <p className="text-[9px] font-bold text-slate-400">
                  الحصة
                </p>

                <p className="mt-1 text-xs font-black text-slate-900">
                  السادسة
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ActivityVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute inset-7 rounded-[4rem] bg-blue-50 blur-3xl" />

      <div className="relative mx-auto max-w-[570px] lg:-rotate-[1.5deg]">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_50px_130px_-55px_rgba(15,23,42,0.36)] sm:rounded-[34px] sm:p-7">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-black text-sky-600">
                Teachix
              </p>

              <h4 className="mt-2 text-2xl font-black text-slate-950">
                إدارة برامج النشاط
              </h4>
            </div>

            <div className="rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
              رائد النشاط
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-xs font-black text-sky-600">
                البرنامج
              </p>

              <h5 className="mt-2 text-sm font-black text-slate-950">
                تفعيل برنامج
              </h5>

              <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-400">
                بدء التنفيذ وتوثيق بيانات البرنامج
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black text-sky-600">
                التكليف
              </p>

              <h5 className="mt-2 text-sm font-black text-slate-950">
                إسناد نشاط لمعلم
              </h5>

              <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-400">
                إرسال التكليف ومتابعة حالة التنفيذ
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black text-sky-600">
                التوثيق
              </p>

              <h5 className="mt-2 text-sm font-black text-slate-950">
                ملف النشاط
              </h5>

              <p className="mt-1.5 text-[11px] font-bold leading-5 text-slate-400">
                حفظ الشواهد والتقارير والمرفقات
              </p>
            </div>
          </div>

          {/* Active program */}
          <div className="mt-4 rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-sky-600">
                  برنامج نشط
                </p>

                <h5 className="mt-1.5 text-base font-black text-slate-950">
                  برنامج مهارات الحياة
                </h5>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                قيد التنفيذ
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                <span>البداية</span>
                <span>التنفيذ</span>
                <span>التوثيق</span>
              </div>

              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[72%] rounded-full bg-sky-500" />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
              <p className="text-xs font-black text-sky-600">
                آخر إسناد
              </p>

              <h5 className="mt-2 text-sm font-black text-slate-950">
                تنفيذ فعالية مدرسية
              </h5>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white" />

                <div>
                  <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-16 rounded-full bg-slate-100" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">
                  بانتظار التنفيذ
                </span>

                <span className="text-[10px] font-black text-slate-400">
                  استحقاق قريب
                </span>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
              <p className="text-xs font-black text-sky-600">
                ملف النشاط
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="aspect-square rounded-xl border border-dashed border-slate-200 bg-white" />
                <div className="aspect-square rounded-xl border border-dashed border-slate-200 bg-white" />
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">
                    الشواهد
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-950">
                    8
                  </p>
                </div>

                <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700">
                  محفوظة
                </span>
              </div>
            </div>
          </div>

          {/* Report */}
          <div className="mt-4 rounded-[22px] border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-sky-600">
                  تقرير التنفيذ
                </p>

                <p className="mt-1.5 text-sm font-black text-slate-950">
                  جاهز للإصدار بعد اكتمال التوثيق
                </p>
              </div>

              <div className="h-10 w-24 rounded-xl bg-sky-50" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function RoleStorySection() {
  const stories: StoryItemProps[] = [
    {
      eyebrow: "للمعلم",
      title: "أنجز عملك، ووثّقه بسهولة.",
      description: "أنشئ تقاريرك، وثّق أداءك، وأنجز مهامك ضمن مساحة عمل واضحة تحول العمل اليومي إلى سجل منظم وجاهز للرجوع إليه.",
      direction: "normal",
      icon: null,
      visual: <TeacherVisual />,
    },
    {
      eyebrow: "للموجه الطلابي",
      title: "كل متابعة، لها مسار واضح.",
      description: "أدر الخدمات الإرشادية، تابع حالات الطلاب، وثّق التواصل والإجراءات، وحوّل العمل المنجز إلى تقارير وشواهد مرتبة دون تشتت.",
      direction: "reverse",
      icon: null,
      visual: <CounselorVisual />,
    },
    {
      eyebrow: "لمدير المدرسة",
      title: "نظّم يوم المدرسة من مكان واحد.",
      description: "أنشئ الجدول الدراسي، تابع توزيع الحصص، وأدر حصص الانتظار بسرعة ضمن مساحة واضحة تساعدك على متابعة اليوم الدراسي واتخاذ الإجراء المناسب.",
      direction: "normal",
      icon: null,
      visual: <PrincipalVisual />,
    },
    {
      eyebrow: "لرائد النشاط",
      title: "من الفكرة إلى التقرير.",
      description: "فعّل برامج النشاط، أسند التنفيذ للمعلمين، تابع حالة التكليفات، واحفظ الشواهد وملف النشاط حتى يصبح العمل جاهزًا للتوثيق وإصدار التقرير.",
      direction: "reverse",
      icon: null,
      visual: <ActivityVisual />,
    },
  ];

  return (
    <section
      id="users"
      className="relative scroll-mt-24 overflow-hidden border-y border-sky-100/70 bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[46%] bg-[#f4f9ff] md:block" />

      <div
        className="pointer-events-none absolute inset-x-0 top-[46%] hidden h-40 bg-white md:block"
        style={{
          clipPath: "polygon(0 48%, 100% 0, 100% 100%, 0 100%)",
        }}
      />

      <div className="pointer-events-none absolute -right-56 top-24 hidden h-[520px] w-[520px] rounded-full bg-sky-100/70 blur-3xl md:block" />
      <div className="pointer-events-none absolute -left-52 top-[30%] hidden h-[440px] w-[440px] rounded-full bg-blue-100/35 blur-3xl md:block" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-sky-600">
            لمن المنصة؟
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 min-[430px]:text-4xl sm:text-5xl lg:text-6xl">
            مساحة عمل تناسب كل دور
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            كل مستخدم يعمل ضمن تجربة مستقلة وخدمات وأدوات تناسب مهامه داخل
            المدرسة.
          </p>
        </div>

        <div className="relative mt-10 md:hidden">
          <div
            dir="rtl"
            className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-3 [scrollbar-width:none] min-[430px]:gap-5 sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
          >
            {stories.map((story) => (
              <MobileStoryCard
                key={story.eyebrow}
                eyebrow={story.eyebrow}
                title={story.title}
                visual={story.visual}
              />
            ))}
          </div>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-[60%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100"
          >
            <ArrowRight className="h-4 w-4" />
          </span>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[60%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sky-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)] ring-1 ring-sky-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-20 hidden md:block lg:mt-24 xl:mt-28">
          {stories.map((story) => (
            <StoryItem key={story.eyebrow} {...story} />
          ))}
        </div>
      </div>
    </section>
  );
}
