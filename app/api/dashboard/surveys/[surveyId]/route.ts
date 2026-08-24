import { NextRequest, NextResponse } from "next/server";

import { dispatchAutomaticPushEvent } from "@/lib/notifications/push-center-service";
import { prisma } from "@/lib/prisma";
import { requireSurveyAccess } from "@/lib/surveys/survey-api-access";
import {
  surveyActionSchema,
  surveyStateActionPayloadSchema,
  surveyUpdateDraftPayloadSchema,
} from "@/lib/surveys/survey-api-schemas";
import { updateSurveyInPlace } from "@/lib/surveys/survey-update-service";

type RouteContext = { params: Promise<{ surveyId: string }> };

function parseOptionalDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const surveyInclude = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      options: { orderBy: { order: "asc" as const } },
      _count: { select: { answers: true } },
    },
  },
  _count: { select: { responses: true } },
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId, surveyInclude);
  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }
  return NextResponse.json({ survey });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const rawPayload = await request.json().catch(() => null);
  const actionResult = surveyActionSchema.safeParse(rawPayload?.action);
  if (!actionResult.success) {
    return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
  }

  const { survey, error } = await requireSurveyAccess(surveyId, surveyInclude);
  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }

  if (actionResult.data === "update-draft") {
    if (survey.status === "CLOSED" || survey.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "لا يمكن تعديل الاستبيان المغلق أو المؤرشف." },
        { status: 400 },
      );
    }

    const payloadResult = surveyUpdateDraftPayloadSchema.safeParse(rawPayload);
    if (!payloadResult.success) {
      return NextResponse.json(
        { error: payloadResult.error.issues[0]?.message || "بيانات التحديث غير صالحة." },
        { status: 400 },
      );
    }

    const payload = payloadResult.data;
    const opensAt = parseOptionalDate(payload.opensAt);
    const endsAt = parseOptionalDate(payload.endsAt);
    if ((payload.opensAt && !opensAt) || (payload.endsAt && !endsAt)) {
      return NextResponse.json({ error: "تاريخ الاستقبال غير صالح." }, { status: 400 });
    }
    if (opensAt && endsAt && endsAt.getTime() < opensAt.getTime()) {
      return NextResponse.json(
        { error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية." },
        { status: 400 },
      );
    }

    try {
      const updatedSurvey = await prisma.$transaction((tx) =>
        updateSurveyInPlace(tx, survey.id, {
          title: payload.title,
          description: payload.description,
          audienceType: payload.audienceType,
          isAnonymous: payload.isAnonymous,
          opensAt,
          endsAt,
          questions: payload.questions,
        }),
      );
      return NextResponse.json({
        message: "تم تحديث الاستبيان بنجاح.",
        survey: updatedSurvey,
      });
    } catch (updateError) {
      return NextResponse.json(
        {
          error:
            updateError instanceof Error
              ? updateError.message
              : "تعذر تحديث الاستبيان بأمان.",
        },
        { status: 400 },
      );
    }
  }

  const stateActionResult = surveyStateActionPayloadSchema.safeParse(rawPayload);
  if (!stateActionResult.success) {
    return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
  }

  if (actionResult.data === "publish") {
    const updated = await prisma.survey.update({
      where: { id: survey.id },
      data: {
        status: "PUBLISHED",
        publishedAt: survey.publishedAt || new Date(),
        closedAt: null,
      },
    });
    if (survey.createdById) {
      void dispatchAutomaticPushEvent({
        triggerKey: "survey-published",
        actorUserId: survey.createdById,
        sourceRecordId: survey.id,
        variables: { surveyTitle: survey.title },
      }).catch(() => undefined);
    }
    return NextResponse.json({ message: "تم نشر الاستبيان.", survey: updated });
  }

  if (actionResult.data === "close") {
    const updated = await prisma.survey.update({
      where: { id: survey.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return NextResponse.json({ message: "تم إغلاق الاستبيان.", survey: updated });
  }

  const updated = await prisma.survey.update({
    where: { id: survey.id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ message: "تمت أرشفة الاستبيان.", survey: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireSurveyAccess(surveyId, {
    _count: { select: { responses: true } },
  });
  if (error || !survey) {
    return error ?? NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 });
  }
  if (survey.status !== "DRAFT") {
    return NextResponse.json(
      { error: "يمكن حذف المسودات فقط. أغلق الاستبيان أو أرشفه بدل الحذف." },
      { status: 400 },
    );
  }
  await prisma.survey.delete({ where: { id: survey.id } });
  return NextResponse.json({ message: "تم حذف مسودة الاستبيان." });
}
