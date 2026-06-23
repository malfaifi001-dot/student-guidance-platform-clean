import { NextRequest, NextResponse } from "next/server";
import { requireSurveyAccess } from "@/lib/surveys/survey-api-access";

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

export async function GET(request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId, {
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
  });

  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const respondentType = String(searchParams.get("respondentType") || "").trim();

  let rows = survey.responses.map((response, index) => {
    const answers = survey.questions.map((question) => {
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
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      questions: survey.questions.map((question) => ({
        id: question.id,
        label: question.label,
        type: question.type,
        isRequired: question.isRequired,
      })),
    },
    totals: {
      allResponses: survey.responses.length,
      filteredResponses: rows.length,
      questions: survey.questions.length,
    },
    responses: rows.map((row) => ({
      index: row.index,
      id: row.id,
      submittedAt: row.submittedAt,
      respondentType: row.respondentType,
      respondentName: row.respondentName,
      respondentPhone: row.respondentPhone,
      answers: row.answers,
    })),
  });
}
