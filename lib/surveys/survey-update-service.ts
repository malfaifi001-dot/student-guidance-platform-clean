import { randomUUID } from "node:crypto";
import type { Prisma, SurveyQuestionType } from "@prisma/client";

import { prepareSurveyQuestionForPersistence } from "@/lib/surveys/survey-config";

type SurveyQuestionUpdate = {
  id?: string;
  label: string;
  type: SurveyQuestionType;
  sectionTitle?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  scaleMin?: number;
  scaleMax?: number;
  options: Array<string | { id?: string; label: string }>;
};

type SurveyUpdatePayload = {
  title: string;
  description: string | null;
  audienceType: string;
  isAnonymous: boolean;
  opensAt: Date | null;
  endsAt: Date | null;
  questions: SurveyQuestionUpdate[];
};

function optionLabel(option: string | { label: string }) {
  return typeof option === "string" ? option : option.label;
}

function optionId(option: string | { id?: string; label: string }) {
  return typeof option === "string" ? undefined : option.id;
}

function answerStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(answerStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(answerStrings);
  }
  return [];
}

export async function updateSurveyInPlace(
  tx: Prisma.TransactionClient,
  surveyId: string,
  payload: SurveyUpdatePayload,
) {
  const existingQuestions = await tx.surveyQuestion.findMany({
    where: { surveyId },
    select: {
      id: true,
      key: true,
      type: true,
      _count: { select: { answers: true } },
      options: {
        orderBy: { order: "asc" },
        select: { id: true, label: true, value: true, order: true },
      },
    },
  });

  const existingById = new Map(existingQuestions.map((question) => [question.id, question]));
  const submittedIds = new Set(
    payload.questions.map((question) => question.id).filter((id): id is string => Boolean(id)),
  );

  for (const question of payload.questions) {
    if (question.id && !existingById.has(question.id)) {
      throw new Error("لا يمكن تحديث سؤال لا ينتمي إلى هذا الاستبيان.");
    }
  }

  const removedQuestions = existingQuestions.filter((question) => !submittedIds.has(question.id));
  if (removedQuestions.some((question) => question._count.answers > 0)) {
    throw new Error("لا يمكن حذف سؤال يحتوي على ردود سابقة.");
  }

  if (removedQuestions.length) {
    await tx.surveyQuestion.deleteMany({
      where: { id: { in: removedQuestions.map((question) => question.id) } },
    });
  }

  const answers = existingQuestions.length
    ? await tx.surveyAnswer.findMany({
        where: { questionId: { in: existingQuestions.map((question) => question.id) } },
        select: { questionId: true, value: true, jsonValue: true },
      })
    : [];
  const answerValues = new Map<string, Set<string>>();
  for (const answer of answers) {
    const values = [
      ...answerStrings(answer.value),
      ...answerStrings(answer.jsonValue),
    ];
    const current = answerValues.get(answer.questionId) || new Set<string>();
    values.forEach((value) => current.add(value));
    answerValues.set(answer.questionId, current);
  }

  for (const [questionIndex, question] of payload.questions.entries()) {
    const existing = question.id ? existingById.get(question.id) : undefined;
    if (existing && existing._count.answers > 0 && existing.type !== question.type) {
      throw new Error("لا يمكن تغيير نوع سؤال بعد استقبال ردود عليه.");
    }

    const persisted = prepareSurveyQuestionForPersistence(question);
    const questionId = existing?.id || randomUUID();
    const data = {
      label: persisted.label,
      type: question.type,
      helpText: persisted.helpText,
      isRequired: question.isRequired,
      order: questionIndex + 1,
      scaleMin: question.scaleMin ?? null,
      scaleMax: question.scaleMax ?? null,
    };

    if (existing) {
      await tx.surveyQuestion.update({ where: { id: existing.id }, data });
    } else {
      await tx.surveyQuestion.create({
        data: { id: questionId, surveyId, key: `q_${randomUUID()}`, ...data },
      });
    }

    const existingOptions = existing?.options || [];
    if (existing && existing._count.answers > 0) {
      const submittedExistingIds = question.options
        .map(optionId)
        .filter((id): id is string => Boolean(id));
      const existingIds = existingOptions.map((option) => option.id);
      const preservesExistingOrder = existingIds.every(
        (id, index) => submittedExistingIds[index] === id,
      );
      if (
        submittedExistingIds.length !== existingIds.length ||
        !preservesExistingOrder
      ) {
        throw new Error("لا يمكن حذف أو إعادة ترتيب خيارات سؤال يحتوي على ردود سابقة.");
      }
    }
    const retainedOptionIds = new Set<string>();
    for (const [optionIndex, option] of question.options.entries()) {
      const requestedId = optionId(option);
      const current = requestedId
        ? existingOptions.find((candidate) => candidate.id === requestedId)
        : existingOptions[optionIndex];
      const label = optionLabel(option);

      if (current) {
        retainedOptionIds.add(current.id);
        await tx.surveyOption.update({
          where: { id: current.id },
          data: { label, order: optionIndex + 1 },
        });
      } else {
        await tx.surveyOption.create({
          data: {
            questionId,
            label,
            value: `option_${randomUUID()}`,
            order: optionIndex + 1,
          },
        });
      }
    }

    const usedValues = answerValues.get(questionId) || new Set<string>();
    const removedUsedOption = existingOptions.find(
      (option) => !retainedOptionIds.has(option.id) && usedValues.has(option.value),
    );
    if (removedUsedOption) {
      throw new Error("لا يمكن حذف خيار يحتوي على ردود سابقة.");
    }

    const removableIds = existingOptions
      .filter((option) => !retainedOptionIds.has(option.id))
      .map((option) => option.id);
    if (removableIds.length) {
      await tx.surveyOption.deleteMany({ where: { id: { in: removableIds } } });
    }
  }

  return tx.survey.update({
    where: { id: surveyId },
    data: {
      title: payload.title,
      description: payload.description,
      audienceType: payload.audienceType,
      isAnonymous: payload.isAnonymous,
      opensAt: payload.opensAt,
      endsAt: payload.endsAt,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      _count: { select: { questions: true, responses: true } },
    },
  });
}
