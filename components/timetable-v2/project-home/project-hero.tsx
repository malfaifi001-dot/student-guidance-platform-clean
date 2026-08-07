import Link from "next/link";

import {
  BookOpenText,
  CalendarDays,
  Gauge,
  School,
  Users,
} from "lucide-react";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

import {
  PROJECT_STATUS_LABELS,
} from "./labels";

type HeroAction = {
  label: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  progress?: {
    value: number;
    max: number;
  };
};

function getHeroAction(
  data: ProjectDashboardData,
): HeroAction {
  const counts =
    data.counts;

  const base =
    `/dashboard/timetable-v2/${data.project.id}`;

  const target =
    data.setup.teacherTarget;

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
      label:
        "الخطوة التالية",
      title:
        "أكمل بيانات المعلمين",
      description:
        "أضف المعلمين وتخصصاتهم والنصاب الأسبوعي قبل الانتقال إلى إسناد الحصص.",
      cta:
        "فتح إدارة المعلمين",
      href:
        `${base}/teachers`,
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
      label:
        "الخطوة التالية",
      title:
        "أكمل إسناد الحصص",
      description:
        counts.overAssignedRows >
        0
          ? "توجد إسنادات زائدة عن الخطة وتحتاج إلى مراجعة."
          : `المتبقي ${remaining} حصة من أصل ${counts.totalWeeklyLessons} حصة أسبوعية.`,
      cta:
        "فتح الإسنادات",
      href:
        `${base}/assignments`,
      progress: {
        value:
          counts.assignedLessons,
        max:
          counts.totalWeeklyLessons,
      },
    };
  }

  if (
    !data.readiness.canGenerate
  ) {
    return {
      label:
        "الخطوة التالية",
      title:
        "راجع فحص الجاهزية",
      description:
        data.readiness.errorCount >
        0
          ? `${data.readiness.errorCount} خطأ يمنع إنشاء الجدول حاليًا.`
          : "راجع الملاحظات والتحذيرات قبل تشغيل محرك الجدول.",
      cta:
        "فتح فحص الجاهزية",
      href:
        `${base}/readiness`,
    };
  }

  if (
    !data.schedule.exists
  ) {
    return {
      label:
        "المشروع جاهز",
      title:
        "أنشئ النسخة الأولى من الجدول",
      description:
        "اكتملت البيانات الأساسية وأصبح المشروع جاهزًا لتشغيل محرك الجدول.",
      cta:
        "إنشاء الجدول",
      href:
        `${base}/generate`,
    };
  }

  if (
    data.schedule.isStale
  ) {
    return {
      label:
        "النسخة الحالية",
      title:
        "أنشئ نسخة حديثة",
      description:
        "تغيرت بيانات المشروع بعد إنشاء النسخة الحالية، لذلك تحتاج إلى إعادة التوليد.",
      cta:
        "إنشاء نسخة جديدة",
      href:
        `${base}/generate`,
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
      label:
        "الخطوة التالية",
      title:
        "راجع الجدول قبل الاعتماد",
      description:
        `النسخة #${data.schedule.current?.version} جاهزة للمراجعة والتحقق النهائي.`,
      cta:
        "فتح المراجعة",
      href:
        `${base}/review`,
    };
  }

  if (
    status ===
    "APPROVED"
  ) {
    return {
      label:
        "الخطوة التالية",
      title:
        "انشر الجدول المعتمد",
      description:
        "النسخة معتمدة ويمكن نشرها لتصبح الجدول الرسمي للمدرسة.",
      cta:
        "فتح الاعتماد والنشر",
      href:
        `${base}/approval`,
    };
  }

  if (
    status ===
    "PUBLISHED"
  ) {
    return {
      label:
        "الجدول الرسمي",
      title:
        "الجدول منشور وجاهز للتشغيل",
      description:
        "يمكن الآن إدارة الغياب والبدلاء والمناوبات على النسخة المنشورة.",
      cta:
        "فتح التشغيل اليومي",
      href:
        `${base}/daily-operations`,
    };
  }

  return {
    label:
      "الخطوة التالية",
    title:
      "راجع حالة المشروع",
    description:
      "افتح فحص الجاهزية لمعرفة العناصر التي تحتاج إلى إكمال.",
    cta:
      "فتح الفحص",
    href:
      `${base}/readiness`,
  };
}

function MiniMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex min-w-[108px] items-center gap-3 rounded-[1.4rem] bg-white/15 px-4 py-3 text-white ring-1 ring-inset ring-white/15 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </div>

      <div>
        <div className="text-lg font-black leading-none">
          {value}
        </div>

        <div className="mt-1 text-[11px] font-black text-sky-50/90">
          {label}
        </div>
      </div>
    </div>
  );
}

export function ProjectHero({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const action =
    getHeroAction(
      data,
    );

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

  const statusLabel =
    PROJECT_STATUS_LABELS[
      data.project.status
    ] ??
    data.project.status;

  return (
    <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 text-white shadow-xl">
      <div className="grid gap-8 p-7 lg:p-8 xl:grid-cols-[1fr_380px] xl:items-stretch">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black ring-1 ring-inset ring-white/20">
              مركز إدارة جدول الحصص
            </span>

            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-800">
              {statusLabel}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight lg:text-5xl">
            {data.project.name}
          </h1>

          <p className="mt-3 text-sm font-bold leading-8 text-sky-50">
            {data.project.academicYear}
            {" • "}
            {data.project.semester}

            {data.setup.stageLabels.length >
            0 ? (
              <>
                {" • "}
                {data.setup.stageLabels.join(
                  "، ",
                )}
              </>
            ) : null}
          </p>

          <div className="mt-7 max-w-3xl">
            <div className="text-xs font-black text-cyan-100">
              {action.label}
            </div>

            <h2 className="mt-1 text-2xl font-black lg:text-3xl">
              {action.title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-sky-50/90">
              {action.description}
            </p>

            {action.progress ? (
              <div className="mt-4 max-w-xl">
                <div className="flex items-center justify-between text-xs font-black text-white">
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

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width:
                        `${percent}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <Link
              href={action.href}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50"
            >
              {action.cta}
            </Link>
          </div>
        </div>

        <aside className="flex flex-col justify-end rounded-[2rem] bg-slate-950/15 p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
          <div className="mb-3 text-xs font-black text-sky-100">
            ملخص المشروع
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniMetric
              icon={
                <Gauge className="h-4 w-4" />
              }
              value={`${data.readiness.score}%`}
              label="الجاهزية"
            />

            <MiniMetric
              icon={
                <Users className="h-4 w-4" />
              }
              value={
                data.setup.teacherTarget !==
                null
                  ? `${data.counts.teachersCount}/${data.setup.teacherTarget}`
                  : data.counts.teachersCount
              }
              label="المعلمون"
            />

            <MiniMetric
              icon={
                <School className="h-4 w-4" />
              }
              value={data.counts.classesCount}
              label="الفصول"
            />

            <MiniMetric
              icon={
                <BookOpenText className="h-4 w-4" />
              }
              value={data.counts.subjectsCount}
              label="المواد"
            />

            <MiniMetric
              icon={
                <CalendarDays className="h-4 w-4" />
              }
              value={data.time.daysCount}
              label="أيام الدراسة"
            />

            <MiniMetric
              icon={
                <BookOpenText className="h-4 w-4" />
              }
              value={data.time.weeklySlotCount}
              label="الخانات الأسبوعية"
            />
          </div>
        </aside>
      </div>
    </section>
  );
}