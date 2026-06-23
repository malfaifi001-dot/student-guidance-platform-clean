import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSurveyAccess } from "@/lib/surveys/survey-api-access";
import {
  surveyActionSchema,
  surveyStateActionPayloadSchema,
  surveyUpdateDraftPayloadSchema,
} from "@/lib/surveys/survey-api-schemas";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId, {
    questions: {
      orderBy: {
        order: "asc",
      },
      include: {
        options: {
          orderBy: {
            order: "asc",
          },
        },
      },
    },
    _count: {
      select: {
        responses: true,
      },
    },
  });

  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const rawPayload = await request.json().catch(() => null);
  const actionResult = surveyActionSchema.safeParse(rawPayload?.action);

  if (!actionResult.success) {
    return NextResponse.json(
      { error: "إجراء غير معروف." },
      { status: 400 },
    );
  }

  const { survey, error } = await requireSurveyAccess(surveyId, {
    questions: {
      orderBy: {
        order: "asc",
      },
      include: {
        options: {
          orderBy: {
            order: "asc",
          },
        },
      },
    },
    _count: {
      select: {
        responses: true,
      },
    },
  });

  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  const action = actionResult.data;

  if (action === "update-draft") {
    if (survey.status !== "DRAFT") {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل الاستبيان بعد النشر. يمكنك نسخه وإنشاء نسخة جديدة.",
        },
        { status: 400 },
      );
    }

    if (survey._count.responses > 0) {
      return NextResponse.json(
        {
          error: "لا يمكن تعديل استبيان لديه ردود محفوظة.",
        },
        { status: 400 },
      );
    }

    const payloadResult = surveyUpdateDraftPayloadSchema.safeParse(rawPayload);

    if (!payloadResult.success) {
      return NextResponse.json(
        {
          error:
            payloadResult.error.issues[0]?.message ||
            "بيانات تحديث الاستبيان غير صالحة.",
        },
        { status: 400 },
      );
    }

    const payload = payloadResult.data;
    const opensAt = parseOptionalDate(payload.opensAt);
    const endsAt = parseOptionalDate(payload.endsAt);

    if (payload.opensAt && !opensAt) {
      return NextResponse.json(
        { error: "تاريخ بداية الاستقبال غير صالح." },
        { status: 400 },
      );
    }

    if (payload.endsAt && !endsAt) {
      return NextResponse.json(
        { error: "تاريخ نهاية الاستقبال غير صالح." },
        { status: 400 },
      );
    }

    if (opensAt && endsAt && endsAt.getTime() < opensAt.getTime()) {
      return NextResponse.json(
        { error: "تاريخ نهاية الاستقبال يجب أن يكون بعد تاريخ البداية." },
        { status: 400 },
      );
    }

    const updatedSurvey = await prisma.$transaction(async (tx) => {
      const existingQuestions = await tx.surveyQuestion.findMany({
        where: {
          surveyId: survey.id,
        },
        select: {
          id: true,
        },
      });

      const existingQuestionIds = existingQuestions.map((question) => question.id);

      if (existingQuestionIds.length) {
        await tx.surveyOption.deleteMany({
          where: {
            questionId: {
              in: existingQuestionIds,
            },
          },
        });

        await tx.surveyQuestion.deleteMany({
          where: {
            surveyId: survey.id,
          },
        });
      }

      return tx.survey.update({
        where: {
          id: survey.id,
        },
        data: {
          title: payload.title,
          description: payload.description,
          audienceType: payload.audienceType,
          isAnonymous: payload.isAnonymous,
          opensAt,
          endsAt,
          questions: {
            create: payload.questions.map((question, index) => ({
              key: `q_${index + 1}`,
              label: question.label,
              type: question.type,
              helpText: question.helpText,
              isRequired: question.isRequired,
              order: index + 1,
              scaleMin: question.scaleMin ?? null,
              scaleMax: question.scaleMax ?? null,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  label: option,
                  value: `option_${optionIndex + 1}`,
                  order: optionIndex + 1,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          _count: {
            select: {
              questions: true,
              responses: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: "تم تحديث مسودة الاستبيان.",
      survey: updatedSurvey,
    });
  }

  const stateActionResult = surveyStateActionPayloadSchema.safeParse(rawPayload);

  if (!stateActionResult.success) {
    return NextResponse.json(
      { error: "إجراء غير معروف." },
      { status: 400 },
    );
  }

  if (action === "publish") {
    const updated = await prisma.survey.update({
      where: {
        id: survey.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: survey.publishedAt || new Date(),
        closedAt: null,
      },
    });

    return NextResponse.json({
      message: "تم نشر الاستبيان.",
      survey: updated,
    });
  }

  if (action === "close") {
    const updated = await prisma.survey.update({
      where: {
        id: survey.id,
      },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "تم إغلاق الاستبيان.",
      survey: updated,
    });
  }

  const updated = await prisma.survey.update({
    where: {
      id: survey.id,
    },
    data: {
      status: "ARCHIVED",
    },
  });

  return NextResponse.json({
    message: "تم أرشفة الاستبيان.",
    survey: updated,
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId, {
    _count: {
      select: {
        responses: true,
      },
    },
  });

  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  if (survey.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: "يمكن حذف المسودات فقط. أغلق الاستبيان أو أرشفه بدل الحذف.",
      },
      { status: 400 },
    );
  }

  await prisma.survey.delete({
    where: {
      id: survey.id,
    },
  });

  return NextResponse.json({
    message: "تم حذف مسودة الاستبيان.",
  });
}
