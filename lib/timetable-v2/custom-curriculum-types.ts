import type {
  TimetableV2CurriculumPlan,
  TimetableV2CurriculumSubject,
} from "./curriculum-catalog";

import {
  getTimetableV2CanonicalSubjectName,
  type TimetableV2SemesterId,
} from "./curriculum-catalog";

import type { TimetableV2StageId } from "./project-setup";

export type CustomCurriculumItemInput = {
  subjectName: string;
  weeklyLessons: number;
  singlePeriods: number;
  doublePeriods: number;
};

export type CustomCurriculumPlanPayload = {
  name: string;
  templateId: string | null;
  stageId: TimetableV2StageId | null;
  gradeId: string | null;
  semesterId: TimetableV2SemesterId | null;
  saveForFuture: boolean;
  items: CustomCurriculumItemInput[];
};

export type SubjectBankEntry = {
  key: string;
  name: string;
  isSystem: boolean;

  /*
   * System catalog subjects may appear in more than one stage.
   * School-created subjects intentionally keep this empty so
   * they remain available from every stage filter.
   */
  stageIds?: TimetableV2StageId[];
};

export type SchoolCurriculumTemplateSummary = {
  id: string;
  name: string;
  stageId: string | null;
  gradeId: string | null;
  semesterId: string | null;
  subjectCount: number;
  totalWeeklyLessons: number;
  items: CustomCurriculumItemInput[];
  updatedAt: string;
};

export type CustomCurriculumValidation = {
  valid: boolean;
  errors: string[];
};

export const TIMETABLE_V2_CUSTOM_PLAN_MAX_ITEMS = 60;

export const TIMETABLE_V2_CUSTOM_PLAN_MAX_NAME = 120;

export const TIMETABLE_V2_CUSTOM_PLAN_MAX_WEEKLY_LESSONS = 60;

export function normalizeTimetableV2SubjectKey(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export function normalizeTimetableV2PlanText(
  value: string,
) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateTimetableV2CustomCurriculumItems(
  items: CustomCurriculumItemInput[],
): CustomCurriculumValidation {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("أضف مادة واحدة على الأقل قبل حفظ الخطة.");
    return { valid: false, errors };
  }

  if (
    items.length >
    TIMETABLE_V2_CUSTOM_PLAN_MAX_ITEMS
  ) {
    errors.push(
      `لا يمكن أن تتجاوز الخطة ${TIMETABLE_V2_CUSTOM_PLAN_MAX_ITEMS} مادة.`,
    );
    return { valid: false, errors };
  }

  const seen = new Map<
    string,
    string
  >();

  items.forEach((item, index) => {
    const subjectName = normalizeTimetableV2PlanText(
      item.subjectName ?? "",
    );

    if (!subjectName) {
      errors.push(
        `المادة رقم ${index + 1} بدون اسم.`,
      );
      return;
    }

    const key =
      normalizeTimetableV2SubjectKey(
        subjectName,
      );

    if (seen.has(key)) {
      errors.push(
        `المادة «${subjectName}» مكررة داخل الخطة.`,
      );
      return;
    }

    seen.set(key, subjectName);

    const weeklyLessons =
      item.weeklyLessons;
    const singlePeriods =
      item.singlePeriods;
    const doublePeriods =
      item.doublePeriods;

    if (
      !Number.isInteger(
        weeklyLessons,
      ) ||
      weeklyLessons < 1 ||
      weeklyLessons >
        TIMETABLE_V2_CUSTOM_PLAN_MAX_WEEKLY_LESSONS
    ) {
      errors.push(
        `الحصص الأسبوعية لـ«${subjectName}» غير صالحة.`,
      );
    }

    if (
      !Number.isInteger(
        singlePeriods,
      ) ||
      singlePeriods < 0 ||
      singlePeriods >
        TIMETABLE_V2_CUSTOM_PLAN_MAX_WEEKLY_LESSONS
    ) {
      errors.push(
        `الحصص المفردة لـ«${subjectName}» غير صالحة.`,
      );
    }

    if (
      !Number.isInteger(
        doublePeriods,
      ) ||
      doublePeriods < 0 ||
      doublePeriods *
        2 >
        TIMETABLE_V2_CUSTOM_PLAN_MAX_WEEKLY_LESSONS
    ) {
      errors.push(
        `الحصص المتتالية لـ«${subjectName}» غير صالحة.`,
      );
    }

    if (
      singlePeriods +
        doublePeriods * 2 !==
      weeklyLessons
    ) {
      errors.push(
        `تركيب حصص «${subjectName}» غير متطابق: المفردة + (المتتالية × 2) يجب أن تساوي الحصص الأسبوعية.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildTimetableV2TemplateItems(
  items: CustomCurriculumItemInput[],
) {
  return items.map((item, index) => ({
    subjectName:
      normalizeTimetableV2PlanText(
        item.subjectName ?? "",
      ),

    weeklyLessons:
      item.weeklyLessons,

    singlePeriods:
      item.singlePeriods,

    doublePeriods:
      item.doublePeriods,

    sortOrder: index,
  }));
}

export function createTimetableV2CustomCurriculumPlan(input: {
  sourceId: string;
  name: string;
  stageId: TimetableV2StageId;
  gradeId: string;
  semesterId: TimetableV2SemesterId | null;
  items: CustomCurriculumItemInput[];
}): TimetableV2CurriculumPlan {
  const subjects: TimetableV2CurriculumSubject[] =
    input.items.map((item) => {
      const subjectName =
        normalizeTimetableV2PlanText(
          item.subjectName ?? "",
        );

      return {
        sourceName: subjectName,

        canonicalName:
          getTimetableV2CanonicalSubjectName(
            subjectName,
          ),

        oddClasses:
          item.singlePeriods,

        evenClasses:
          item.doublePeriods,

        weeklyPeriods:
          item.weeklyLessons,
      };
    });

  return {
    sourceId: input.sourceId,
    sourceName: input.name,
    stageId: input.stageId,
    gradeId: input.gradeId,
    trackId: "GENERAL",
    semesterId: input.semesterId,
    subjects,
    totalWeeklyPeriods:
      input.items.reduce(
        (sum, item) =>
          sum +
          item.weeklyLessons,
        0,
      ),
  };
}

export function getTimetableV2CustomPlanSourceId(
  templateId: string,
) {
  return `CUSTOM:${templateId}`;
}

export function isTimetableV2CustomPlanSourceId(
  sourceId: string,
) {
  return sourceId.startsWith("CUSTOM:");
}

export function getTimetableV2CustomPlanTemplateIdFromSourceId(
  sourceId: string,
) {
  return sourceId.startsWith("CUSTOM:")
    ? sourceId.slice("CUSTOM:".length) || null
    : null;
}
