import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSurveyServiceContext } from "@/lib/surveys/survey-api-access";
import {
  surveyCreatePayloadSchema,
} from "@/lib/surveys/survey-api-schemas";
import { createSurveyToken } from "@/lib/surveys/survey-service";

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function surveyOptionLabel(option: string | { label: string }) {
  return typeof option === "string" ? option : option.label;
}

export async function GET(request: NextRequest) {
  const { context, error } = await requireSurveyServiceContext();

  if (error || !context) {
    return error ?? NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const ownerRole = searchParams.get("ownerRole");
  const boardPath = searchParams.get("boardPath");

  const where: Record<string, unknown> = {};

  if (!context.isAdmin) {
    where.createdById = context.user.id;
  }

  if (ownerRole && context.isAdmin) {
    where.ownerRole = ownerRole;
  }

  if (boardPath) {
    where.boardPath = boardPath;
  }

  const surveys = await prisma.survey.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      service: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
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
      responses: {
        select: {
          id: true,
          submittedAt: true,
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 5,
      },
      _count: {
        select: {
          questions: true,
          responses: true,
        },
      },
    },
  });

  return NextResponse.json({ surveys });
}

export async function POST(request: NextRequest) {
  const { context, error } = await requireSurveyServiceContext();

  if (error || !context) {
    return error ?? NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  if (!context.schoolAccountId) {
    return NextResponse.json(
      {
        error:
          "إنشاء الاستبيانات يحتاج حساب مدرسة مرتبط. يمكن لاحقًا إضافة استبيانات منصة عامة للأدمن.",
      },
      { status: 400 },
    );
  }

  const rawPayload = await request.json().catch(() => null);
  const payloadResult = surveyCreatePayloadSchema.safeParse(rawPayload);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error: payloadResult.error.issues[0]?.message || "بيانات الاستبيان غير صالحة.",
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
      {
        error: "تاريخ نهاية الاستقبال يجب أن يكون بعد تاريخ البداية.",
      },
      { status: 400 },
    );
  }

  const ownerRole = payload.ownerRole ?? context.user.role;

  const survey = await prisma.survey.create({
    data: {
      schoolAccountId: context.schoolAccountId,
      createdById: context.user.id,
      title: payload.title,
      description: payload.description,
      audienceType: payload.audienceType,
      ownerRole,
      boardPath: payload.boardPath,
      isAnonymous: payload.isAnonymous,
      opensAt,
      endsAt,
      token: createSurveyToken(),
      status: "DRAFT",
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
              label: surveyOptionLabel(option),
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

  return NextResponse.json({
    message: "تم إنشاء الاستبيان كمسودة.",
    survey,
  });
}
