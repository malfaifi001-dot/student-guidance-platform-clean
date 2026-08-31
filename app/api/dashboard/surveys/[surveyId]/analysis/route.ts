import { NextResponse } from "next/server";
import { requireSurveyAccess } from "@/lib/surveys/survey-api-access";
import { buildSurveyRecommendations } from "@/lib/surveys/survey-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (typeof answer.jsonValue === "string") {
    return answer.jsonValue;
  }

  if (answer.jsonValue !== null && answer.jsonValue !== undefined) {
    return JSON.stringify(answer.jsonValue);
  }

  return answer.value || "";
}

function answerToNumber(answer: { value: string | null; jsonValue: unknown } | undefined) {
  const numberValue = Number(answerToText(answer));

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function isChoiceQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

function isNumericQuestion(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

export async function GET(_request: Request, context: RouteContext) {
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
        answers: {
          orderBy: {
            response: {
              submittedAt: "desc",
            },
          },
          take: 20,
          select: {
            id: true,
            value: true,
            jsonValue: true,
            response: {
              select: {
                submittedAt: true,
              },
            },
          },
        },
      },
    },
    responses: {
      orderBy: {
        submittedAt: "desc",
      },
      select: {
        submittedAt: true,
        answers: {
          select: {
            questionId: true,
            value: true,
            jsonValue: true,
          },
        },
      },
    },
  }, { historicalPersonalRead: true });

  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  const totalResponses = survey.responses.length;
  const totalQuestions = survey.questions.length;

  const requiredQuestions = survey.questions.filter((question) => question.isRequired);
  const completedRequiredResponses = survey.responses.filter((response) => {
    if (!requiredQuestions.length) return true;

    return requiredQuestions.every((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id);
      return Boolean(answerToText(answer).trim());
    });
  }).length;

  const completionRate = totalResponses
    ? Math.round((completedRequiredResponses / totalResponses) * 100)
    : 0;

  const questions = survey.questions.map((question) => {
    const responseAnswers = survey.responses.map((response) => {
      return response.answers.find((answer) => answer.questionId === question.id);
    });

    const answeredAnswers = responseAnswers.filter((answer) => answerToText(answer).trim());
    const numericValues = responseAnswers
      .map((answer) => answerToNumber(answer))
      .filter((value): value is number => value !== null);

    const optionLabels =
      question.type === "YES_NO"
        ? ["نعم", "لا"]
        : question.options.map((option) => option.label);

    const optionCounts = isChoiceQuestion(question.type)
      ? optionLabels.map((label) => {
          const count = responseAnswers.filter((answer) => {
            const values = answerToText(answer)
              .split("،")
              .map((item) => item.trim())
              .filter(Boolean);

            return values.includes(label);
          }).length;

          return {
            label,
            count,
            percentage: answeredAnswers.length ? Math.round((count / answeredAnswers.length) * 100) : 0,
          };
        })
      : [];

    const textSamples =
      question.type === "TEXT" || question.type === "TEXTAREA"
        ? question.answers
            .map((answer) => {
              const value = answer.value?.trim()
                ? answer.value
                : answerToText(answer);

              return {
                id: answer.id,
                value,
                submittedAt: answer.response.submittedAt,
              };
            })
            .filter((sample) => sample.value.trim().length > 0)
        : [];

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isRequired: question.isRequired,
      scaleMin: question.scaleMin,
      scaleMax: question.scaleMax,
      answeredCount: answeredAnswers.length,
      emptyCount: Math.max(totalResponses - answeredAnswers.length, 0),
      answerRate: totalResponses ? Math.round((answeredAnswers.length / totalResponses) * 100) : 0,
      average: isNumericQuestion(question.type) && numericValues.length
        ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
        : null,
      min: numericValues.length ? Math.min(...numericValues) : null,
      max: numericValues.length ? Math.max(...numericValues) : null,
      optionCounts,
      textSamples,
    };
  });

  const recommendations = buildSurveyRecommendations({
    totalResponses,
    totalQuestions,
    completionRate,
    questions,
  });

  return NextResponse.json({
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      audienceType: survey.audienceType,
      isAnonymous: survey.isAnonymous,
      opensAt: survey.opensAt,
      endsAt: survey.endsAt,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    },
    totals: {
      responses: totalResponses,
      questions: totalQuestions,
      totalResponses,
      totalQuestions,
      completionRate,
    },
    summary: {
      totalResponses,
      totalQuestions,
      questions: totalQuestions,
      completionRate,
    },
    questions,
    questionAnalyses: questions,
    recommendations,
  });
}
