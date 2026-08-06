import { NextResponse } from "next/server";

import {
  timetableAiAnalysisRequestSchema,
} from "@/lib/timetable/ai/timetable-ai-analysis-schema";
import { analyzeTimetableWithAi } from "@/lib/timetable/ai/timetable-ai-analysis-service";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const body =
    await request.json().catch(() => null);

  const parsed =
    timetableAiAnalysisRequestSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "طلب التحليل غير صالح.",
      },
      {
        status: 400,
      },
    );
  }

  const { projectId } =
    await context.params;

  try {
    const result =
      await analyzeTimetableWithAi(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

    if (!result.found) {
      return NextResponse.json(
        {
          success: false,
          error:
            "مشروع الجدول غير موجود.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error(
      "TIMETABLE_AI_ANALYSIS_FAILED",
      {
        projectId,
        error,
      },
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "DEEPSEEK_API_KEY is missing."
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "مفتاح DeepSeek غير مضبوط على الخادم.",
        },
        {
          status: 503,
        },
      );
    }

    if (
      message === "AI_RESPONSE_INVALID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "وصل رد غير منظم من المساعد الذكي. أعد المحاولة.",
        },
        {
          status: 502,
        },
      );
    }

    if (
      message.startsWith(
        "DeepSeek request failed",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر الاتصال بخدمة التحليل الذكي حاليًا.",
        },
        {
          status: 502,
        },
      );
    }

    if (message === "DEEPSEEK_NETWORK_ERROR") {
      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر الاتصال بخدمة التحليل الذكي. تحقق من اتصال الخادم ثم أعد المحاولة.",
        },
        {
          status: 502,
        },
      );
    }

    if (message === "DEEPSEEK_TIMEOUT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "استغرق التحليل وقتًا أطول من المتوقع. أعد المحاولة.",
        },
        {
          status: 504,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر إكمال تحليل الجدول حاليًا.",
      },
      {
        status: 500,
      },
    );
  }
}
