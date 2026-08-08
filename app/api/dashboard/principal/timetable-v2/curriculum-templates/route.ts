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
  createTimetableV2SchoolCurriculumTemplate,
  listTimetableV2SchoolCurriculumTemplates,
} from "@/lib/timetable-v2/custom-curriculum-service";

const createTemplateSchema =
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
  request: Request,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { searchParams } =
    new URL(request.url);

  const gradeId =
    searchParams.get(
      "gradeId",
    );

  try {
    const templates =
      await listTimetableV2SchoolCurriculumTemplates(
        access.schoolAccountId!,
        {
          gradeId:
            gradeId ?? undefined,
        },
      );

    return NextResponse.json(
      {
        success: true,
        templates,
      },
    );
  } catch (error) {
    console.error(
      "Failed to list curriculum templates",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر تحميل الخطط المحفوظة حاليًا.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    createTemplateSchema.safeParse(
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
      await createTimetableV2SchoolCurriculumTemplate(
        access.schoolAccountId!,
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
      {
        status: 201,
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
