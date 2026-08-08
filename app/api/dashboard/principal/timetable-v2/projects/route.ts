import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  logPlatformActivity,
} from "@/lib/admin/activity-log";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  createTimetableV2Project,
} from "@/lib/timetable-v2/project-persistence";

const requestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120),

  academicYear: z
    .string()
    .trim()
    .min(1)
    .max(40),

  semester: z.enum([
    "FIRST",
    "SECOND",
  ]),

  stageIds: z
    .array(
      z.enum([
        "ELEMENTARY",
        "MIDDLE",
        "HIGH",
      ]),
    )
    .min(1)
    .max(3),

  teacherCount: z
    .number()
    .int()
    .min(1)
    .max(500),

  weeklyPeriodTarget: z
    .number()
    .int()
    .min(1)
    .max(100)
    .nullable()
    .optional(),

  studyDays: z
    .array(
      z.enum([
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
      ]),
    )
    .min(1)
    .max(5),

  periodsPerDay: z
    .number()
    .int()
    .min(1)
    .max(12),

  classes: z
    .array(
      z.object({
        gradeId: z
          .string()
          .min(1),

        sectionIndex: z
          .number()
          .int()
          .min(0),

        sectionName: z
          .string()
          .trim()
          .min(1)
          .max(30),

        planSourceId: z
          .string()
          .max(120),

        customPlan: z
          .object({
            name: z
              .string()
              .trim()
              .max(120)
              .optional(),

            templateId: z
              .string()
              .trim()
              .max(120)
              .nullable()
              .optional(),

            stageId: z
              .enum([
                "ELEMENTARY",
                "MIDDLE",
                "HIGH",
              ])
              .nullable()
              .optional(),

            gradeId: z
              .string()
              .max(40)
              .nullable()
              .optional(),

            semesterId: z
              .enum([
                "FIRST",
                "SECOND",
              ])
              .nullable()
              .optional(),

            saveForFuture: z
              .boolean()
              .optional(),

            items: z
              .array(
                z.object({
                  subjectName: z
                    .string()
                    .trim()
                    .min(1)
                    .max(120),

                  weeklyLessons: z
                    .number()
                    .int()
                    .min(1)
                    .max(60),

                  singlePeriods: z
                    .number()
                    .int()
                    .min(0)
                    .max(60),

                  doublePeriods: z
                    .number()
                    .int()
                    .min(0)
                    .max(30),
                }),
              )
              .min(1)
              .max(60),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(
  request: Request,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription: true,
    });

  if (!access.ok) {
    return access.response;
  }

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    requestSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]
            ?.message ||
          "بيانات المشروع غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const project =
      await createTimetableV2Project(
        access.schoolAccountId!,
        access.user.id,
        parsed.data,
      );

    try {
      await logPlatformActivity({
        actorUserId:
          access.user.id,

        schoolAccountId:
          access.schoolAccountId,

        category:
          "TIMETABLE",

        action:
          "timetable-v2-project-created",

        title:
          "تم إنشاء مشروع جدول دراسي جديد",

        details: {
          projectId:
            project.id,

          classesCount:
            project.classes.length,

          teachersCount:
            project.teachers.length,

          subjectsCount:
            project.subjects.length,
        },
      });
    } catch (logError) {
      console.error(
        "Failed to log timetable v2 project creation",
        logError,
      );
    }

    return NextResponse.json(
      {
        success: true,

        project: {
          id:
            project.id,

          name:
            project.name,

          classesCount:
            project.classes.length,

          teachersCount:
            project.teachers.length,

          subjectsCount:
            project.subjects.length,

          classSubjectsCount:
            project.classSubjects.length,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Failed to create timetable v2 project",
      error,
    );

    const code =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const messages: Record<
      string,
      string
    > = {
      PROJECT_NAME_REQUIRED:
        "اسم المشروع مطلوب.",

      ACADEMIC_YEAR_REQUIRED:
        "العام الدراسي مطلوب.",

      STAGES_REQUIRED:
        "اختر مرحلة دراسية واحدة على الأقل.",

      INVALID_TEACHER_COUNT:
        "عدد المعلمين غير صالح.",

      INVALID_PERIOD_COUNT:
        "عدد الحصص اليومية غير صالح.",

      STUDY_DAYS_REQUIRED:
        "اختر أيام الدراسة.",

      CLASSES_REQUIRED:
        "يجب إضافة فصل واحد على الأقل.",

      INVALID_GRADE:
        "يوجد صف غير صالح.",

      GRADE_STAGE_MISMATCH:
        "يوجد صف لا يتبع المراحل المختارة.",

      SECTION_NAME_REQUIRED:
        "اسم الفصل مطلوب.",

      DUPLICATE_CLASS_NAME:
        "يوجد اسم فصل مكرر.",

      CURRICULUM_PLAN_NOT_FOUND:
        "إحدى الخطط الدراسية غير موجودة.",

      CURRICULUM_GRADE_MISMATCH:
        "إحدى الخطط لا تتبع الصف المحدد.",

      CURRICULUM_SEMESTER_MISMATCH:
        "إحدى خطط المرحلة الثانوية لا تتبع الفصل الدراسي المحدد.",

      CUSTOM_PLAN_NAME_REQUIRED:
        "أدخل اسمًا للخطة الدراسية المخصصة لحفظها.",

      CUSTOM_PLAN_NAME_TOO_LONG:
        "اسم الخطة الدراسية المخصصة طويل جدًا.",

      CUSTOM_PLAN_EMPTY:
        "يجب اختيار مادة واحدة على الأقل في الخطة المخصصة.",

      CUSTOM_PLAN_TOO_MANY_SUBJECTS:
        "لا يمكن إضافة أكثر من 60 مادة في الخطة المخصصة.",

      CUSTOM_PLAN_INVALID:
        "بيانات الخطة المخصصة غير صالحة.",

      CUSTOM_PLAN_NOT_FOUND:
        "الخطة المحفوظة غير موجودة أو لا تنتمي لمدرستك.",

      CUSTOM_PLAN_GRADE_MISMATCH:
        "الخطة المحفوظة لا تتبع الصف المحدد.",

      CUSTOM_PLAN_SEMESTER_MISMATCH:
        "الخطة المحفوظة لا تتبع الفصل الدراسي المحدد.",

      SUBJECT_NAME_REQUIRED:
        "أدخل اسم المادة.",

      SUBJECT_NAME_TOO_LONG:
        "اسم المادة طويل جدًا.",
    };

    return NextResponse.json(
      {
        success: false,
        error:
          messages[code] ||
          "تعذر إنشاء مشروع الجدول حاليًا.",
      },
      {
        status: 400,
      },
    );
  }
}