import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSurveyAvailability, normalizePhone } from "@/lib/surveys/survey-service";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function normalizeAnswerValue(value: unknown): {
  value: string;
  jsonValue?: Prisma.InputJsonValue;
  isEmpty: boolean;
} {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item || "").trim()).filter(Boolean);

    return {
      value: items.join("، "),
      jsonValue: items,
      isEmpty: items.length === 0,
    };
  }

  const text = String(value ?? "").trim();

  return {
    value: text,
    isEmpty: !text,
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const payload = await request.json().catch(() => null);

  const survey = await prisma.survey.findUnique({
    where: {
      token,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!survey) {
    return NextResponse.json(
      {
        error: "الاستبيان غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  const availability = getSurveyAvailability(survey);

  if (!availability.isOpen) {
    return NextResponse.json(
      {
        error: availability.reason || "الاستبيان غير متاح لاستقبال الردود حاليًا.",
      },
      {
        status: 400,
      },
    );
  }

  const respondentName = String(payload?.respondentName || "").trim();
  const respondentPhone = normalizePhone(payload?.respondentPhone);
  const submissionKey = String(payload?.submissionKey || "").trim();

  if (submissionKey && !/^[a-zA-Z0-9-]{20,100}$/.test(submissionKey)) {
    return NextResponse.json(
      { error: "معرّف إرسال الاستجابة غير صالح." },
      { status: 400 },
    );
  }

  if (!survey.isAnonymous && !respondentName) {
    return NextResponse.json(
      {
        error: "الاسم مطلوب لإرسال هذا الاستبيان.",
      },
      {
        status: 400,
      },
    );
  }

  if (!survey.isAnonymous && !respondentPhone) {
    return NextResponse.json(
      {
        error: "رقم الجوال مطلوب لإرسال هذا الاستبيان.",
      },
      {
        status: 400,
      },
    );
  }

  const answersPayload =
    payload?.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
      ? payload.answers
      : {};

  for (const question of survey.questions) {
    if (!question.isRequired) continue;

    const normalized = normalizeAnswerValue((answersPayload as Record<string, unknown>)[question.id]);

    if (normalized.isEmpty) {
      return NextResponse.json(
        {
          error: `السؤال "${question.label}" مطلوب.`,
        },
        {
          status: 400,
        },
      );
    }
  }

  const answerRows: Prisma.SurveyAnswerCreateWithoutResponseInput[] = [];

  for (const question of survey.questions) {
    const normalized = normalizeAnswerValue((answersPayload as Record<string, unknown>)[question.id]);

    if (normalized.isEmpty) {
      continue;
    }

    const answerData: Prisma.SurveyAnswerCreateWithoutResponseInput = {
      question: {
        connect: {
          id: question.id,
        },
      },
      value: normalized.value,
    };

    if (normalized.jsonValue !== undefined) {
      answerData.jsonValue = normalized.jsonValue;
    }

    answerRows.push(answerData);
  }

  if (submissionKey) {
    const existingResponse = await prisma.surveyResponse.findFirst({
      where: {
        surveyId: survey.id,
        metadata: {
          path: "$.submissionKey",
          equals: submissionKey,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingResponse) {
      return NextResponse.json({
        ok: true,
        message: "تم إرسال الاستجابة بنجاح، شكرًا لتعاونك.",
        responseId: existingResponse.id,
      });
    }
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      schoolAccountId: survey.schoolAccountId,
      respondentType: String(payload?.respondentType || survey.audienceType || "GENERAL").trim(),
      respondentName: survey.isAnonymous ? null : respondentName,
      respondentPhone: survey.isAnonymous ? null : respondentPhone,
      metadata: submissionKey ? { submissionKey } : undefined,
      answers: {
        create: answerRows,
      },
    },
  });

  return NextResponse.json(
    {
      ok: true,
      message: "تم إرسال الاستجابة بنجاح، شكرًا لتعاونك.",
      responseId: response.id,
    },
    { status: 201 },
  );
}
