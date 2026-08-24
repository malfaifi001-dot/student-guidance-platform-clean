import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSurveyServiceContext } from "@/lib/surveys/survey-api-access";
import {
  surveyQuestionInputSchema,
  surveyTemplateCreatePayloadSchema,
} from "@/lib/surveys/survey-api-schemas";
import {
  prepareSurveyQuestionForPersistence,
  SURVEY_SERVICE_SLUG,
} from "@/lib/surveys/survey-config";
import { createSurveyToken } from "@/lib/surveys/survey-service";

function surveyOptionLabel(option: string | { label: string }) {
  return typeof option === "string" ? option : option.label;
}
import {
  getSurveyTemplateByKey,
  surveyTemplates,
} from "@/lib/surveys/survey-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createUniqueToken() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const token = createSurveyToken();

    const existing = await prisma.survey.findUnique({
      where: {
        token,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return token;
    }
  }

  throw new Error("تعذر إنشاء رابط فريد للاستبيان.");
}

export async function GET() {
  return NextResponse.json({
    templates: surveyTemplates,
  });
}

export async function POST(request: NextRequest) {
  const { context, error } = await requireSurveyServiceContext();

  if (error || !context) {
    return error ?? NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  if (!context.schoolAccountId) {
    return NextResponse.json(
      {
        error: "حسابك غير مرتبط بمدرسة.",
      },
      { status: 403 },
    );
  }

  const rawPayload = await request.json().catch(() => null);
  const payloadResult = surveyTemplateCreatePayloadSchema.safeParse(rawPayload);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error:
          payloadResult.error.issues[0]?.message ||
          "بيانات قالب الاستبيان غير صالحة.",
      },
      { status: 400 },
    );
  }

  const payload = payloadResult.data;
  const ownerRole =
    context.user.role === "ADMIN"
      ? payload.ownerRole ?? context.user.role
      : context.user.role === "ACTIVITY_LEADER"
        ? "ACTIVITY_LEADER"
        : context.user.role === "TEACHER"
          ? "TEACHER"
          : "COUNSELOR";

  const template = getSurveyTemplateByKey(payload.templateKey);

  if (!template) {
    return NextResponse.json(
      {
        error: "قالب الاستبيان غير موجود.",
      },
      { status: 404 },
    );
  }

  const templateQuestionsResult = surveyQuestionInputSchema
    .array()
    .length(29)
    .safeParse(template.questions);

  if (!templateQuestionsResult.success) {
    return NextResponse.json(
      {
        error:
          templateQuestionsResult.error.issues[0]?.message ||
          "أسئلة قالب الاستبيان غير صالحة.",
      },
      { status: 500 },
    );
  }

  const token = await createUniqueToken();
  const boardPath = payload.boardPath || "/dashboard/surveys";

  const service = await prisma.service.findFirst({
    where: {
      slug: SURVEY_SERVICE_SLUG,
    },
    select: {
      id: true,
    },
  });

  try {
    const survey = await prisma.survey.create({
      data: {
        schoolAccountId: context.schoolAccountId,
        ...(service?.id ? { serviceId: service.id } : {}),
        createdById: context.user.id,
        ownerRole,
        boardPath,
        title: template.title,
        description: template.description,
        audienceType: template.audienceType,
        isAnonymous: template.isAnonymous,
        token,
        status: "DRAFT",
        publishedAt: null,
        closedAt: null,
        questions: {
          create: templateQuestionsResult.data.map((question, questionIndex) => {
            const persistedQuestion = prepareSurveyQuestionForPersistence(question);

            return {
              key: `q_${questionIndex + 1}`,
              label: persistedQuestion.label,
              type: question.type,
              helpText: persistedQuestion.helpText,
              isRequired: question.isRequired,
              order: questionIndex + 1,
              scaleMin: question.scaleMin ?? null,
              scaleMax: question.scaleMax ?? null,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  label: surveyOptionLabel(option),
                  value: `option_${optionIndex + 1}`,
                  order: optionIndex + 1,
                })),
              },
            };
          }),
        },
      },
      include: {
        _count: {
          select: {
            questions: true,
            responses: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "تم إنشاء استبيان من القالب كمسودة.",
      survey,
    });
  } catch (createError) {
    const errorMessage =
      createError instanceof Prisma.PrismaClientKnownRequestError &&
      createError.code === "P2000"
        ? "تعذر إنشاء المسودة لأن نص أحد الأسئلة يتجاوز سعة التخزين."
        : createError instanceof Error
          ? `تعذر إنشاء المسودة: ${createError.message}`
          : "تعذر إنشاء المسودة بسبب خطأ غير متوقع.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
