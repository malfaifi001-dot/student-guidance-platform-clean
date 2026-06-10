import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { createSurveyToken } from "@/lib/surveys/survey-service";
import type { SurveyQuestionInputType } from "@/lib/surveys/survey-config";

const ALLOWED_QUESTION_TYPES = new Set<SurveyQuestionInputType>([
  "TEXT",
  "TEXTAREA",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "YES_NO",
  "RATING",
  "SCALE",
  "NUMBER",
  "DATE",
]);

function parseOptionalDate(value: unknown) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
async function requireSurveyDashboardContext() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      current: null,
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
        error: NextResponse.json(
          {
            error: "حسابك يحتاج تفعيلًا للاستمرار.",
            redirectTo: "/dashboard/plans?reason=activation-required",
          },
          {
            status: 402,
          },
        ),
      };
    }
  }

  return {
    current,
    error: null,
  };
}

function toSafeQuestionType(value: unknown): SurveyQuestionInputType {
  if (typeof value === "string" && ALLOWED_QUESTION_TYPES.has(value as SurveyQuestionInputType)) {
    return value as SurveyQuestionInputType;
  }

  return "TEXT";
}

function normalizeQuestion(rawQuestion: any, index: number) {
  const label = String(rawQuestion?.label || "").trim();
  const type = toSafeQuestionType(rawQuestion?.type);
  const rawOptions = Array.isArray(rawQuestion?.options) ? rawQuestion.options : [];

  const options = rawOptions
    .map((option: unknown) => String(option || "").trim())
    .filter(Boolean);

  return {
    key: `q_${index + 1}`,
    label,
    type,
    helpText: rawQuestion?.helpText ? String(rawQuestion.helpText).trim() : null,
    isRequired: Boolean(rawQuestion?.isRequired),
    order: index + 1,
    scaleMin: Number.isFinite(Number(rawQuestion?.scaleMin)) ? Number(rawQuestion.scaleMin) : null,
    scaleMax: Number.isFinite(Number(rawQuestion?.scaleMax)) ? Number(rawQuestion.scaleMax) : null,
    options,
  };
}

export async function GET(request: NextRequest) {
  const { current, error } = await requireSurveyDashboardContext();

  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const ownerRole = searchParams.get("ownerRole");
  const boardPath = searchParams.get("boardPath");

  const where: any = {};

  if (current!.user.role !== "ADMIN") {
    where.schoolAccountId = current!.user.schoolAccountId;
  }

  if (ownerRole) {
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

  return NextResponse.json({
    surveys,
  });
}

export async function POST(request: NextRequest) {
  const { current, error } = await requireSurveyDashboardContext();

  if (error) return error;

  if (!current!.user.schoolAccountId) {
    return NextResponse.json(
      {
        error: "إنشاء الاستبيانات يحتاج حساب مدرسة مرتبط. يمكن لاحقًا إضافة استبيانات منصة عامة للأدمن.",
      },
      {
        status: 400,
      },
    );
  }

  const payload = await request.json().catch(() => null);

  const title = String(payload?.title || "").trim();
  const description = payload?.description ? String(payload.description).trim() : null;
  const audienceType = String(payload?.audienceType || "GENERAL").trim() || "GENERAL";
  const ownerRole = String(payload?.ownerRole || current!.user.role).trim();
  const boardPath = String(payload?.boardPath || "/dashboard/surveys").trim();
  const isAnonymous = Boolean(payload?.isAnonymous);
  const opensAt = parseOptionalDate(payload?.opensAt);
  const endsAt = parseOptionalDate(payload?.endsAt);

  if (opensAt && endsAt && endsAt.getTime() < opensAt.getTime()) {
    return NextResponse.json(
      {
        error: "تاريخ نهاية الاستقبال يجب أن يكون بعد تاريخ البداية.",
      },
      {
        status: 400,
      },
    );
  }

  if (!title) {
    return NextResponse.json(
      {
        error: "اكتب عنوان الاستبيان.",
      },
      {
        status: 400,
      },
    );
  }

  const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
  const questions = rawQuestions
    .map((question: any, index: number) => normalizeQuestion(question, index))
    .filter((question: any) => question.label);

  if (!questions.length) {
    return NextResponse.json(
      {
        error: "أضف سؤالًا واحدًا على الأقل.",
      },
      {
        status: 400,
      },
    );
  }

  const survey = await prisma.survey.create({
    data: {
      schoolAccountId: current!.user.schoolAccountId,
      createdById: current!.user.id,
      title,
      description,
      audienceType,
      ownerRole,
      boardPath,
      isAnonymous,
      token: createSurveyToken(),
      status: "DRAFT",
      questions: {
        create: questions.map((question: any) => ({
          key: question.key,
          label: question.label,
          type: question.type,
          helpText: question.helpText,
          isRequired: question.isRequired,
          order: question.order,
          scaleMin: question.scaleMin,
          scaleMax: question.scaleMax,
          options: {
            create: question.options.map((option: string, optionIndex: number) => ({
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

  return NextResponse.json({
    message: "تم إنشاء الاستبيان كمسودة.",
    survey,
  });
}