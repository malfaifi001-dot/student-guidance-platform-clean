import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { SURVEY_SERVICE_SLUG } from "@/lib/surveys/survey-config";
import { createSurveyToken } from "@/lib/surveys/survey-service";
import { getSurveyTemplateByKey, surveyTemplates } from "@/lib/surveys/survey-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedOwnerRoles = new Set(["ADMIN", "COUNSELOR", "ACTIVITY_LEADER"]);

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
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      },
    );
  }

  if (!current.user.schoolAccountId) {
    return NextResponse.json(
      {
        error: "حسابك غير مرتبط بمدرسة.",
      },
      {
        status: 403,
      },
    );
  }

  if (current.user.role !== "ADMIN") {
    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId);

    if (!overview.usable) {
      return NextResponse.json(
        {
          error: "حسابك يحتاج تفعيلًا للاستمرار.",
        },
        {
          status: 402,
        },
      );
    }
  }

  const payload = await request.json().catch(() => null);
  const templateKey = String(payload?.templateKey || "").trim();
  const requestedOwnerRole = String(payload?.ownerRole || current.user.role).trim();
  const requestedBoardPath = String(payload?.boardPath || "").trim();

  if (!allowedOwnerRoles.has(requestedOwnerRole)) {
    return NextResponse.json(
      {
        error: "نوع لوحة الاستبيان غير صحيح.",
      },
      {
        status: 400,
      },
    );
  }

  const ownerRole =
    current.user.role === "ADMIN"
      ? requestedOwnerRole
      : current.user.role === "ACTIVITY_LEADER"
        ? "ACTIVITY_LEADER"
        : "COUNSELOR";

  const template = getSurveyTemplateByKey(templateKey);

  if (!template) {
    return NextResponse.json(
      {
        error: "قالب الاستبيان غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  const token = await createUniqueToken();

  const service = await prisma.service.findFirst({
    where: {
      slug: SURVEY_SERVICE_SLUG,
    },
    select: {
      id: true,
    },
  });

  const survey = await prisma.survey.create({
    data: {
      schoolAccountId: current.user.schoolAccountId,
      ...(service?.id ? { serviceId: service.id } : {}),
      createdById: current.user.id,
      ownerRole,
      boardPath: requestedBoardPath || null,
      title: template.title,
      description: template.description,
      audienceType: template.audienceType,
      isAnonymous: template.isAnonymous,
      token,
      status: "DRAFT",
      publishedAt: null,
      closedAt: null,
      questions: {
        create: template.questions.map((question, questionIndex) => ({
          key: `q_${questionIndex + 1}`,
          label: question.label,
          type: question.type,
          helpText: null,
          isRequired: Boolean(question.isRequired),
          order: questionIndex + 1,
          scaleMin: question.scaleMin || null,
          scaleMax: question.scaleMax || null,
          options: {
            create: (question.options || []).map((option, optionIndex) => ({
              label: option,
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
    message: "تم إنشاء استبيان من القالب كمسودة.",
    survey,
  });
}