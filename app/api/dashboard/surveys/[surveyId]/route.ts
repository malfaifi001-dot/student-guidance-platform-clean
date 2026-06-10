import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import type { SurveyQuestionInputType } from "@/lib/surveys/survey-config";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

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

function toSafeQuestionType(value: unknown): SurveyQuestionInputType {
  if (typeof value === "string" && ALLOWED_QUESTION_TYPES.has(value as SurveyQuestionInputType)) {
    return value as SurveyQuestionInputType;
  }

  return "TEXT";
}

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

async function requireSurveyAccess(surveyId: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 }),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json({ error: "حسابك غير مرتبط بمدرسة." }, { status: 403 }),
      };
    }

    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId);

    if (!overview.usable) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json({ error: "حسابك يحتاج تفعيلًا للاستمرار." }, { status: 402 }),
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
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  if (!survey) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 }),
    };
  }

  if (current.user.role !== "ADMIN" && survey.schoolAccountId !== current.user.schoolAccountId) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "لا تملك صلاحية الوصول لهذا الاستبيان." }, { status: 403 }),
    };
  }

  return {
    current,
    survey,
    error: null,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId);

  if (error) return error;

  return NextResponse.json({
    survey,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const payload = await request.json().catch(() => null);
  const action = String(payload?.action || "").trim();

  const { survey, error } = await requireSurveyAccess(surveyId);

  if (error) return error;

  if (action === "update-draft") {
    if (survey!.status !== "DRAFT") {
      return NextResponse.json(
        { error: "لا يمكن تعديل الاستبيان بعد النشر. يمكنك نسخه وإنشاء نسخة جديدة." },
        { status: 400 },
      );
    }

    if (survey!._count.responses > 0) {
      return NextResponse.json(
        { error: "لا يمكن تعديل استبيان لديه ردود محفوظة." },
        { status: 400 },
      );
    }

    const title = String(payload?.title || "").trim();
    const description = payload?.description ? String(payload.description).trim() : null;
    const audienceType = String(payload?.audienceType || "GENERAL").trim() || "GENERAL";
    const isAnonymous = Boolean(payload?.isAnonymous);
    const opensAt = parseOptionalDate(payload?.opensAt);
    const endsAt = parseOptionalDate(payload?.endsAt);

    if (opensAt && endsAt && endsAt.getTime() < opensAt.getTime()) {
      return NextResponse.json(
        { error: "تاريخ نهاية الاستقبال يجب أن يكون بعد تاريخ البداية." },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json({ error: "اكتب عنوان الاستبيان." }, { status: 400 });
    }

    const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
    const questions = rawQuestions
      .map((question: any, index: number) => normalizeQuestion(question, index))
      .filter((question: any) => question.label);

    if (!questions.length) {
      return NextResponse.json({ error: "أضف سؤالًا واحدًا على الأقل." }, { status: 400 });
    }

    const updatedSurvey = await prisma.$transaction(async (tx) => {
      const existingQuestions = await tx.surveyQuestion.findMany({
        where: {
          surveyId: survey!.id,
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
            surveyId: survey!.id,
          },
        });
      }

      return tx.survey.update({
        where: {
          id: survey!.id,
        },
        data: {
          title,
          description,
          audienceType,
          isAnonymous,
          opensAt,
          endsAt,
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
    });

    return NextResponse.json({
      message: "تم تحديث مسودة الاستبيان.",
      survey: updatedSurvey,
    });
  }

  if (action === "publish") {
    const updated = await prisma.survey.update({
      where: {
        id: survey!.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: survey!.publishedAt || new Date(),
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
        id: survey!.id,
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

  if (action === "archive") {
    const updated = await prisma.survey.update({
      where: {
        id: survey!.id,
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

  return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId);

  if (error) return error;

  if (survey!.status !== "DRAFT") {
    return NextResponse.json(
      { error: "يمكن حذف المسودات فقط. أغلق الاستبيان أو أرشفه بدل الحذف." },
      { status: 400 },
    );
  }

  await prisma.survey.delete({
    where: {
      id: survey!.id,
    },
  });

  return NextResponse.json({
    message: "تم حذف مسودة الاستبيان.",
  });
}