import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  getTimetableV2SchoolCurriculumTemplate,
  updateTimetableV2SchoolCurriculumTemplate,
} from "@/lib/timetable-v2/custom-curriculum-service";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

const updateTemplateSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120),

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
  });

function errorMessage(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "UNKNOWN";

  const messages: Record<
    string,
    string
  > = {
    CUSTOM_PLAN_NOT_FOUND:
      "الخطة المحفوظة غير موجودة أو لا تنتمي لمدرستك.",

    CUSTOM_PLAN_NAME_REQUIRED:
      "أدخل اسمًا للخطة الدراسية المخصصة.",

    CUSTOM_PLAN_NAME_TOO_LONG:
      "اسم الخطة الدراسية المخصصة طويل جدًا.",

    CUSTOM_PLAN_EMPTY:
      "يجب اختيار مادة واحدة على الأقل في الخطة المخصصة.",

    CUSTOM_PLAN_TOO_MANY_SUBJECTS:
      "لا يمكن إضافة أكثر من 60 مادة في الخطة المخصصة.",

    CUSTOM_PLAN_INVALID:
      "بيانات الخطة المخصصة غير صالحة.",
  };

  const customCode =
    code.startsWith(
      "CUSTOM_PLAN_INVALID:",
    );

  return customCode
    ? code.slice(
        "CUSTOM_PLAN_INVALID:"
          .length,
      )
    : messages[code] ??
        "تعذر حفظ الخطة حاليًا.";
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { templateId } =
    await context.params;

  try {
    const template =
      await getTimetableV2SchoolCurriculumTemplate(
        access.schoolAccountId!,
        templateId,
      );

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error:
            "الخطة المحفوظة غير موجودة أو لا تنتمي لمدرستك.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        template,
      },
    );
  } catch (error) {
    console.error(
      "Failed to get curriculum template",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر تحميل الخطة المحفوظة حاليًا.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { templateId } =
    await context.params;

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    updateTemplateSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "بيانات الخطة المخصصة غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const template =
      await updateTimetableV2SchoolCurriculumTemplate(
        access.schoolAccountId!,
        templateId,
        {
          name: parsed.data.name,

          stageId:
            parsed.data.stageId ??
            null,

          gradeId:
            parsed.data.gradeId ??
            null,

          semesterId:
            parsed.data.semesterId ??
            null,

          items: parsed.data.items,
        },
      );

    return NextResponse.json(
      {
        success: true,
        template,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          errorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
