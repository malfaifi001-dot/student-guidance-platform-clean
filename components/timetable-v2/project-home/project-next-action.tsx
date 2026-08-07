import Link from "next/link";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

type NextAction = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  tone:
    | "sky"
    | "amber"
    | "emerald";
  progress?: {
    value: number;
    max: number;
  };
};

function computeNextAction(
  data: ProjectDashboardData,
): NextAction {
  const counts =
    data.counts;

  const target =
    data.setup.teacherTarget;

  const base =
    `/dashboard/timetable-v2/${data.project.id}`;

  const teachersIncomplete =
    counts.teachersCount ===
      0 ||
    (
      target !==
        null &&
      counts.teachersCount <
        target
    );

  if (teachersIncomplete) {
    return {
      eyebrow:
        "الإعداد الأساسي",
      title:
        "أكمل بيانات المعلمين",
      description:
        "أدخل أسماء المعلمين وتخصصاتهم والنصاب الأسبوعي، ثم انتقل إلى الإسنادات.",
      cta:
        "إدارة المعلمين",
      href:
        `${base}/teachers`,
      tone:
        "sky",
    };
  }

  const assignmentsIncomplete =
    counts.assignmentsCount ===
      0 ||
    counts.underAssignedRows >
      0 ||
    counts.overAssignedRows >
      0;

  if (assignmentsIncomplete) {
    const remaining =
      Math.max(
        0,
        counts.totalWeeklyLessons -
          counts.assignedLessons,
      );

    return {
      eyebrow:
        "الإعداد الأساسي",
      title:
        "أكمل إسناد الحصص",
      description:
        counts.overAssignedRows >
        0
          ? "توجد إسنادات زائدة عن الخطة وتحتاج إلى مراجعة."
          : `المتبقي ${remaining} حصة من أصل ${counts.totalWeeklyLessons} حصة أسبوعية.`,
      progress: {
        value:
          counts.assignedLessons,
        max:
          counts.totalWeeklyLessons,
      },
      cta:
        "فتح الإسنادات",
      href:
        `${base}/assignments`,
      tone:
        "sky",
    };
  }

  if (
    !data.readiness.canGenerate
  ) {
    return {
      eyebrow:
        "فحص الجاهزية",
      title:
        "المشروع يحتاج مراجعة قبل التوليد",
      description:
        data.readiness.errorCount >
        0
          ? `${data.readiness.errorCount} خطأ يمنع إنشاء الجدول حاليًا.`
          : "راجع التحذيرات وحالة البيانات قبل تشغيل المحرك.",
      cta:
        "فتح فحص الجاهزية",
      href:
        `${base}/readiness`,
      tone:
        "amber",
    };
  }

  if (
    !data.schedule.exists
  ) {
    return {
      eyebrow:
        "التوليد",
      title:
        "المشروع جاهز لإنشاء الجدول",
      description:
        "اكتملت البيانات الأساسية واجتاز المشروع فحص الجاهزية.",
      cta:
        "إنشاء الجدول",
      href:
        `${base}/generate`,
      tone:
        "emerald",
    };
  }

  if (
    data.schedule.isStale
  ) {
    return {
      eyebrow:
        "النسخة الحالية",
      title:
        "أنشئ نسخة حديثة من الجدول",
      description:
        "تم تعديل بيانات المشروع بعد إنشاء النسخة الحالية، لذلك لا يمكن اعتمادها كنسخة نهائية.",
      cta:
        "إنشاء نسخة جديدة",
      href:
        `${base}/generate`,
      tone:
        "amber",
    };
  }

  const status =
    data.schedule.current
      ?.status ??
    "";

  if (
    status ===
    "GENERATED"
  ) {
    return {
      eyebrow:
        "المراجعة",
      title:
        "راجع الجدول قبل الاعتماد",
      description:
        `النسخة #${data.schedule.current?.version} جاهزة للمراجعة اليدوية والتحقق النهائي.`,
      cta:
        "فتح المراجعة",
      href:
        `${base}/review`,
      tone:
        "sky",
    };
  }

  if (
    status ===
    "APPROVED"
  ) {
    return {
      eyebrow:
        "الاعتماد والنشر",
      title:
        "النسخة معتمدة وتنتظر النشر",
      description:
        "انشر النسخة لتصبح الجدول التشغيلي الرسمي للمدرسة.",
      cta:
        "فتح النشر",
      href:
        `${base}/approval`,
      tone:
        "emerald",
    };
  }

  if (
    status ===
    "PUBLISHED"
  ) {
    return {
      eyebrow:
        "التشغيل اليومي",
      title:
        "الجدول منشور وجاهز للتشغيل",
      description:
        "يمكن الآن إدارة الغياب والبدلاء والمناوبات اعتمادًا على النسخة المنشورة.",
      cta:
        "فتح التشغيل اليومي",
      href:
        `${base}/daily-operations`,
      tone:
        "emerald",
    };
  }

  return {
    eyebrow:
      "المشروع",
    title:
      "راجع حالة المشروع",
    description:
      "افتح فحص الجاهزية لمعرفة الخطوة التالية المطلوبة.",
    cta:
      "فتح الفحص",
    href:
      `${base}/readiness`,
    tone:
      "sky",
  };
}

const TONE: Record<
  NextAction["tone"],
  {
    section: string;
    eyebrow: string;
    button: string;
    progress: string;
  }
> = {
  sky: {
    section:
      "border-sky-200 bg-sky-50",
    eyebrow:
      "text-sky-700",
    button:
      "bg-sky-700 hover:bg-sky-800",
    progress:
      "bg-sky-600",
  },

  amber: {
    section:
      "border-amber-200 bg-amber-50",
    eyebrow:
      "text-amber-700",
    button:
      "bg-amber-700 hover:bg-amber-800",
    progress:
      "bg-amber-600",
  },

  emerald: {
    section:
      "border-emerald-200 bg-emerald-50",
    eyebrow:
      "text-emerald-700",
    button:
      "bg-emerald-700 hover:bg-emerald-800",
    progress:
      "bg-emerald-600",
  },
};

export function ProjectNextAction({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const action =
    computeNextAction(
      data,
    );

  const styles =
    TONE[action.tone];

  const percent =
    action.progress &&
    action.progress.max >
      0
      ? Math.min(
          100,
          Math.round(
            (
              action.progress.value /
              action.progress.max
            ) *
              100,
          ),
        )
      : 0;

  return (
    <section
      className={[
        "rounded-3xl border p-5 shadow-sm lg:p-6",
        styles.section,
      ].join(" ")}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div
            className={[
              "text-[11px] font-black",
              styles.eyebrow,
            ].join(" ")}
          >
            الخطوة التالية •{" "}
            {action.eyebrow}
          </div>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            {action.title}
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-600">
            {
              action.description
            }
          </p>

          {action.progress ? (
            <div className="mt-4 max-w-lg">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                <span>
                  {
                    action.progress
                      .value
                  }{" "}
                  /{" "}
                  {
                    action.progress
                      .max
                  }{" "}
                  حصة
                </span>

                <span>
                  {percent}%
                </span>
              </div>

              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    styles.progress,
                  ].join(" ")}
                  style={{
                    width:
                      `${percent}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <Link
          href={action.href}
          className={[
            "inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-6 text-sm font-black text-white shadow-sm transition",
            styles.button,
          ].join(" ")}
        >
          {action.cta}
        </Link>
      </div>
    </section>
  );
}