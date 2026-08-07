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
  approveTimetableV2Schedule,
  publishTimetableV2Schedule,
} from "@/lib/timetable-v2/generation/generation-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

const actionSchema =
  z.object({
    action:
      z.enum([
        "APPROVE",
        "PUBLISH",
      ]),

    scheduleId:
      z.string()
        .min(1),
  });

function mapError(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "";

  if (
    code ===
    "PROJECT_NOT_FOUND"
  ) {
    return {
      status: 404,
      message:
        "مشروع الجدول غير موجود.",
    };
  }

  if (
    code ===
    "SCHEDULE_NOT_FOUND"
  ) {
    return {
      status: 404,
      message:
        "نسخة الجدول غير موجودة.",
    };
  }

  if (
    code ===
    "SCHEDULE_STALE"
  ) {
    return {
      status: 409,
      message:
        "هذه النسخة قديمة لأن الإسنادات أو القيود أو أوقات المشروع تغيرت بعدها. أنشئ نسخة حديثة قبل الاعتماد.",
    };
  }

  if (
    code ===
    "SCHEDULE_VALIDATION_FAILED"
  ) {
    return {
      status: 409,
      message:
        "لا يمكن اعتماد نسخة غير مكتملة أو تحتوي مخالفات إلزامية.",
    };
  }

  if (
    code ===
    "SCHEDULE_RUNTIME_VALIDATION_FAILED"
  ) {
    return {
      status: 409,
      message:
        "فشل الفحص النهائي للنسخة. يوجد تعديل يدوي يخالف أحد القيود الإلزامية أو بنية الجدول.",
    };
  }

  if (
    code ===
    "SCHEDULE_BLOCK_METADATA_REQUIRED"
  ) {
    return {
      status: 409,
      message:
        "هذه نسخة مراجعة قديمة ولا تحتوي بيانات كتل الحصص المزدوجة كاملة. أنشئ نسخة مراجعة جديدة قبل الاعتماد.",
    };
  }

  if (
    code ===
    "SCHEDULE_NOT_APPROVED"
  ) {
    return {
      status: 409,
      message:
        "يجب اعتماد النسخة أولًا قبل نشرها.",
    };
  }

  return {
    status: 500,
    message:
      "تعذر تنفيذ الاعتماد أو النشر حاليًا.",
  };
}

export async function POST(
  request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } =
    await context.params;

  const body =
    await request
      .json()
      .catch(
        () =>
          null,
      );

  const parsed =
    actionSchema.safeParse(
      body,
    );

  if (
    !parsed.success
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "بيانات العملية غير صحيحة.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const result =
      parsed.data.action ===
        "APPROVE"
        ? await approveTimetableV2Schedule(
            projectId,
            parsed.data.scheduleId,
            access.schoolAccountId!,
          )
        : await publishTimetableV2Schedule(
            projectId,
            parsed.data.scheduleId,
            access.schoolAccountId!,
          );

    return NextResponse.json({
      success:
        true,

      schedule: {
        id:
          result.id,

        version:
          result.version,

        status:
          result.status,

        isCurrent:
          result.isCurrent,
      },

      message:
        parsed.data.action ===
          "APPROVE"
          ? `تم اعتماد النسخة #${result.version} بنجاح.`
          : `تم نشر النسخة #${result.version} وأصبحت الجدول التشغيلي الرسمي.`,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_APPROVAL_ACTION_FAILED",
      {
        projectId,
        action:
          parsed.data.action,
        scheduleId:
          parsed.data.scheduleId,
        error,
      },
    );

    const mapped =
      mapError(
        error,
      );

    return NextResponse.json(
      {
        success:
          false,

        error:
          mapped.message,
      },
      {
        status:
          mapped.status,
      },
    );
  }
}