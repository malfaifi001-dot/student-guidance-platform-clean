import { z } from "zod";

export const waitingPolicySchema = z.object({
  candidateCount: z.number().int().min(1).max(10),
  maxDailySubstitutions: z.number().int().min(1).max(10),
  maxWeeklySubstitutions: z.number().int().min(1).max(10),

  allowBeforeFirstLesson: z.boolean(),
  allowAfterLastLesson: z.boolean(),
  allowInsideGap: z.boolean(),
  preferInsideGap: z.boolean(),

  allowOnGoldenDay: z.boolean(),
  goldenDayEmergency: z.boolean(),

  allowAfterLateArrival: z.boolean(),
  excludeLateArrivalDay: z.boolean(),
  allowBeforeEarlyDeparture: z.boolean(),

  preventConsecutiveSubstitutions: z.boolean(),
  preventFirstPeriod: z.boolean(),
  preventLastPeriod: z.boolean(),

  requireMatchingSpecialty: z.boolean(),
  preferMatchingSpecialty: z.boolean(),

  weeklyLoadWeight: z.number().int().min(0).max(1000),
  weeklyWaitingWeight: z.number().int().min(0).max(1000),
  dailyWaitingWeight: z.number().int().min(0).max(1000),
  gapPreferenceWeight: z.number().int().min(0).max(1000),
  specialtyWeight: z.number().int().min(0).max(1000),
  firstLastFairnessWeight: z.number().int().min(0).max(1000),

  settingsJson: z
    .object({
      referenceLoad: z.number().int().min(1).max(40).optional(),
      goldenDaysByTeacher: z
        .record(z.string(), z.array(z.string()))
        .optional(),
      excludedDaysByTeacher: z
        .record(z.string(), z.array(z.string()))
        .optional(),
      excludedPeriodsByTeacher: z
        .record(z.string(), z.array(z.string()))
        .optional(),
      priorityByTeacher: z
        .record(z.string(), z.number().int().min(-100).max(100))
        .optional(),
      notesByTeacher: z
        .record(z.string(), z.string().max(1000))
        .optional(),
    })
    .optional(),
});

export const createAbsenceSchema = z.object({
  teacherId: z.string().min(1),
  absenceDate: z.string().date(),
  dayId: z.string().min(1),
  absenceType: z.enum([
    "FULL_DAY",
    "SELECTED_PERIODS",
    "LATE_ARRIVAL",
    "EARLY_DEPARTURE",
  ]),
  periodIds: z.array(z.string()).max(20).default([]),
  arrivalPeriodId: z.string().optional(),
  departurePeriodId: z.string().optional(),
  reason: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
});

export const assignSubstituteSchema = z.object({
  substitutionId: z.string().min(1),
  substituteTeacherId: z.string().min(1),
  overrideReason: z.string().max(2000).optional(),
});

export const updateSubstitutionSchema = z.object({
  substitutionId: z.string().min(1),
  status: z.enum([
    "ASSIGNED",
    "NOTIFIED",
    "COMPLETED",
    "DECLINED",
    "REASSIGNED",
    "CANCELED",
  ]),
  note: z.string().max(2000).optional(),
});

export const supervisionDutySchema = z.object({
  title: z.string().min(2).max(191),
  dutyType: z.enum([
    "MORNING",
    "BREAK",
    "GATE",
    "END_OF_DAY",
    "PRAYER",
    "BUS",
    "FLOOR",
    "CUSTOM",
  ]),
  dayId: z.string().min(1),
  periodId: z.string().optional(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  location: z.string().max(191).optional(),
  requiredTeachers: z.number().int().min(1).max(20),
  teacherIds: z.array(z.string()).max(20).default([]),
  note: z.string().max(2000).optional(),
});

export const dailyOperationsRequestSchema =
  z.discriminatedUnion("action", [
    z.object({
      action: z.literal("SAVE_POLICY"),
      data: waitingPolicySchema,
    }),
    z.object({
      action: z.literal("CREATE_ABSENCE"),
      data: createAbsenceSchema,
    }),
    z.object({
      action: z.literal("ASSIGN_SUBSTITUTE"),
      data: assignSubstituteSchema,
    }),
    z.object({
      action: z.literal("UPDATE_SUBSTITUTION"),
      data: updateSubstitutionSchema,
    }),
    z.object({
      action: z.literal("CREATE_SUPERVISION"),
      data: supervisionDutySchema,
    }),
    z.object({
      action: z.literal("DELETE_ABSENCE"),
      absenceId: z.string().min(1),
    }),
    z.object({
      action: z.literal("DELETE_SUPERVISION"),
      dutyId: z.string().min(1),
    }),
  ]);

export type WaitingPolicyInput =
  z.infer<typeof waitingPolicySchema>;

export type CreateAbsenceInput =
  z.infer<typeof createAbsenceSchema>;

export type AssignSubstituteInput =
  z.infer<typeof assignSubstituteSchema>;

export type UpdateSubstitutionInput =
  z.infer<typeof updateSubstitutionSchema>;

export type SupervisionDutyInput =
  z.infer<typeof supervisionDutySchema>;