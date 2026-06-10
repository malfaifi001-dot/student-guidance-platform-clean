import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
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

async function requireDuplicateAccess(surveyId: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        {
          error: "يجب تسجيل الدخول أولًا.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json(
          {
            error: "حسابك غير مرتبط بمدرسة.",
          },
          {
            status: 403,
          },
        ),
      };
    }

    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId);

    if (!overview.usable) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json(
          {
            error: "حسابك يحتاج تفعيلًا للاستمرار.",
          },
          {
            status: 402,
          },
        ),
      };
    }
  }

  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
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
    },
  });

  if (!survey) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        {
          error: "الاستبيان غير موجود.",
        },
        {
          status: 404,
        },
      ),
    };
  }

  if (current.user.role !== "ADMIN" && survey.schoolAccountId !== current.user.schoolAccountId) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        {
          error: "لا تملك صلاحية نسخ هذا الاستبيان.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    current,
    survey,
    error: null,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { current, survey, error } = await requireDuplicateAccess(surveyId);

  if (error) return error;

  const token = await createUniqueToken();

  const titleBase = survey!.title.replace(/^نسخة من\s+/g, "").trim();
  const copiedTitle = `نسخة من ${titleBase}`.slice(0, 180);

  const copiedSurvey = await prisma.survey.create({
    data: {
      schoolAccountId: survey!.schoolAccountId,
      serviceId: survey!.serviceId,
      createdById: current!.user.id,
      ownerRole: survey!.ownerRole,
      boardPath: survey!.boardPath,
      title: copiedTitle,
      description: survey!.description,
      audienceType: survey!.audienceType,
      isAnonymous: survey!.isAnonymous,
      token,
      status: "DRAFT",
      publishedAt: null,
      closedAt: null,
      questions: {
        create: survey!.questions.map((question, questionIndex) => ({
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