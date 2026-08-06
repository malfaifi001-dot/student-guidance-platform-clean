import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timetableDayIdSchema = z.enum([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

export const timetableDaySchema = z.object({
  id: timetableDayIdSchema,
  label: z.string().trim().min(1, "اسم اليوم مطلوب.").max(30),
  order: z.number().int().min(0).max(6),
});

export const timetablePeriodSchema = z
  .object({
    id: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1, "اسم الحصة مطلوب.").max(60),
    order: z.number().int().min(0).max(30),
    startTime: z
      .string()
      .regex(timePattern, "وقت بداية الحصة غير صالح."),
    endTime: z
      .string()
      .regex(timePattern, "وقت نهاية الحصة غير صالح."),
    isBreak: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    const start = timeToMinutes(value.startTime);
    const end = timeToMinutes(value.endTime);

    if (end <= start) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "وقت نهاية الحصة يجب أن يكون بعد وقت البداية.",
      });
    }
  });

export const timetableProjectSettingsSchema = z.object({
  startTime: z
    .string()
    .regex(timePattern, "وقت بداية الدوام غير صالح."),
  lessonDurationMinutes: z
    .number()
    .int()
    .min(20, "مدة الحصة لا تقل عن 20 دقيقة.")
    .max(120, "مدة الحصة لا تزيد عن 120 دقيقة."),
  breakAfterPeriod: z
    .number()
    .int()
    .min(0)
    .max(12),
  breakDurationMinutes: z
    .number()
    .int()
    .min(0)
    .max(60),
});

export const timetableProjectInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "اسم الجدول مطلوب.")
      .max(120),
    academicYear: z
      .string()
      .trim()
      .min(1, "العام الدراسي مطلوب.")
      .max(30),
    semester: z
      .string()
      .trim()
      .min(1, "الفصل الدراسي مطلوب.")
      .max(50),
    days: z
      .array(timetableDaySchema)
      .min(1, "اختر يومًا دراسيًا واحدًا على الأقل.")
      .max(7),
    periods: z
      .array(timetablePeriodSchema)
      .min(1, "أضف حصة دراسية واحدة على الأقل.")
      .max(20),
    settings: timetableProjectSettingsSchema,
  })
  .superRefine((value, context) => {
    const dayIds = new Set<string>();
    const periodIds = new Set<string>();

    for (const day of value.days) {
      if (dayIds.has(day.id)) {
        context.addIssue({
          code: "custom",
          path: ["days"],
          message: "لا يمكن تكرار اليوم الدراسي.",
        });
      }

      dayIds.add(day.id);
    }

    for (const period of value.periods) {
      if (periodIds.has(period.id)) {
        context.addIssue({
          code: "custom",
          path: ["periods"],
          message: "لا يمكن تكرار معرف الحصة.",
        });
      }

      periodIds.add(period.id);
    }

    const teachingPeriods = value.periods.filter(
      (period) => !period.isBreak,
    );

    if (teachingPeriods.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["periods"],
        message: "يجب وجود حصة دراسية واحدة على الأقل.",
      });
    }

    if (
      value.settings.breakAfterPeriod >
      teachingPeriods.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["settings", "breakAfterPeriod"],
        message: "موضع الفسحة أكبر من عدد الحصص.",
      });
    }
  });

export const timetableProjectMetadataSchema = z.object({
  name: z.string().trim().min(2, "اسم الجدول مطلوب.").max(120),
  academicYear: z.string().trim().min(1, "العام الدراسي مطلوب.").max(30),
  semester: z.string().trim().min(1, "الفصل الدراسي مطلوب.").max(50),
});

export const timetableTeacherInputSchema = z.object({
  userId: z.string().trim().min(1).nullable().optional(),
  name: z
    .string()
    .trim()
    .min(2, "اسم المعلم مطلوب.")
    .max(120),
  specialty: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),
  maxWeeklyLoad: z
    .number()
    .int()
    .min(1, "النصاب الأسبوعي لا يقل عن حصة واحدة.")
    .max(40, "النصاب الأسبوعي غير صالح."),
  isActive: z.boolean().default(true),
  unavailableSlots: z
    .array(
      z.object({
        dayId: timetableDayIdSchema,
        periodId: z.string().trim().min(1).max(60),
      }),
    )
    .max(100)
    .default([]),
});

export const timetableClassInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم الفصل مطلوب.")
    .max(100),
  isActive: z.boolean().default(true),
});

export const timetableSubjectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المادة مطلوب.")
    .max(100),
  catalogKey: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
});

export const timetableClassSubjectInputSchema = z.object({
  classId: z.string().trim().min(1, "الفصل مطلوب."),
  subjectId: z.string().trim().min(1, "المادة مطلوبة."),
  weeklyLessons: z
    .number()
    .int()
    .min(1, "عدد الحصص لا يقل عن حصة واحدة.")
    .max(20, "عدد الحصص الأسبوعية غير صالح."),
});

export const timetableAssignmentInputSchema = z
  .object({
    teacherId: z.string().trim().min(1, "المعلم مطلوب."),
    classId: z.string().trim().min(1, "الفصل مطلوب."),
    subjectId: z.string().trim().min(1, "المادة مطلوبة."),
    assignedLessons: z
      .number()
      .int()
      .min(1, "عدد الحصص المسندة مطلوب.")
      .max(20),
    singlePeriods: z.number().int().min(0).max(20),
    doublePeriods: z.number().int().min(0).max(10),
    fixedSlots: z
      .array(
        z.object({
          dayId: timetableDayIdSchema,
          periodId: z.string().trim().min(1).max(60),
          isLocked: z.boolean().default(true),
        }),
      )
      .max(20)
      .default([]),
  })
  .superRefine((value, context) => {
    const calculatedLessons =
      value.singlePeriods + value.doublePeriods * 2;

    if (calculatedLessons !== value.assignedLessons) {
      context.addIssue({
        code: "custom",
        path: ["assignedLessons"],
        message:
          "إجمالي الحصص يجب أن يساوي الفردية + الحصص المزدوجة × 2.",
      });
    }

    if (value.fixedSlots.length > value.assignedLessons) {
      context.addIssue({
        code: "custom",
        path: ["fixedSlots"],
        message:
          "عدد الحصص المثبتة أكبر من عدد الحصص المسندة.",
      });
    }
  });

export type TimetableProjectInput = z.infer<
  typeof timetableProjectInputSchema
>;

export type TimetableProjectMetadataInput = z.infer<
  typeof timetableProjectMetadataSchema
>;

export type TimetableTeacherInput = z.infer<
  typeof timetableTeacherInputSchema
>;

export type TimetableClassInput = z.infer<
  typeof timetableClassInputSchema
>;

export type TimetableSubjectInput = z.infer<
  typeof timetableSubjectInputSchema
>;

export type TimetableClassSubjectInput = z.infer<
  typeof timetableClassSubjectInputSchema
>;

export type TimetableAssignmentInput = z.infer<
  typeof timetableAssignmentInputSchema
>;

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
export const timetableTeacherUnavailableSlotsInputSchema = z.object({
  teacherId: z.string().trim().min(1, "المعلم مطلوب."),
  unavailableSlots: z
    .array(
      z.object({
        dayId: timetableDayIdSchema,
        periodId: z.string().trim().min(1).max(60),
      }),
    )
    .max(100, "عدد القيود أكبر من المسموح."),
});

export type TimetableTeacherUnavailableSlotsInput = z.infer<
  typeof timetableTeacherUnavailableSlotsInputSchema
>;
