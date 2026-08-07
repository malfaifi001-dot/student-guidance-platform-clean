import Link from "next/link";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

type NextAction = {
  title: string;
  description: string;
  cta: string;
  href: string;
  progress?: {
    value: number;
    max: number;
  };
};

function computeNextAction(
  data: ProjectDashboardData,
): NextAction {
  const counts = data.counts;
  const target =
    data.setup.teacherTarget;

  const teachersIncomplete =
    counts.teachersCount === 0 ||
    (target !== null &&
      counts.teachersCount <
        target);

  const base = `/dashboard/timetable-v2/${data.project.id}`;

  if (teachersIncomplete) {
    return {
      title:
        "الخطوة التالية: تجهيز المعلمين",
      description:
        "أدخل أسماء المعلمين وتخصصاتهم وحدود الأحمال الأسبوعية قبل الانتقال إلى الإسناد.",
      cta: "فتح إدارة المعلمين",
      href: `${base}/teachers`,
    };
  }

  if (
    counts.underAssignedRows > 0 ||
    counts.overAssignedRows > 0
  ) {
    const remaining =
      Math.max(
        0,
        counts.totalWeeklyLessons -
          counts.assignedLessons,
      );

    return {
      title:
        "الخطوة التالية: إكمال الإسناد",
      description:
        remaining > 0
          ? `المتبقي ${remaining} حصة من أصل ${counts.totalWeeklyLessons} حصة أسبوعية.`
          : "توجد إسنادات زائدة عن الخطة تحتاج إلى مراجعة.",
      progress: {
        value:
          counts.assignedLessons,
        max:
          counts.totalWeeklyLessons,
      },
      cta: "فتح الإسناد",
      href: `${base}/assignments`,
    };
  }

  if (!data.readiness.canGenerate) {
    return {
      title:
        "الخطوة التالية: معالجة أخطاء الجاهزية",
      description: `${data.readiness.errorCount} خطأ يمنع إنشاء الجدول. راجع التفاصيل وعالجها قبل التشغيل.`,
      cta: "فتح فحص الجاهزية",
      href: `${base}/readiness`,
    };
  }

  if (!data.schedule.exists) {
    return {
      title:
        "الخطوة التالية: إنشاء الجدول",
      description:
        "البيانات جاهزة — شغّل المحرك لإنشاء النسخة الأولى من الجدول.",
      cta: "إنشاء الجدول",
      href: `${base}/generate`,
    };
  }

  if (data.schedule.isStale) {
    return {
      title:
        "الخطوة التالية: إعادة إنشاء الجدول",
      description:
        "النسخة الحالية أقدم من بيانات المشروع بعد التعديلات الأخيرة.",
      cta: "إنشاء نسخة جديدة",
      href: `${base}/generate`,
    };
  }

  const status =
    data.schedule.current?.status ??
    "";

  if (status === "GENERATED") {
    return {
      title:
        "الخطوة التالية: مراجعة واعتماد الجدول",
      description: `النسخة #${data.schedule.current?.version} جاهزة للمراجعة ثم الاعتماد.`,
      cta: "مراجعة النسخ",
      href: `${base}/generate`,
    };
  }

  if (status === "APPROVED") {
    return {
      title:
        "الخطوة التالية: نشر الجدول",
      description:
        "النسخة معتمدة وتنتظر النشر ليبدأ التشغيل اليومي.",
      cta: "نشر الجدول",
      href: `${base}/generate`,
    };
  }

  if (status === "PUBLISHED") {
    return {
      title: "الجدول منشور",
      description:
        "الجدول الحالي منشور وجاهز للتشغيل اليومي.",
      cta: "مراجعة الجدول",
      href: `${base}/generate`,
    };
  }

  return {
    title:
      "الخطوة التالية: مراجعة البيانات",
    description:
      "راجع حالة المشروع وفحص الجاهزية للمتابعة.",
    cta: "فتح الفحص",
    href: `${base}/readiness`,
  };
}

export function ProjectNextAction({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const action =
    computeNextAction(data);

  const percent =
    action.progress &&
    action.progress.max > 0
      ? Math.min(
          100,
          Math.round(
            (action.progress.value /
              action.progress.max) *
              100,
          ),
        )
      : 0;

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black text-sky-700">
            الخطوة التالية المقترحة
          </div>

          <h2 className="mt-1 text-lg font-black text-slate-950">
            {action.title}
          </h2>

          <p className="mt-1 text-xs leading-6 text-slate-600">
            {action.description}
          </p>

          {action.progress ? (
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                <span>
                  {action.progress.value} /{" "}
                  {action.progress.max} حصة
                </span>

                <span>
                  {percent}%
                </span>
              </div>

              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-sky-600"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <Link
          href={action.href}
          className="h-11 shrink-0 rounded-xl bg-sky-700 px-6 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-sky-800"
        >
          {action.cta}
        </Link>
      </div>
    </section>
  );
}
