import { z } from "zod";

const constraintLevelSchema = z.enum([
  "HARD",
  "PREFERRED",
]);

const constraintTypeSchema = z.enum([
  "TEACHER_UNAVAILABLE_SLOT",
  "TEACHER_DAY_OFF",
  "TEACHER_NOT_BEFORE_PERIOD",
  "TEACHER_NOT_AFTER_PERIOD",
  "TEACHER_MAX_DAILY_PERIODS",
  "TEACHER_MAX_CONSECUTIVE_PERIODS",
  "TEACHER_MAX_DAILY_GAPS",
  "SUBJECT_FORBIDDEN_SLOT",
  "SUBJECT_FIXED_SLOT",
  "SUBJECT_MAX_DAILY_OCCURRENCES",
  "SCHOOL_BLOCKED_SLOT",
  "CLASS_NO_INTERNAL_GAPS",
  "CLASS_MAX_HEAVY_SUBJECTS_DAILY",
  "FAIR_FIRST_PERIODS",
  "FAIR_LAST_PERIODS",
  "TEACHER_WORKING_DAYS",
  "TEACHER_MIN_DAILY_PERIODS",
  "TEACHER_NO_SINGLE_PERIOD_DAY",
  "SUBJECT_MIN_DISTRIBUTION_DAYS",
  "NO_CONSECUTIVE_HEAVY_SUBJECTS",
  "SUBJECT_REQUIRED_DOUBLE_PERIODS",
  "CLASS_MAX_PERIODS_ON_DAY",
  "SCHOOL_MAX_PERIODS_ON_DAY",
  "SUBJECT_ROOM_REQUIREMENT",
  "ROOM_UNAVAILABLE_SLOT",
]);

export const timetableConstraintSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    type: constraintTypeSchema,
    level: constraintLevelSchema,
    isEnabled: z.boolean(),

    teacherId: z.string().trim().min(1).optional(),
    subjectId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),

    dayId: z.string().trim().min(1).optional(),
    dayIds: z
      .array(z.string().trim().min(1))
      .max(7)
      .optional(),
    periodId: z.string().trim().min(1).optional(),

    value: z.number().int().min(0).max(20).optional(),
    weight: z.number().int().min(1).max(100).optional(),

    subjectIds: z
      .array(z.string().trim().min(1))
      .max(100)
      .optional(),

    isLocked: z.boolean().optional(),
    roomId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    const requireField = (
      field:
        | "teacherId"
        | "subjectId"
        | "dayId"
        | "periodId"
        | "value",
      message: string,
    ) => {
      if (
        value[field] === undefined ||
        value[field] === ""
      ) {
        context.addIssue({
          code: "custom",
          path: [field],
          message,
        });
      }
    };

    if (
      value.type.startsWith("TEACHER_")
    ) {
      requireField(
        "teacherId",
        "اختر المعلم.",
      );
    }

    if (
      value.type === "TEACHER_UNAVAILABLE_SLOT"
    ) {
      requireField("dayId", "اختر اليوم.");
      requireField("periodId", "اختر الحصة.");
    }

    if (
      value.type === "TEACHER_DAY_OFF"
    ) {
      requireField("dayId", "اختر يوم الراحة.");
    }

    if (
      value.type ===
        "TEACHER_NOT_BEFORE_PERIOD" ||
      value.type ===
        "TEACHER_NOT_AFTER_PERIOD"
    ) {
      requireField("periodId", "اختر الحصة.");
    }

    if (
      value.type ===
        "TEACHER_MAX_DAILY_PERIODS" ||
      value.type ===
        "TEACHER_MAX_CONSECUTIVE_PERIODS" ||
      value.type ===
        "TEACHER_MAX_DAILY_GAPS"
    ) {
      requireField("value", "أدخل القيمة.");
    }

    if (
      value.type ===
        "SUBJECT_FORBIDDEN_SLOT" ||
      value.type ===
        "SUBJECT_FIXED_SLOT" ||
      value.type ===
        "SUBJECT_MAX_DAILY_OCCURRENCES"
    ) {
      requireField("subjectId", "اختر المادة.");
    }

    if (
      value.type ===
        "SUBJECT_FORBIDDEN_SLOT"
    ) {
      requireField("periodId", "اختر الحصة.");
    }

    if (
      value.type ===
        "SUBJECT_FIXED_SLOT"
    ) {
      requireField("dayId", "اختر اليوم.");
      requireField("periodId", "اختر الحصة.");
    }

    if (
      value.type ===
        "SUBJECT_MAX_DAILY_OCCURRENCES"
    ) {
      requireField("value", "أدخل الحد اليومي.");
    }

    if (
      value.type === "SCHOOL_BLOCKED_SLOT"
    ) {
      requireField("dayId", "اختر اليوم.");
      requireField("periodId", "اختر الحصة.");
    }

    if (
      value.type ===
        "CLASS_MAX_HEAVY_SUBJECTS_DAILY"
    ) {
      requireField("value", "أدخل الحد اليومي.");

      if (!value.subjectIds?.length) {
        context.addIssue({
          code: "custom",
          path: ["subjectIds"],
          message: "اختر المواد الثقيلة.",
        });
      }
    }
  });

export const timetableConstraintsInputSchema =
  z.object({
    constraints: z
      .array(timetableConstraintSchema)
      .max(500),
  });

export type TimetableConstraintInput =
  z.infer<typeof timetableConstraintSchema>;
