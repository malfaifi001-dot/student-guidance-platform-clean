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
  addTimetableV2SchoolSubject,
  listTimetableV2SubjectBank,
} from "@/lib/timetable-v2/custom-curriculum-service";

const addSubjectSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120),
  });

export async function GET() {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  try {
    const bank =
      await listTimetableV2SubjectBank(
        access.schoolAccountId!,
      );

    return NextResponse.json(
      {
        success: true,
        subjects: bank.subjects,
      },
    );
  } catch (error) {
    console.error(
      "Failed to list subject bank",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر تحميل بنك المواد حاليًا.",
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
    addSubjectSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "اسم المادة مطلوب ويجب ألا يتجاوز 120 حرفًا.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const entry =
      await addTimetableV2SchoolSubject(
        access.schoolAccountId!,
        parsed.data.name,
      );

    return NextResponse.json(
      {
        success: true,
        subject: entry,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const messages: Record<
      string,
      string
    > = {
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
          "تعذر إضافة المادة حاليًا.",
      },
      {
        status: 400,
      },
    );
  }
}
