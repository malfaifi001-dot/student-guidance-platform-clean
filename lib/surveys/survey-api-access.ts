import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import type { SchoolDashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { SURVEY_SERVICE_SLUG } from "@/lib/surveys/survey-config";

type SurveyAccessResult<TInclude extends Prisma.SurveyInclude | undefined> = {
  context: SchoolDashboardContext | null;
  survey: (
    TInclude extends Prisma.SurveyInclude
      ? Prisma.SurveyGetPayload<{ include: TInclude }>
      : Prisma.SurveyGetPayload<Record<string, never>>
  ) | null;
  error: Response | null;
};

export async function requireSurveyServiceContext() {
  const context = await requireServiceAccessForCurrentUser(SURVEY_SERVICE_SLUG, {
    allowPrincipal: true,
  });

  if (context instanceof Response) {
    return {
      context: null,
      error: context,
    };
  }

  return {
    context: context as SchoolDashboardContext,
    error: null,
  };
}

export async function requireSurveyAccess<
  TInclude extends Prisma.SurveyInclude | undefined = undefined,
>(
  surveyId: string,
  include?: TInclude,
  options?: { historicalPersonalRead?: boolean },
): Promise<SurveyAccessResult<TInclude>> {
  const { context, error } = await requireSurveyServiceContext();

  if (error || !context) {
    return {
      context: null,
      survey: null,
      error,
    } as SurveyAccessResult<TInclude>;
  }

  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      ...(context.isAdmin
        ? {}
        : {
            ...(options?.historicalPersonalRead
              ? {}
              : { schoolAccountId: context.schoolAccountId }),
            createdById: context.user.id,
          }),
    },
    include,
  }) as SurveyAccessResult<TInclude>["survey"];

  if (!survey) {
    return {
      context: null,
      survey: null,
      error: NextResponse.json(
        {
          error: "الاستبيان غير موجود.",
        },
        { status: 404 },
      ),
    } as SurveyAccessResult<TInclude>;
  }

  if (
    !context.isAdmin &&
    (!options?.historicalPersonalRead &&
      survey.schoolAccountId !== context.schoolAccountId)
  ) {
    return {
      context: null,
      survey: null,
      error: NextResponse.json(
        {
          error: "لا تملك صلاحية الوصول لهذا الاستبيان.",
        },
        { status: 403 },
      ),
    } as SurveyAccessResult<TInclude>;
  }

  return {
    context,
    survey,
    error: null,
  } as SurveyAccessResult<TInclude>;
}
