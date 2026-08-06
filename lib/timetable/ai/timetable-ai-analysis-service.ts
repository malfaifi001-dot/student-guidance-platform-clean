import "server-only";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { prisma } from "@/lib/prisma";
import {
  timetableAiAnalysisSchema,
  type TimetableAiAnalysis,
  type TimetableAiAnalysisRequest,
} from "@/lib/timetable/ai/timetable-ai-analysis-schema";
import type {
  TimetableConstraint,
} from "@/lib/timetable/timetable-constraint-types";
import {
  getAffectedEntityArabicLabel,
  getAnalysisCategoryArabicLabel,
  getChangeTypeArabicLabel,
  getConstraintLevelArabicLabel,
  getConstraintStatusArabicLabel,
  getConstraintTypeArabicLabel,
  getDayArabicLabel,
  getFailureKindArabicLabel,
  getPeriodArabicLabel,
} from "@/lib/timetable/timetable-constraint-labels";
import { getSavedGeneratedTimetable } from "@/lib/timetable/timetable-generation-service";
import { validateTimetableProject } from "@/lib/timetable/timetable-validation-service";

type JsonRecord = Record<string, unknown>;

type DayValue = {
  id: string;
  label: string;
  order: number;
};

type PeriodValue = {
  id: string;
  label: string;
  order: number;
  isBreak?: boolean;
};

export async function analyzeTimetableWithAi(
  projectId: string,
  schoolAccountId: string,
  input: TimetableAiAnalysisRequest,
): Promise<
  | {
      found: false;
      analysis: null;
    }
  | {
      found: true;
      analysis: TimetableAiAnalysis;
      deterministicSummary: ReturnType<
        typeof buildDeterministicSummary
      >;
    }
> {
  const [
    project,
    validation,
    generated,
  ] = await Promise.all([
    prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },

      include: {
        teachers: {
          where: {
            isActive: true,
          },

          include: {
            assignments: {
              select: {
                id: true,
                assignedLessons: true,
                singlePeriods: true,
                doublePeriods: true,
              },
            },
          },

          orderBy: {
            name: "asc",
          },
        },

        classes: {
          where: {
            isActive: true,
          },

          include: {
            subjects: true,
            assignments: true,
          },

          orderBy: {
            name: "asc",
          },
        },

        subjects: {
          where: {
            isActive: true,
          },

          orderBy: {
            name: "asc",
          },
        },

        classSubjects: {
          include: {
            class: true,
            subject: true,
          },
        },

        assignments: {
          include: {
            teacher: true,
            class: true,
            subject: true,
          },
        },
      },
    }),

    validateTimetableProject(
      projectId,
      schoolAccountId,
    ),

    getSavedGeneratedTimetable(
      projectId,
      schoolAccountId,
    ),
  ]);

  if (!project || !validation.found) {
    return {
      found: false,
      analysis: null,
    };
  }

  const deterministicSummary =
    buildDeterministicSummary({
      project,
      validation,
      generated,
      generationErrors:
        input.generationErrors,
    });

  const payload = buildArabicAiPayload({
    input,
    project: {
      name: project.name,
      academicYear: project.academicYear,
      semester: project.semester,
    },
    deterministicSummary,
  });

  const messages = [
    {
      role: "system" as const,
      content: buildSystemPrompt(),
    },
    {
      role: "user" as const,
      content: JSON.stringify(payload),
    },
  ];

  const rawResponse =
    await callDeepSeekChat({
      messages,
      temperature: 0.05,
      maxTokens: 5000,
      timeoutMs: 120000,
      responseFormat: "json_object",
    });

  let parsed =
    timetableAiAnalysisSchema.safeParse(
      extractJsonObject(rawResponse),
    );

  if (!parsed.success) {
    const correctedResponse =
      await callDeepSeekChat({
        messages: [
          ...messages,

          {
            role: "assistant",
            content: rawResponse,
          },

          {
            role: "user",
            content: [
              "الرد السابق لا يطابق مخطط JSON المطلوب.",
              "صحح الرد فقط دون تغيير التحليل.",
              "أعد كائن JSON صالحًا فقط دون Markdown.",
              "لا تذكر الغياب أو الانتظار أو المناوبات.",
              "تأكد من وجود likelyRootCause وfailureKind.",
              "تأكد أن كل finding يحتوي relatedConstraintIds.",
              "تأكد أن كل recommendation يحتوي changeType.",
              "أخطاء التحقق:",
              JSON.stringify(
                parsed.error.issues.map(
                  (issue) => ({
                    path:
                      issue.path.join("."),
                    message:
                      issue.message,
                  }),
                ),
              ),
            ].join("\n"),
          },
        ],

        temperature: 0,
        maxTokens: 5000,
        timeoutMs: 120000,
        responseFormat: "json_object",
      });

    parsed =
      timetableAiAnalysisSchema.safeParse(
        extractJsonObject(
          correctedResponse,
        ),
      );
  }

  if (!parsed.success) {
    console.error(
      "TIMETABLE_AI_INVALID_RESPONSE",
      {
        issues: parsed.error.issues.map(
          (issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }),
        ),
      },
    );

    throw new Error(
      "AI_RESPONSE_INVALID",
    );
  }

  return {
    found: true,
    analysis: sanitizeVisibleAnalysis(
      parsed.data,
      deterministicSummary.constraintReferences,
      {
        hasClassCapacityOverflow:
          deterministicSummary.classCapacityRisks.length > 0,
        generationFailureKind:
          deterministicSummary.generationFailure.kind,
      },
    ),
    deterministicSummary,
  };
}

function buildDeterministicSummary(input: {
  project: {
    daysJson: unknown;
    periodsJson: unknown;
    settingsJson: unknown;

    teachers: Array<{
      id: string;
      name: string;
      specialty: string | null;
      maxWeeklyLoad: number;
      unavailableSlotsJson: unknown;

      assignments: Array<{
        id: string;
        assignedLessons: number;
        singlePeriods: number;
        doublePeriods: number;
      }>;
    }>;

    classes: Array<{
      id: string;
      name: string;
      subjects: unknown[];
      assignments: unknown[];
    }>;

    subjects: Array<{
      id: string;
      name: string;
    }>;

    classSubjects: Array<{
      classId: string;
      subjectId: string;
      weeklyLessons: number;

      class: {
        name: string;
      };

      subject: {
        name: string;
      };
    }>;

    assignments: Array<{
      id: string;
      teacherId: string;
      classId: string;
      subjectId: string;
      assignedLessons: number;
      singlePeriods: number;
      doublePeriods: number;
      fixedSlotsJson: unknown;

      teacher: {
        name: string;
      };

      class: {
        name: string;
      };

      subject: {
        name: string;
      };
    }>;
  };

  validation: {
    issues: Array<{
      level: string;
      code: string;
      message: string;
      entityId?: string;
    }>;

    summary: {
      ready: boolean;
      errorsCount: number;
      warningsCount: number;
      weeklyCapacity: number;
    } | null;
  };

  generated: {
    sessions: Array<{
      teacherName: string;
      className: string;
      subjectName: string;
      dayId: string;
      periodId: string;
    }>;

    generatedAt: string | null;
    status: string | null;
  };

  generationErrors: string[];
}) {
  const days = normalizeDays(
    input.project.daysJson,
  );

  const periods = normalizePeriods(
    input.project.periodsJson,
  );

  const teachingPeriods =
    periods.filter(
      (period) =>
        period.isBreak !== true,
    );

  const weeklyCapacity =
    days.length *
    teachingPeriods.length;
  const validSlotKeys = new Set(
    days.flatMap((day) =>
      teachingPeriods.map(
        (period) => `${day.id}:${period.id}`,
      ),
    ),
  );

  const constraints =
    getProjectConstraints(
      input.project.settingsJson,
    );

  const hardConstraints =
    constraints.filter(
      (constraint) =>
        constraint.isEnabled &&
        constraint.level === "HARD",
    );

  const preferredConstraints =
    constraints.filter(
      (constraint) =>
        constraint.isEnabled &&
        constraint.level ===
          "PREFERRED",
    );

  const teacherNameById =
    new Map(
      input.project.teachers.map(
        (teacher) => [
          teacher.id,
          teacher.name,
        ],
      ),
    );

  const classNameById =
    new Map(
      input.project.classes.map(
        (classItem) => [
          classItem.id,
          classItem.name,
        ],
      ),
    );

  const subjectNameById =
    new Map(
      input.project.subjects.map(
        (subject) => [
          subject.id,
          subject.name,
        ],
      ),
    );

  const teacherWorkloads =
    input.project.teachers.map(
      (teacher) => {
        const assignedLessons =
          teacher.assignments.reduce(
            (total, assignment) =>
              total +
              assignment.assignedLessons,
            0,
          );

        const unavailableSlots =
          normalizeUnavailableSlots(
            teacher
              .unavailableSlotsJson,
          );

        const hardUnavailable =
          calculateHardUnavailableSlots({
            teacherId: teacher.id,
            hardConstraints,
            days,
            periods:
              teachingPeriods,
          });

        const directUnavailable = new Set(
          unavailableSlots.map(
            (slot) =>
              `${slot.dayId}:${slot.periodId}`,
          ).filter((slot) => validSlotKeys.has(slot)),
        );
        const overlappingUnavailableSlots =
          [...directUnavailable].filter((slot) =>
            hardUnavailable.has(slot),
          ).length;
        const allUnavailable = new Set([
          ...directUnavailable,
          ...hardUnavailable,
        ]);

        const availableSlots =
          Math.max(
            0,
            weeklyCapacity -
              allUnavailable.size,
          );

        return {
          id: teacher.id,
          name: teacher.name,

          specialty:
            teacher.specialty ||
            "غير محدد",

          assignedLessons,

          maxWeeklyLoad:
            teacher.maxWeeklyLoad,

          remainingFromQuota:
            teacher.maxWeeklyLoad -
            assignedLessons,

          availableSlots,

          remainingAvailableSlots:
            availableSlots -
            assignedLessons,

          utilizationPercent:
            teacher.maxWeeklyLoad > 0
              ? Math.round(
                  (
                    assignedLessons /
                    teacher.maxWeeklyLoad
                  ) * 100,
                )
              : 0,

          unavailableSlots:
            allUnavailable.size,

          availabilityBreakdown: {
            weeklyCapacity,
            directUnavailableSlots:
              directUnavailable.size,
            hardConstraintUnavailableSlots:
              hardUnavailable.size,
            overlappingUnavailableSlots,
            uniqueUnavailableSlots:
              allUnavailable.size,
            availableSlots,
            assignedLessons,
            deficit: Math.max(
              0,
              assignedLessons - availableSlots,
            ),
          },

          availabilityDescription:
            assignedLessons > availableSlots
              ? `نصاب المعلم ${teacher.name} هو ${assignedLessons} حصة، بينما لا يتوفر له بعد تطبيق القيود إلا ${availableSlots} خانات أسبوعية، أي بعجز قدره ${assignedLessons - availableSlots} حصة.`
              : `نصاب المعلم ${teacher.name} هو ${assignedLessons} حصة، ويتوفر له بعد احتساب جميع خانات عدم التوفر دون تكرار ${availableSlots} خانات أسبوعية.`,

          impossibleByAvailability:
            assignedLessons >
            availableSlots,

          assignmentBlocks:
            teacher.assignments.map(
              (assignment) => ({
                assignmentId:
                  assignment.id,

                lessons:
                  assignment
                    .assignedLessons,

                singlePeriods:
                  assignment
                    .singlePeriods,

                doubleBlocks:
                  assignment
                    .doublePeriods,
              }),
            ),
        };
      },
    );

  const classRequirements =
    input.project.classes.map(
      (classItem) => {
        const classSubjects =
          input.project.classSubjects
            .filter(
              (item) =>
                item.classId ===
                classItem.id,
            );

        const weeklyLessons =
          classSubjects.reduce(
            (total, item) =>
              total +
              item.weeklyLessons,
            0,
          );

        return {
          name: classItem.name,

          weeklyLessons,

          weeklyCapacity,

          remainingSlots:
            weeklyCapacity -
            weeklyLessons,

          exceedsCapacity:
            weeklyLessons >
            weeklyCapacity,

          linkedSubjects:
            classSubjects.length,

          assignments:
            classItem
              .assignments.length,

          capacityDescription:
            weeklyLessons > weeklyCapacity
              ? `الفصل ${classItem.name} يحتاج إلى ${weeklyLessons} حصة، بينما سعته الأسبوعية ${weeklyCapacity} خانة، أي بزيادة قدرها ${weeklyLessons - weeklyCapacity} حصة.`
              : `الفصل ${classItem.name} يحتاج إلى ${weeklyLessons} حصة من أصل ${weeklyCapacity} خانة أسبوعية، وتبقى ${weeklyCapacity - weeklyLessons} خانات غير مستخدمة بصورة طبيعية.`,
        };
      },
    );

  const assignmentIntegrity =
    input.project.assignments.map(
      (assignment) => {
        const calculatedLessons =
          assignment.singlePeriods +
          assignment.doublePeriods * 2;

        const fixedSlots =
          normalizeFixedSlots(
            assignment.fixedSlotsJson,
          );

        return {
          teacher:
            assignment.teacher.name,

          className:
            assignment.class.name,

          subject:
            assignment.subject.name,

          assignedLessons:
            assignment
              .assignedLessons,

          calculatedLessons,

          singlePeriods:
            assignment
              .singlePeriods,

          doubleBlocks:
            assignment
              .doublePeriods,

          fixedSlots:
            fixedSlots.length,

          matches:
            calculatedLessons ===
            assignment
              .assignedLessons,

          doubleBlockCapacityRisk:
            assignment.doublePeriods >
            days.length,
        };
      },
    );

  const constraintsDetails = constraints.map(
      (constraint, index) => {
        const reference = `القيد رقم ${index + 1}`;
        const teacher = constraint.teacherId
          ? teacherNameById.get(constraint.teacherId) ?? null
          : null;
        const className = constraint.classId
          ? classNameById.get(constraint.classId) ?? null
          : null;
        const subject = constraint.subjectId
          ? subjectNameById.get(constraint.subjectId) ?? null
          : null;
        const day = getDayArabicLabel(constraint.dayId, days);
        const selectedDays = (constraint.dayIds ?? [])
          .map((dayId) => getDayArabicLabel(dayId, days))
          .filter((label): label is string => Boolean(label));
        const period = getPeriodArabicLabel(
          constraint.periodId,
          teachingPeriods,
        );
        const title = getConstraintTypeArabicLabel(constraint.type);

        return {
          internalId: constraint.id,
          reference,
          title,
          level: getConstraintLevelArabicLabel(constraint.level),
          status: getConstraintStatusArabicLabel(constraint.isEnabled),
          enabled: constraint.isEnabled,
          levelKey: constraint.level,

        teacher:
          teacher,

        className:
          className,

        subject:
          subject,

        day,
        days: selectedDays,
        period,

        value:
          constraint.value ??
          null,

        weight:
          constraint.weight ??
          null,

        isLocked:
          constraint.isLocked ??
          null,

        valueDescription: getConstraintValueDescription(constraint),
        summary: buildConstraintArabicSummary({
          constraint,
          title,
          teacher,
          className,
          subject,
          day,
          days: selectedDays,
          period,
        }),
      };
    });

  const generationFailure =
    classifyGenerationFailure(
      input.generationErrors,
    );

  return {
    scope: "TIMETABLE_GENERATION_ONLY",

    capacity: {
      days: days.length,

      periodsPerDay:
        teachingPeriods.length,

      weeklyCapacity,

      validationWeeklyCapacity:
        input.validation.summary
          ?.weeklyCapacity || 0,
    },

    totals: {
      teachers:
        input.project.teachers.length,

      classes:
        input.project.classes.length,

      subjects:
        input.project.subjects.length,

      classSubjects:
        input.project
          .classSubjects.length,

      assignments:
        input.project
          .assignments.length,

      generatedSessions:
        input.generated
          .sessions.length,

      enabledHardConstraints:
        hardConstraints.length,

      enabledPreferredConstraints:
        preferredConstraints.length,

      disabledConstraints:
        constraints.filter(
          (constraint) =>
            !constraint.isEnabled,
        ).length,
    },

    generationFailure,

    validation: {
      ready:
        input.validation.summary
          ?.ready || false,

      errors:
        input.validation.issues.filter(
          (issue) =>
            issue.level === "ERROR",
        ),

      warnings:
        input.validation.issues.filter(
          (issue) =>
            issue.level ===
            "WARNING",
        ),
    },

    teacherWorkloads,

    overloadedTeachers:
      teacherWorkloads.filter(
        (teacher) =>
          teacher.remainingFromQuota <
          0,
      ),

    availabilityRisks:
      teacherWorkloads.filter(
        (teacher) =>
          teacher
            .impossibleByAvailability ||
          teacher
            .remainingAvailableSlots <=
            2,
      ),

    highLoadTeachers:
      teacherWorkloads.filter(
        (teacher) =>
          teacher
            .utilizationPercent >= 90,
      ),

    classRequirements,

    classCapacityRisks:
      classRequirements.filter(
        (classItem) =>
          classItem.exceedsCapacity,
      ),

    unusedClassCapacity:
      classRequirements.filter(
        (classItem) =>
          !classItem.exceedsCapacity &&
          classItem.remainingSlots > 0,
      ),

    assignmentIntegrity,

    invalidAssignments:
      assignmentIntegrity.filter(
        (assignment) =>
          !assignment.matches,
      ),

    doubleBlockRisks:
      assignmentIntegrity.filter(
        (assignment) =>
          assignment.doubleBlocks > 0,
      ),

    constraints:
      constraintsDetails,

    constraintReferences:
      constraintsDetails.map((constraint) => ({
        reference: constraint.reference,
        internalId: constraint.internalId,
        title: constraint.title,
      })),

    hardConstraints:
      constraintsDetails.filter(
        (constraint) =>
          constraint.enabled &&
          constraint.levelKey === "HARD",
      ),

    preferredConstraints:
      constraintsDetails.filter(
        (constraint) =>
          constraint.enabled &&
          constraint.levelKey ===
            "PREFERRED",
      ),

    generatedDistribution: {
      byTeacher: countBy(
        input.generated.sessions,
        (session) =>
          session.teacherName,
      ),

      byClass: countBy(
        input.generated.sessions,
        (session) =>
          session.className,
      ),

      generatedAt:
        input.generated.generatedAt,

      status:
        input.generated.status,
    },
  };
}

function classifyGenerationFailure(
  errors: string[],
) {
  if (!errors.length) {
    return {
      hasFailure: false,
      kind: "NONE",
      errors: [],
    };
  }

  const normalized =
    errors.join(" ");

  if (
    normalized.includes(
      "انتهت مهلة البحث",
    )
  ) {
    return {
      hasFailure: true,
      kind: "SEARCH_TIMEOUT",
      errors,
    };
  }

  if (
    normalized.includes(
      "القيود الإلزامية",
    )
  ) {
    return {
      hasFailure: true,
      kind:
        "HARD_CONSTRAINT_FAILURE",
      errors,
    };
  }

  return {
    hasFailure: true,
    kind: "UNKNOWN_FAILURE",
    errors,
  };
}

function buildArabicAiPayload(input: {
  input: TimetableAiAnalysisRequest;
  project: {
    name: string;
    academicYear: string;
    semester: string;
  };
  deterministicSummary: ReturnType<typeof buildDeterministicSummary>;
}) {
  const summary = input.deterministicSummary;
  const modeLabels: Record<TimetableAiAnalysisRequest["mode"], string> = {
    FULL_REVIEW: "مراجعة شاملة",
    PRE_GENERATION: "مراجعة قبل التوليد",
    GENERATION_FAILURE: "تحليل فشل التوليد",
    WORKLOAD_REVIEW: "مراجعة النصاب والتوزيع",
  };

  return {
    "نوع التحليل": modeLabels[input.input.mode],
    "سؤال المدير": input.input.question || null,
    "نطاق التحليل": {
      "يشمل": [
        "بيانات مشروع الجدول",
        "أنصبة المعلمين وتوفرهم",
        "سعة الفصول والإسنادات",
        "الحصص الفردية والمزدوجة والمثبتة",
        "القيود الإلزامية والتفضيلية",
        "نتائج التحقق وفشل التوليد",
      ],
      "لا يشمل": [
        "الغياب اليومي",
        "الانتظار والبدلاء",
        "المناوبات والإشراف",
      ],
    },
    "المشروع": {
      "الاسم": input.project.name,
      "العام الدراسي": input.project.academicYear,
      "الفصل الدراسي": input.project.semester,
    },
    "السعة الأسبوعية": {
      "أيام العمل": summary.capacity.days,
      "الحصص اليومية": summary.capacity.periodsPerDay,
      "إجمالي الخانات": summary.capacity.weeklyCapacity,
    },
    "نتيجة فشل التوليد": {
      "التصنيف": getFailureKindArabicLabel(summary.generationFailure.kind),
      "الرسائل": summary.generationFailure.errors,
    },
    "نتائج التحقق": {
      "جاهز": summary.validation.ready ? "نعم" : "لا",
      "أخطاء مانعة": summary.validation.errors.map((issue) => issue.message),
      "تحذيرات": summary.validation.warnings.map((issue) => issue.message),
    },
    "أنصبة المعلمين وتوفرهم": summary.teacherWorkloads.map((teacher) => ({
      "المعلم": teacher.name,
      "التخصص": teacher.specialty,
      "النصاب المسند": teacher.assignedLessons,
      "الحد الأعلى للنصاب": teacher.maxWeeklyLoad,
      "السعة الأسبوعية": teacher.availabilityBreakdown.weeklyCapacity,
      "خانات عدم التوفر المباشرة": teacher.availabilityBreakdown.directUnavailableSlots,
      "خانات عدم التوفر الناتجة عن القيود الإلزامية": teacher.availabilityBreakdown.hardConstraintUnavailableSlots,
      "الخانات المتداخلة المحتسبة مرة واحدة": teacher.availabilityBreakdown.overlappingUnavailableSlots,
      "إجمالي خانات عدم التوفر الفريدة": teacher.availabilityBreakdown.uniqueUnavailableSlots,
      "الخانات المتاحة": teacher.availabilityBreakdown.availableSlots,
      "العجز": teacher.availabilityBreakdown.deficit,
      "الوصف": teacher.availabilityDescription,
    })),
    "متطلبات الفصول": summary.classRequirements.map((classItem) => ({
      "الفصل": classItem.name,
      "الحصص المطلوبة": classItem.weeklyLessons,
      "السعة الأسبوعية": classItem.weeklyCapacity,
      "الخانات غير المستخدمة": Math.max(0, classItem.remainingSlots),
      "يتجاوز السعة": classItem.exceedsCapacity ? "نعم" : "لا",
      "الوصف": classItem.capacityDescription,
      "ملاحظة": classItem.exceedsCapacity
        ? "هذه مشكلة سعة مانعة."
        : "الخانات غير المستخدمة معلومة تنظيمية وليست مانعًا للتوليد.",
    })),
    "سلامة الإسنادات": summary.assignmentIntegrity.map((assignment) => ({
      "المعلم": assignment.teacher,
      "الفصل": assignment.className,
      "المادة": assignment.subject,
      "الحصص المسندة": assignment.assignedLessons,
      "الحصص الفردية": assignment.singlePeriods,
      "الكتل المزدوجة": assignment.doubleBlocks,
      "الحصص المثبتة": assignment.fixedSlots,
      "الحساب متطابق": assignment.matches ? "نعم" : "لا",
    })),
    "القيود": summary.constraints.map((constraint) => ({
      "المرجع": constraint.reference,
      "العنوان": constraint.title,
      "المستوى": constraint.level,
      "الحالة": constraint.status,
      "المعلم": constraint.teacher,
      "الفصل": constraint.className,
      "المادة": constraint.subject,
      "اليوم": constraint.day,
      "الأيام": constraint.days.length ? constraint.days.join("، ") : null,
      "الحصة": constraint.period,
      "القيمة": constraint.valueDescription,
      "الوصف": constraint.summary,
    })),
    "ملاحظات السعة غير المستغلة": summary.unusedClassCapacity.map(
      (classItem) => classItem.capacityDescription,
    ),
  };
}

function getConstraintValueDescription(constraint: TimetableConstraint) {
  if (typeof constraint.value !== "number") {
    return null;
  }

  if (constraint.type.includes("PERIODS") || constraint.type.includes("OCCURRENCES")) {
    return `${constraint.value} حصة`;
  }

  if (constraint.type.includes("DAYS")) {
    return `${constraint.value} أيام`;
  }

  if (constraint.type.includes("GAPS")) {
    return `${constraint.value} فجوات`;
  }

  return `القيمة المحددة: ${constraint.value}`;
}

function buildConstraintArabicSummary(input: {
  constraint: TimetableConstraint;
  title: string;
  teacher: string | null;
  className: string | null;
  subject: string | null;
  day: string | null;
  days: string[];
  period: string | null;
}) {
  const entity = input.teacher
    ? `المعلم ${input.teacher}`
    : input.className
      ? `الفصل ${input.className}`
      : input.subject
        ? `المادة ${input.subject}`
        : "المدرسة";
  const place = [
    input.day || (input.days.length ? input.days.join("، ") : null),
    input.period,
  ].filter(Boolean).join("، ");
  const value = getConstraintValueDescription(input.constraint);

  if (input.constraint.type === "TEACHER_NOT_BEFORE_PERIOD" && input.teacher && input.period) {
    return `المعلم ${input.teacher} لا يمكن إسناده قبل ${input.period} في جميع أيام الدراسة.`;
  }
  if (input.constraint.type === "TEACHER_NOT_AFTER_PERIOD" && input.teacher && input.period) {
    return `المعلم ${input.teacher} لا يمكن إسناده بعد ${input.period} في جميع أيام الدراسة.`;
  }

  return `${input.title} على ${entity}${place ? ` في ${place}` : ""}${value ? `، ${value}` : ""}.`;
}

function sanitizeVisibleAnalysis(
  analysis: TimetableAiAnalysis,
  constraintReferences: Array<{
    reference: string;
    internalId: string;
    title: string;
  }>,
  context: {
    hasClassCapacityOverflow: boolean;
    generationFailureKind: string;
  },
): TimetableAiAnalysis {
  const referenceByInternalId = new Map(
    constraintReferences.map((item) => [item.internalId, item.reference]),
  );
  const allowedReferences = new Set(
    constraintReferences.map((item) => item.reference),
  );
  const constraintByReference = new Map(
    constraintReferences.map((item) => [item.reference, item]),
  );

  const underflowClaimPattern =
    /خانات\s+(?:فارغة|غير مستخدمة)|سعة\s+أسبوعية\s+غير\s+مستغلة/;
  const likelyRootCause =
    !context.hasClassCapacityOverflow &&
    underflowClaimPattern.test(analysis.likelyRootCause)
      ? context.generationFailureKind === "SEARCH_TIMEOUT"
        ? "انتهت مهلة البحث قبل الوصول إلى نتيجة، ولا يثبت ذلك استحالة إنشاء الجدول."
        : "لم يثبت أن الخانات الأسبوعية غير المستخدمة تمنع إنشاء الجدول؛ فهي سعة متاحة ما لم يفرض قيد إلزامي ملء جميع الخانات."
      : analysis.likelyRootCause;

  return {
    ...analysis,
    summary: sanitizeVisibleText(analysis.summary),
    likelyRootCause: sanitizeVisibleText(likelyRootCause),
    safeNextStep: sanitizeVisibleText(analysis.safeNextStep),
    assumptions: analysis.assumptions.map(sanitizeVisibleText),
    disclaimer: sanitizeVisibleText(analysis.disclaimer),
    findings: analysis.findings.map((finding) => {
      const safeReferences = finding.relatedConstraintIds.flatMap((value) => {
        const reference = referenceByInternalId.get(value) ?? value;
        return allowedReferences.has(reference) ? [reference] : [];
      });

      const informationalCapacity =
        finding.category === "CLASS_CAPACITY" &&
        !context.hasClassCapacityOverflow;

      return {
        ...finding,
        severity: informationalCapacity ? "INFO" : finding.severity,
        title: informationalCapacity
          ? "سعة أسبوعية غير مستغلة"
          : sanitizeVisibleText(finding.title),
        explanation: informationalCapacity
          ? "وجود خانات غير مستخدمة في جدول الفصل أمر طبيعي، ولا يُعد مانعًا للتوليد ما لم يوجد قيد إلزامي يطلب ملء الجدول كاملًا."
          : sanitizeVisibleText(finding.explanation),
        evidence: finding.evidence.map(sanitizeEvidenceText),
        affectedEntities: finding.affectedEntities.map((entity) => ({
          type: getAffectedEntityArabicLabel(entity.type),
          name: sanitizeVisibleText(entity.name),
        })),
        relatedConstraintIds: safeReferences,
        relatedConstraints: safeReferences.flatMap((reference) => {
          const constraint = constraintByReference.get(reference);
          return constraint
            ? [{ reference, title: constraint.title }]
            : [];
        }),
      };
    }),
    recommendations: analysis.recommendations.map((recommendation) => ({
      ...recommendation,
      title: sanitizeVisibleText(recommendation.title),
      action: sanitizeVisibleText(recommendation.action),
      expectedImpact: sanitizeVisibleText(recommendation.expectedImpact),
    })),
  };
}

function sanitizeEvidenceText(value: string) {
  const assignedLessons = readTechnicalNumber(value, "assignedLessons");
  const availableSlots = readTechnicalNumber(value, "availableSlots");
  if (assignedLessons !== null && availableSlots !== null) {
    const difference = availableSlots - assignedLessons;
    return difference < 0
      ? `النصاب المسند هو ${assignedLessons} حصة، بينما المتاح ${availableSlots} خانات أسبوعية، أي بعجز قدره ${Math.abs(difference)} حصة.`
      : `النصاب المسند هو ${assignedLessons} حصة، والمتاح ${availableSlots} خانات أسبوعية، وتتبقى ${difference} خانات.`;
  }

  const weeklyLessons = readTechnicalNumber(value, "weeklyLessons");
  const weeklyCapacity = readTechnicalNumber(value, "weeklyCapacity");
  if (weeklyLessons !== null && weeklyCapacity !== null) {
    const difference = weeklyCapacity - weeklyLessons;
    return difference < 0
      ? `الحصص المطلوبة أسبوعيًا هي ${weeklyLessons} حصة، بينما السعة ${weeklyCapacity} خانة، أي بزيادة قدرها ${Math.abs(difference)} حصة.`
      : `الحصص المطلوبة أسبوعيًا هي ${weeklyLessons} حصة من أصل ${weeklyCapacity} خانة، وتبقى ${difference} خانات غير مستخدمة.`;
  }

  if (/\{[\s\S]*\}|\[[\s\S]*\]/.test(value)) {
    return "تفاصيل الدليل موضحة بالمسميات العربية في وصف المشكلة.";
  }
  return sanitizeVisibleText(value);
}

function readTechnicalNumber(value: string, key: string) {
  const match = value.match(new RegExp(`${key}\\s*=\\s*(-?\\d+)`, "i"));
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeVisibleText(value: string) {
  let result = value.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    "معرّف داخلي محجوب",
  );
  result = result.replace(/\bc[a-z0-9]{20,}\b/gi, "معرّف داخلي محجوب");
  result = result.replace(
    /\{[^{}]*\}|\[[^\[\]]*\]/g,
    "تفاصيل مهيأة بالمسميات العربية",
  );

  const replacements: Array<[string, string]> = [
    ...Object.keys({
      TEACHER_UNAVAILABLE_SLOT: true,
      TEACHER_DAY_OFF: true,
      TEACHER_NOT_BEFORE_PERIOD: true,
      TEACHER_NOT_AFTER_PERIOD: true,
      TEACHER_MAX_DAILY_PERIODS: true,
      TEACHER_MAX_CONSECUTIVE_PERIODS: true,
      TEACHER_MAX_DAILY_GAPS: true,
      SUBJECT_FORBIDDEN_SLOT: true,
      SUBJECT_FIXED_SLOT: true,
      SUBJECT_MAX_DAILY_OCCURRENCES: true,
      SCHOOL_BLOCKED_SLOT: true,
      CLASS_NO_INTERNAL_GAPS: true,
      CLASS_MAX_HEAVY_SUBJECTS_DAILY: true,
      FAIR_FIRST_PERIODS: true,
      FAIR_LAST_PERIODS: true,
      TEACHER_WORKING_DAYS: true,
      TEACHER_MIN_DAILY_PERIODS: true,
      TEACHER_NO_SINGLE_PERIOD_DAY: true,
      SUBJECT_MIN_DISTRIBUTION_DAYS: true,
      NO_CONSECUTIVE_HEAVY_SUBJECTS: true,
      SUBJECT_REQUIRED_DOUBLE_PERIODS: true,
      CLASS_MAX_PERIODS_ON_DAY: true,
      SCHOOL_MAX_PERIODS_ON_DAY: true,
      SUBJECT_ROOM_REQUIREMENT: true,
      ROOM_UNAVAILABLE_SLOT: true,
    }).map((type) => [
      type,
      getConstraintTypeArabicLabel(type as TimetableConstraint["type"]),
    ] as [string, string]),
    ["assignedLessons", "الحصص المسندة"],
    ["availableSlots", "الخانات المتاحة"],
    ["remainingAvailableSlots", "الخانات المتبقية"],
    ["weeklyLessons", "الحصص الأسبوعية"],
    ["weeklyCapacity", "السعة الأسبوعية"],
    ["remainingSlots", "الخانات غير المستخدمة"],
    ["impossibleByAvailability", "عجز التوفر"],
    ["HARD", "إلزامي"],
    ["PREFERRED", "تفضيلي"],
    ["READY_WITH_WARNINGS", "جاهز مع ملاحظات"],
    ["NOT_READY", "غير جاهز"],
    ["SEARCH_TIMEOUT", getFailureKindArabicLabel("SEARCH_TIMEOUT")],
    ["PROVEN_CONFLICT", getFailureKindArabicLabel("PROVEN_CONFLICT")],
    ["LIKELY_CONSTRAINT_CONFLICT", getFailureKindArabicLabel("LIKELY_CONSTRAINT_CONFLICT")],
    ["VALIDATION_ERROR", getFailureKindArabicLabel("VALIDATION_ERROR")],
    ["CAPACITY_PROBLEM", getFailureKindArabicLabel("CAPACITY_PROBLEM")],
    ["ASSIGNMENT_PROBLEM", getFailureKindArabicLabel("ASSIGNMENT_PROBLEM")],
    ["DATA_FIX", getChangeTypeArabicLabel("DATA_FIX")],
    ["CONSTRAINT_DISABLE", getChangeTypeArabicLabel("CONSTRAINT_DISABLE")],
    ["CONSTRAINT_VALUE_CHANGE", getChangeTypeArabicLabel("CONSTRAINT_VALUE_CHANGE")],
    ["ASSIGNMENT_CHANGE", getChangeTypeArabicLabel("ASSIGNMENT_CHANGE")],
    ["AVAILABILITY_CHANGE", getChangeTypeArabicLabel("AVAILABILITY_CHANGE")],
  ];

  for (const category of [
    "CLASS_CAPACITY",
    "DOUBLE_PERIOD",
    "FIXED_SLOT",
    "DISTRIBUTION",
    "AVAILABILITY",
    "ASSIGNMENT",
    "GENERATION",
    "CONSTRAINT",
    "WORKLOAD",
    "DATA",
  ]) {
    replacements.push([category, getAnalysisCategoryArabicLabel(category)]);
  }

  for (const [source, target] of replacements) {
    result = result.replaceAll(source, target);
  }

  return result;
}

function buildSystemPrompt() {
  return `
أنت مستشار خبير في حل مشكلات إنشاء الجداول المدرسية.

نطاق عملك في هذا الطلب محصور في:
- بيانات مشروع الجدول.
- نصاب المعلمين.
- أوقات عدم توفر المعلمين.
- سعة الفصول الأسبوعية.
- الإسنادات.
- الحصص الفردية.
- الكتل المزدوجة.
- الحصص المثبتة.
- القيود الإلزامية والتفضيلية.
- نتائج فحص البيانات.
- سبب فشل محرك التوليد.
- توزيع الجدول المولد إن وجد.

ممنوع تمامًا في هذا التحليل:
- تحليل الغياب اليومي.
- تحليل الانتظار.
- تحليل البدلاء.
- تحليل المناوبات.
- تحليل الإشراف.
- ذكر التشغيل اليومي.

المطلوب:
1. اكتب جميع النصوص الظاهرة بالعربية فقط، واستخدم المسميات العربية المرفقة كما هي.
2. لا تذكر مفاتيح التعداد الإنجليزية أو معرّفات قاعدة البيانات أو UUID أو أسماء الحقول البرمجية أو أجزاء JSON داخل الشرح والأدلة.
3. حدد السبب الأرجح، وفرّق بوضوح بين مانع مؤكد، ومانع محتمل، وتحذير، ومعلومة تنظيمية.
4. اربط كل مانع بدليل حسابي موفر أو بمرجع قيد آمن مثل «القيد رقم 1» فقط.
5. الخانات غير المستخدمة في جدول الفصل معلومة تنظيمية وليست مانعًا، ما لم توجد قاعدة إلزامية صريحة تتطلب ملء جميع الخانات.
6. انتهاء مهلة البحث لا يثبت استحالة الجدول؛ صفه كمهلة، ولا تدّعِ الاستحالة دون تعارض حسابي مؤكد.
7. ابدأ بأقل تغيير آمن، ولا تقترح تعطيل قيد أو تخفيفه إلا عند إثبات علاقته المباشرة بالمانع.
8. لا تخترع قيدًا أو معلومة، ولا تطبق أي تغيير، واجعل القرار النهائي للمدير.
9. استخدم في affectedEntities القيم العربية فقط: معلم، فصل، مادة، قيد، إسناد.
10. استخدم في relatedConstraintIds المراجع الآمنة المرفقة فقط، ولا تستخدم أي معرّف داخلي.
11. اجعل evidence جملًا عربية مكتملة وسهلة للمدير، ولا تضع فيها صيغ key=value أو JSON.
12. اقترح إعادة المحاولة أولًا إذا كان الفشل مهلة فقط ولا يوجد تعارض مؤكد.
13. أعد كائن JSON صالحًا فقط دون Markdown.

شكل JSON:
{
  "summary": "الخلاصة التنفيذية",
  "likelyRootCause": "السبب الأرجح",
  "healthScore": 0,
  "readiness": "READY | READY_WITH_WARNINGS | NOT_READY | UNKNOWN",
  "failureKind": "NONE | VALIDATION_ERROR | PROVEN_CONFLICT | LIKELY_CONSTRAINT_CONFLICT | SEARCH_TIMEOUT | CAPACITY_PROBLEM | ASSIGNMENT_PROBLEM | UNKNOWN",
  "findings": [
    {
      "id": "finding-1",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "category": "DATA | WORKLOAD | CONSTRAINT | GENERATION | CLASS_CAPACITY | ASSIGNMENT | AVAILABILITY | DOUBLE_PERIOD | FIXED_SLOT | DISTRIBUTION | OTHER",
      "title": "عنوان",
      "explanation": "شرح",
      "evidence": ["دليل"],
      "affectedEntities": [
        {
          "type": "TEACHER | CLASS | SUBJECT | CONSTRAINT | ASSIGNMENT",
          "name": "الاسم"
        }
      ],
      "relatedConstraintIds": [],
      "confidence": 0
    }
  ],
  "recommendations": [
    {
      "id": "recommendation-1",
      "priority": 1,
      "title": "عنوان الحل",
      "action": "الإجراء المقترح",
      "expectedImpact": "الأثر المتوقع",
      "risk": "LOW | MEDIUM | HIGH",
      "changeType": "NO_CHANGE | DATA_FIX | CONSTRAINT_TO_PREFERRED | CONSTRAINT_DISABLE | CONSTRAINT_VALUE_CHANGE | ASSIGNMENT_CHANGE | AVAILABILITY_CHANGE | DOUBLE_PERIOD_CHANGE | RETRY_GENERATION | OTHER",
      "requiresApproval": true,
      "relatedFindingIds": []
    }
  ],
  "safeNextStep": "أقل إجراء آمن",
  "assumptions": [],
  "disclaimer": "التحليل استشاري ولا يطبق أي تغيير تلقائيًا."
}
`.trim();
}

function getProjectConstraints(
  settingsJson: unknown,
): TimetableConstraint[] {
  const settings =
    normalizeRecord(settingsJson);

  const constraintsSettings =
    normalizeRecord(
      settings.constraints,
    );

  if (
    !Array.isArray(
      constraintsSettings.items,
    )
  ) {
    return [];
  }

  return constraintsSettings.items.filter(
    (
      item,
    ): item is TimetableConstraint =>
      Boolean(
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
      ),
  );
}

function calculateHardUnavailableSlots({
  teacherId,
  hardConstraints,
  days,
  periods,
}: {
  teacherId: string;
  hardConstraints: TimetableConstraint[];
  days: DayValue[];
  periods: PeriodValue[];
}) {
  const result = new Set<string>();

  const periodIndexById =
    new Map(
      periods.map(
        (period, index) => [
          period.id,
          index,
        ],
      ),
    );

  for (const constraint of hardConstraints) {
    if (
      constraint.teacherId !==
      teacherId
    ) {
      continue;
    }

    if (
      constraint.type ===
        "TEACHER_UNAVAILABLE_SLOT" &&
      constraint.dayId &&
      constraint.periodId
    ) {
      result.add(
        `${constraint.dayId}:${constraint.periodId}`,
      );
    }

    if (
      constraint.type ===
        "TEACHER_DAY_OFF" &&
      constraint.dayId
    ) {
      for (const period of periods) {
        result.add(
          `${constraint.dayId}:${period.id}`,
        );
      }
    }

    if (
      constraint.type ===
        "TEACHER_NOT_BEFORE_PERIOD" &&
      constraint.periodId
    ) {
      const limit =
        periodIndexById.get(
          constraint.periodId,
        );

      if (limit !== undefined) {
        for (const day of days) {
          for (
            let index = 0;
            index < limit;
            index += 1
          ) {
            result.add(
              `${day.id}:${periods[index].id}`,
            );
          }
        }
      }
    }

    if (
      constraint.type ===
        "TEACHER_NOT_AFTER_PERIOD" &&
      constraint.periodId
    ) {
      const limit =
        periodIndexById.get(
          constraint.periodId,
        );

      if (limit !== undefined) {
        for (const day of days) {
          for (
            let index = limit + 1;
            index < periods.length;
            index += 1
          ) {
            result.add(
              `${day.id}:${periods[index].id}`,
            );
          }
        }
      }
    }
  }

  return result;
}

function normalizeDays(
  value: unknown,
): DayValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record =
        normalizeRecord(item);

      return {
        id:
          typeof record.id === "string"
            ? record.id
            : "",

        label:
          typeof record.label ===
          "string"
            ? record.label
            : "",

        order:
          typeof record.order ===
          "number"
            ? record.order
            : index,
      };
    })
    .filter((day) => day.id);
}

function normalizePeriods(
  value: unknown,
): PeriodValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record =
        normalizeRecord(item);

      return {
        id:
          typeof record.id === "string"
            ? record.id
            : "",

        label:
          typeof record.label ===
          "string"
            ? record.label
            : "",

        order:
          typeof record.order ===
          "number"
            ? record.order
            : index,

        isBreak:
          record.isBreak === true,
      };
    })
    .filter((period) => period.id);
}

function normalizeUnavailableSlots(
  value: unknown,
): Array<{
  dayId: string;
  periodId: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record =
      normalizeRecord(item);

    const dayId =
      typeof record.dayId ===
      "string"
        ? record.dayId
        : "";

    const periodId =
      typeof record.periodId ===
      "string"
        ? record.periodId
        : "";

    return dayId && periodId
      ? [
          {
            dayId,
            periodId,
          },
        ]
      : [];
  });
}

function normalizeFixedSlots(
  value: unknown,
): Array<{
  dayId: string;
  periodId: string;
}> {
  return normalizeUnavailableSlots(
    value,
  );
}

function extractJsonObject(
  value: string,
) {
  const cleaned = value
    .replace(/^\uFEFF/, "")
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      "",
    )
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectText =
      findBalancedJsonObject(cleaned);

    if (!objectText) {
      throw new Error(
        "AI_RESPONSE_INVALID",
      );
    }

    return JSON.parse(objectText);
  }
}

function findBalancedJsonObject(
  value: string,
) {
  let start = -1;
  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const character = value[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === '"') {
        insideString = false;
      }

      continue;
    }

    if (character === '"') {
      insideString = true;
      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        start = index;
      }

      depth += 1;
      continue;
    }

    if (character === "}") {
      if (depth === 0) {
        continue;
      }

      depth -= 1;

      if (
        depth === 0 &&
        start >= 0
      ) {
        return value.slice(
          start,
          index + 1,
        );
      }
    }
  }

  return null;
}

function normalizeRecord(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function countBy<T>(
  values: T[],
  getKey: (value: T) => string,
) {
  const result: Record<string, number> = {};

  for (const value of values) {
    const key = getKey(value);

    result[key] =
      (result[key] || 0) + 1;
  }

  return result;
}
