import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSurveyAccess } from "@/lib/surveys/survey-api-access";
import { createSurveyToken } from "@/lib/surveys/survey-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

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

export async function POST(_request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { context: accessContext, survey, error } = await requireSurveyAccess(
    surveyId,
    {
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
    },
  );

  if (error || !survey || !accessContext) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  const token = await createUniqueToken();
  const titleBase = survey.title.replace(/^نسخة من\s+/g, "").trim();
  const copiedTitle = `نسخة من ${titleBase}`.slice(0, 180);

  const copiedSurvey = await prisma.survey.create({
    data: {
      schoolAccountId: accessContext.schoolAccountId,
      serviceId: survey.serviceId,
      createdById: accessContext.user.id,
      ownerRole: survey.ownerRole,
      boardPath: survey.boardPath,
      title: copiedTitle,
      description: survey.description,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      token,
      status: "DRAFT",
      publishedAt: null,
      closedAt: null,
      questions: {
        create: survey.questions.map((question, questionIndex) => ({
          key: `q_${questionIndex + 1}`,
          label: question.label,
          type: question.type,
          helpText: question.helpText,
          isRequired: question.isRequired,
          order: questionIndex + 1,
          scaleMin: question.scaleMin,
          scaleMax: question.scaleMax,
          options: {
            create: question.options.map((option, optionIndex) => ({
              label: option.label,
              value: `option_${optionIndex + 1}`,
              order: optionIndex + 1,
            })),
          },
        })),
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
    message: "تم نسخ الاستبيان كمسودة جديدة.",
    survey: copiedSurvey,
  });
}
