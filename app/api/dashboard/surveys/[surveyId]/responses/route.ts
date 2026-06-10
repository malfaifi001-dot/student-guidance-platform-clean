import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

function answerToText(answer: { value: string | null; jsonValue: unknown } | undefined) {
  if (!answer) return "";

  if (Array.isArray(answer.jsonValue)) {
    return answer.jsonValue
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("، ");
  }

  if (answer.jsonValue !== null && answer.jsonValue !== undefined) {
    return JSON.stringify(answer.jsonValue);
  }

  return answer.value || "";
}

async function requireResponsesAccess(surveyId: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        { error: "يجب تسجيل الدخول أولًا." },
        { status: 401 },
      ),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json(
          { error: "حسابك غير مرتبط بمدرسة." },
          { status: 403 },
        ),
      };
    }

    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId);

    if (!overview.usable) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json(
          { error: "حسابك يحتاج تفعيلًا للاستمرار." },
          { status: 402 },
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
      },
      responses: {
        orderBy: {
          submittedAt: "desc",
        },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!survey) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        { error: "الاستبيان غير موجود." },
        { status: 404 },
      ),
    };
  }

  if (current.user.role !== "ADMIN" && survey.schoolAccountId !== current.user.schoolAccountId) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json(
        { error: "لا تملك صلاحية الوصول لهذا الاستبيان." },
        { status: 403 },
      ),
    };
  }

  return {
    current,
    survey,
    error: null,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireResponsesAccess(surveyId);

  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const respondentType = String(searchParams.get("respondentType") || "").trim();

  let rows = survey!.responses.map((response, index) => {
    const answers = survey!.questions.map((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id);

      return {
        questionId: question.id,
        questionLabel: question.label,
        questionType: question.type,
        value: answerToText(answer),
      };
    });

    return {
      index: index + 1,
      id: response.id,
      submittedAt: response.submittedAt,
      respondentType: response.respondentType,
      respondentName: response.respondentName,
      respondentPhone: response.respondentPhone,
      answers,
      searchableText: [
        response.respondentType,
        response.respondentName,
        response.respondentPhone,
        ...answers.map((answer) => answer.value),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });

  if (respondentType) {
    rows = rows.filter((row) => row.respondentType === respondentType);
  }

  if (query) {
    rows = rows.filter((row) => row.searchableText.includes(query));
  }

  return NextResponse.json({
    survey: {
      id: survey!.id,
      title: survey!.title,
      description: survey!.description,
      status: survey!.status,
      audienceType: survey!.audienceType,
      isAnonymous: survey!.isAnonymous,
      questions: survey!.questions.map((question) => ({
        id: question.id,
        label: question.label,
        type: question.type,
        isRequired: question.isRequired,
      })),
    },
    totals: {
      allResponses: survey!.responses.length,
      filteredResponses: rows.length,
      questions: survey!.questions.length,
    },
    responses: rows.map(({ searchableText, ...row }) => row),
  });
}