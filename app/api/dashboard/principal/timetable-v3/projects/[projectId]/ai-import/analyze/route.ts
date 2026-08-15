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
  getTimetableV3SetupWorkspace,
} from "@/lib/timetable-v3/project-setup-service";

import {
  analyzeTimetableV3ImportText,
} from "@/lib/timetable-v3/ai-import/ai-import-service";

const requestSchema =
  z.object({
    sourceText:
      z.string()
        .trim()
        .min(1)
        .max(40_000),
  });

export async function POST(
  request: Request,
  context: {
    params:
      Promise<{
        projectId: string;
      }>;
  },
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  if (!access.schoolAccountId) {
    return NextResponse.json(
      {
        ok: false,
        code: "SCHOOL_ACCOUNT_REQUIRED",
        error: "تعذر تحديد حساب المدرسة.",
      },
      {
        status: 403,
      },
    );
  }

  const {
    projectId,
  } = await context.params;

  try {
    await getTimetableV3SetupWorkspace(
      projectId,
      access.schoolAccountId,
    );
  }
  catch {
    return NextResponse.json(
      {
        ok: false,
        code: "PROJECT_NOT_FOUND",
        error: "تعذر العثور على مشروع الجدول.",
      },
      {
        status: 404,
      },
    );
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
        ok: false,
        code: "INVALID_REQUEST",
        error: "أدخل بيانات الجدول المراد تحليلها.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const result =
      await analyzeTimetableV3ImportText(
        parsed.data.sourceText,
      );

    return NextResponse.json({
      ok: true,
      projectId,
      sourceType: "TEXT",
      result,
      persistence: {
        saved: false,
        requiresApproval: true,
      },
    });
  }
  catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "DEEPSEEK_TIMEOUT") {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_TIMEOUT",
          error: "استغرق التحليل وقتًا أطول من المتوقع. أعد المحاولة.",
        },
        {
          status: 504,
        },
      );
    }

    if (message === "DEEPSEEK_NETWORK_ERROR") {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_UNAVAILABLE",
          error: "تعذر الاتصال بخدمة التحليل الذكي حاليًا.",
        },
        {
          status: 503,
        },
      );
    }

    if (
      message === "AI_IMPORT_SOURCE_REQUIRED" ||
      message === "AI_IMPORT_SOURCE_TOO_LARGE"
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: message,
          error:
            message === "AI_IMPORT_SOURCE_TOO_LARGE"
              ? "حجم النص أكبر من الحد المسموح."
              : "أدخل بيانات الجدول المراد تحليلها.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      message === "AI_IMPORT_INVALID_JSON" ||
      message === "AI_IMPORT_INVALID_RESPONSE"
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_INVALID_RESPONSE",
          error: "تعذر تنظيم البيانات المستخرجة. أعد المحاولة.",
        },
        {
          status: 422,
        },
      );
    }

    console.error(
      "TIMETABLE_V3_AI_IMPORT_ANALYZE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        code: "AI_IMPORT_FAILED",
        error: "تعذر تحليل بيانات الجدول حاليًا.",
      },
      {
        status: 500,
      },
    );
  }
}
