import Link from "next/link";

import {
  Check,
  CircleAlert,
  Clock3,
  Play,
  School,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

type StepTone =
  | "complete"
  | "active"
  | "warning"
  | "blocked"
  | "future";

type JourneyStep = {
  number: number;
  title: string;
  description: string;
  status: string;
  tone: StepTone;
  metric?: string;
  hint?: string;
  href?: string;
  cta?: string;
};

function StepIcon({
  tone,
  number,
}: {
  tone: StepTone;
  number: number;
}) {
  if (
    tone ===
    "complete"
  ) {
    return (
      <Check className="h-5 w-5" />
    );
  }

  if (
    tone ===
    "warning" ||
    tone ===
    "blocked"
  ) {
    return (
      <CircleAlert className="h-5 w-5" />
    );
  }

  if (
    tone ===
    "active"
  ) {
    return (
      <Play className="h-4 w-4" />
    );
  }

  return (
    <span className="text-sm font-black">
      {number}
    </span>
  );
}

const CARD_STYLE: Record<
  StepTone,
  string
> = {
  complete:
    "border-slate-200 bg-white",
  active:
    "border-sky-300 bg-sky-50/50 shadow-sm",
  warning:
    "border-amber-200 bg-amber-50/50",
  blocked:
    "border-rose-200 bg-rose-50/50",
  future:
    "border-slate-200 bg-slate-50/70",
};

const ICON_STYLE: Record<
  StepTone,
  string
> = {
  complete:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  active:
    "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  warning:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  blocked:
    "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  future:
    "bg-white text-slate-400 ring-1 ring-slate-200",
};

const STATUS_STYLE: Record<
  StepTone,
  string
> = {
  complete:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  active:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  blocked:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  future:
    "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function JourneyCard({
  step,
}: {
  step: JourneyStep;
}) {
  return (
    <article
      className={[
        "flex h-full min-h-[220px] flex-col rounded-[2rem] border p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md",
        CARD_STYLE[
          step.tone
        ],
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              ICON_STYLE[
                step.tone
              ],
            ].join(" ")}
          >
            <StepIcon
              tone={
                step.tone
              }
              number={
                step.number
              }
            />
          </div>

          <div className="min-w-0">
            <h4 className="text-lg font-black leading-7 text-slate-950">
              {
                step.title
              }
            </h4>

            {step.metric ? (
              <p className="mt-1 text-xs font-black text-slate-500">
                {
                  step.metric
                }
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-3 py-1 text-[11px] font-black",
            STATUS_STYLE[
              step.tone
            ],
          ].join(" ")}
        >
          {
            step.status
          }
        </span>
      </div>

      <p className="mt-4 text-sm font-bold leading-7 text-slate-500">
        {
          step.description
        }
      </p>

      {step.hint ? (
        <p
          className={[
            "mt-2 text-xs font-black leading-6",
            step.tone ===
            "blocked"
              ? "text-rose-700"
              : step.tone ===
                  "warning"
                ? "text-amber-700"
                : "text-slate-400",
          ].join(" ")}
        >
          {
            step.hint
          }
        </p>
      ) : null}

      {step.href &&
      step.cta ? (
        <div className="mt-auto pt-5">
          <Link
            href={
              step.href
            }
            className={[
              "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-black transition",
              step.tone ===
              "active"
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {
              step.cta
            }
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function Phase({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black text-sky-700">
            {eyebrow}
          </p>

          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {title}
          </h3>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

export function ProjectWorkflow({
  data,
}: {
  data: ProjectDashboardData;
}) {
  const counts =
    data.counts;

  const readiness =
    data.readiness;

  const schedule =
    data.schedule;

  const base =
    `/dashboard/timetable-v2/${data.project.id}`;

  const teacherTarget =
    data.setup.teacherTarget;

  const teachersComplete =
    counts.teachersCount >
      0 &&
    (
      teacherTarget ===
        null ||
      counts.teachersCount >=
        teacherTarget
    );

  const assignmentsComplete =
    counts.assignmentsCount >
      0 &&
    counts.underAssignedRows ===
      0 &&
    counts.overAssignedRows ===
      0;

  const setupComplete =
    data.setup.hasDays &&
    data.setup.hasTeachingPeriods &&
    counts.classesCount >
      0 &&
    counts.subjectsCount >
      0 &&
    counts.classSubjectsCount >
      0;

  const currentStatus =
    schedule.current
      ?.status ??
    "";

  const setupSteps:
    JourneyStep[] = [
      {
        number: 1,
        title:
          "بيانات المشروع",
        description:
          "المراحل والصفوف والفصول والخطة الدراسية التي بُني عليها المشروع.",
        status:
          setupComplete
            ? "مكتمل"
            : "يحتاج مراجعة",
        tone:
          setupComplete
            ? "complete"
            : "warning",
        metric:
          `${counts.classesCount} فصول • ${counts.subjectsCount} مواد`,
      },

      {
        number: 2,
        title:
          "المعلمون",
        description:
          "أدخل أسماء المعلمين وتخصصاتهم والنصاب الأسبوعي لكل معلم.",
        status:
          teachersComplete
            ? "مكتمل"
            : "الخطوة الحالية",
        tone:
          teachersComplete
            ? "complete"
            : "active",
        metric:
          teacherTarget !==
          null
            ? `${counts.teachersCount}/${teacherTarget} معلم`
            : `${counts.teachersCount} معلم`,
        href:
          `${base}/teachers`,
        cta:
          teachersComplete
            ? "مراجعة المعلمين"
            : "إكمال المعلمين",
      },

      {
        number: 3,
        title:
          "الإسنادات",
        description:
          "اربط كل مادة وفصل بالمعلم وحدد عدد الحصص الأسبوعية.",
        status:
          assignmentsComplete
            ? "مكتمل"
            : teachersComplete
              ? "التالي"
              : "لاحقًا",
        tone:
          assignmentsComplete
            ? "complete"
            : teachersComplete
              ? "active"
              : "future",
        metric:
          `${counts.assignedLessons}/${counts.totalWeeklyLessons} حصة`,
        hint:
          counts.underAssignedRows >
          0
            ? `${counts.underAssignedRows} مادة لم يكتمل إسنادها`
            : counts.overAssignedRows >
                0
              ? `${counts.overAssignedRows} إسناد زائد يحتاج مراجعة`
              : undefined,
        href:
          teachersComplete
            ? `${base}/assignments`
            : undefined,
        cta:
          teachersComplete
            ? "فتح الإسنادات"
            : undefined,
      },

      {
        number: 4,
        title:
          "الأوقات والقيود",
        description:
          "راجع أيام الدراسة والحصص اليومية وأضف القيود والتفضيلات عند الحاجة.",
        status:
          data.setup.hasDays &&
          data.setup.hasTeachingPeriods
            ? "جاهز"
            : "يحتاج إكمال",
        tone:
          data.setup.hasDays &&
          data.setup.hasTeachingPeriods
            ? "complete"
            : "warning",
        metric:
          `${data.time.daysCount} أيام × ${data.time.periodsPerDay} حصص • ${data.constraints.activeCount} قيود`,
        hint:
          data.constraints.activeCount ===
            0
            ? "القيود اختيارية ويمكن إضافتها لاحقًا."
            : undefined,
        href:
          `${base}/constraints`,
        cta:
          "فتح الأوقات والقيود",
      },
    ];

  const readinessStep:
    JourneyStep = {
      number: 5,
      title:
        "فحص الجاهزية",
      description:
        "يتحقق النظام من الإسنادات والأحمال والأوقات والقيود قبل تشغيل المحرك.",
      status:
        readiness.canGenerate
          ? "جاهز"
          : "يحتاج مراجعة",
      tone:
        readiness.canGenerate
          ? "complete"
          : assignmentsComplete
            ? "warning"
            : "future",
      metric:
        `جاهزية ${readiness.score}%`,
      hint:
        readiness.errorCount >
        0
          ? `${readiness.errorCount} خطأ يمنع الإنشاء`
          : readiness.warningCount >
              0
            ? `${readiness.warningCount} تحذير`
            : "لا توجد ملاحظات",
      href:
        `${base}/readiness`,
      cta:
        "فتح فحص الجاهزية",
    };

  const generationStep:
    JourneyStep = {
      number: 6,
      title:
        "إنشاء الجدول",
      description:
        "شغّل محرك V2 لإنشاء أفضل نسخة ممكنة من الجدول.",
      status:
        schedule.exists
          ? "تم الإنشاء"
          : readiness.canGenerate
            ? "جاهز"
            : "غير متاح",
      tone:
        schedule.exists
          ? "complete"
          : readiness.canGenerate
            ? "active"
            : "blocked",
      metric:
        schedule.current
          ? `نسخة #${schedule.current.version} • جودة ${schedule.current.score}%`
          : undefined,
      hint:
        !readiness.canGenerate
          ? "عالج أخطاء الجاهزية أولًا."
          : undefined,
      href:
        readiness.canGenerate ||
        schedule.exists
          ? `${base}/generate`
          : undefined,
      cta:
        schedule.exists
          ? "فتح التوليد والنسخ"
          : "إنشاء الجدول",
    };

  const reviewStep:
    JourneyStep = {
      number: 7,
      title:
        "مراجعة الجدول",
      description:
        "راجع الجدول حسب الفصول والمعلمين وانقل أو بدّل الحصص عند الحاجة.",
      status:
        !schedule.exists
          ? "بعد التوليد"
          : schedule.isStale
            ? "نسخة قديمة"
            : "جاهز للمراجعة",
      tone:
        !schedule.exists
          ? "future"
          : schedule.isStale
            ? "warning"
            : "active",
      metric:
        schedule.current
          ? `نسخة #${schedule.current.version} • اكتمال ${schedule.current.completeness}%`
          : undefined,
      href:
        schedule.exists
          ? `${base}/review`
          : undefined,
      cta:
        schedule.exists
          ? "فتح المراجعة"
          : undefined,
    };

  const approvalStep:
    JourneyStep = {
      number: 8,
      title:
        "الاعتماد والنشر",
      description:
        "اعتمد النسخة النهائية ثم انشرها لتصبح الجدول الرسمي للمدرسة.",
      status:
        currentStatus ===
        "PUBLISHED"
          ? "منشور"
          : currentStatus ===
              "APPROVED"
            ? "معتمد"
            : schedule.exists
              ? "بانتظار الاعتماد"
              : "بعد المراجعة",
      tone:
        currentStatus ===
          "PUBLISHED" ||
        currentStatus ===
          "APPROVED"
          ? "complete"
          : schedule.exists
            ? "active"
            : "future",
      href:
        schedule.exists
          ? `${base}/approval`
          : undefined,
      cta:
        schedule.exists
          ? "فتح الاعتماد والنشر"
          : undefined,
    };

  const dailyStep:
    JourneyStep = {
      number: 9,
      title:
        "التشغيل اليومي",
      description:
        "الغياب والبدلاء والمناوبات تعمل على الجدول المنشور دون تعديل النسخة الأساسية.",
      status:
        currentStatus ===
        "PUBLISHED"
          ? "متاح"
          : "بعد النشر",
      tone:
        currentStatus ===
        "PUBLISHED"
          ? "active"
          : "future",
      href:
        currentStatus ===
        "PUBLISHED"
          ? `${base}/daily-operations`
          : undefined,
      cta:
        currentStatus ===
        "PUBLISHED"
          ? "فتح التشغيل اليومي"
          : undefined,
    };

  return (
    <section className="space-y-7">
      <div>
        <p className="text-xs font-black text-sky-700">
          رحلة إنشاء الجدول
        </p>

        <h2 className="mt-1 text-3xl font-black text-slate-950">
          مراحل بناء الجدول
        </h2>

        <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          كل مجموعة تمثل مرحلة مستقلة. أكمل المرحلة الحالية وسيقودك النظام إلى ما بعدها.
        </p>
      </div>

      <Phase
        icon={
          <School className="h-6 w-6" />
        }
        eyebrow="المرحلة الأولى"
        title="إعداد البيانات"
        description="جهز بيانات المشروع والمعلمين والإسنادات والأوقات."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {setupSteps.map(
            (step) => (
              <JourneyCard
                key={
                  step.number
                }
                step={
                  step
                }
              />
            ),
          )}
        </div>
      </Phase>

      <Phase
        icon={
          <Sparkles className="h-6 w-6" />
        }
        eyebrow="المرحلة الثانية"
        title="الجاهزية والتوليد"
        description="تحقق من قابلية المشروع للحل ثم أنشئ النسخة الأولى."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard
            step={
              readinessStep
            }
          />

          <JourneyCard
            step={
              generationStep
            }
          />
        </div>
      </Phase>

      <Phase
        icon={
          <ShieldCheck className="h-6 w-6" />
        }
        eyebrow="المرحلة الثالثة"
        title="المراجعة والنشر"
        description="راجع الجدول واعتمده قبل تحويله إلى جدول رسمي."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard
            step={
              reviewStep
            }
          />

          <JourneyCard
            step={
              approvalStep
            }
          />
        </div>
      </Phase>

      <Phase
        icon={
          <Clock3 className="h-6 w-6" />
        }
        eyebrow="المرحلة الرابعة"
        title="التشغيل اليومي"
        description="مرحلة مستقلة تبدأ بعد نشر الجدول الرسمي."
      >
        <div className="max-w-2xl">
          <JourneyCard
            step={
              dailyStep
            }
          />
        </div>
      </Phase>
    </section>
  );
}