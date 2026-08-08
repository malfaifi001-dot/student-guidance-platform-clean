import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  TIMETABLE_V2_CURRICULUM_PLANS,
} from "./curriculum-catalog";

import {
  buildTimetableV2TemplateItems,
  normalizeTimetableV2PlanText,
  normalizeTimetableV2SubjectKey,
  validateTimetableV2CustomCurriculumItems,
  TIMETABLE_V2_CUSTOM_PLAN_MAX_ITEMS,
  TIMETABLE_V2_CUSTOM_PLAN_MAX_NAME,
  type CustomCurriculumItemInput,
  type SchoolCurriculumTemplateSummary,
  type SubjectBankEntry,
} from "./custom-curriculum-types";

export function getTimetableV2SystemSubjectBank() {
  const byKey = new Map<
    string,
    {
      name: string;
      stageIds: Set<
        "ELEMENTARY" | "MIDDLE" | "HIGH"
      >;
    }
  >();

  for (
    const plan of
    TIMETABLE_V2_CURRICULUM_PLANS
  ) {
    for (
      const subject of
      plan.subjects
    ) {
      const name =
        normalizeTimetableV2PlanText(
          subject.canonicalName,
        );

      if (!name) {
        continue;
      }

      const key =
        normalizeTimetableV2SubjectKey(
          name,
        );

      const existing =
        byKey.get(key);

      if (existing) {
        existing.stageIds.add(
          plan.stageId,
        );

        continue;
      }

      byKey.set(key, {
        name,
        stageIds: new Set([
          plan.stageId,
        ]),
      });
    }
  }

  return [...byKey.entries()]
    .map(
      ([key, value]) => ({
        key: `system:${key}`,
        name: value.name,
        isSystem: true as const,
        stageIds: [
          ...value.stageIds,
        ],
      }),
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "ar",
      ),
    );
}

export async function listTimetableV2SubjectBank(
  schoolAccountId: string,
) {
  const systemSubjects =
    getTimetableV2SystemSubjectBank();

  const systemKeys = new Set(
    systemSubjects.map((subject) =>
      normalizeTimetableV2SubjectKey(
        subject.name,
      ),
    ),
  );

  const customEntries =
    await prisma.timetableSubjectBankEntry.findMany(
      {
        where: {
          schoolAccountId,
        },

        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
        },
      },
    );

  const subjects: SubjectBankEntry[] =
    systemSubjects;

  const seenCustomKeys = new Set(
    systemKeys,
  );

  for (
    const entry of
    customEntries
  ) {
    const key =
      normalizeTimetableV2SubjectKey(
        entry.name,
      );

    if (
      seenCustomKeys.has(
        key,
      )
    ) {
      continue;
    }

    seenCustomKeys.add(key);

    subjects.push({
      key: `custom:${entry.id}`,
      name: entry.name,
      isSystem: false,
    });
  }

  subjects.sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );

  return {
    subjects,
  };
}

export async function addTimetableV2SchoolSubject(
  schoolAccountId: string,
  name: string,
): Promise<SubjectBankEntry> {
  const trimmed = normalizeTimetableV2PlanText(
    name ?? "",
  );

  if (!trimmed) {
    throw new Error(
      "SUBJECT_NAME_REQUIRED",
    );
  }

  if (
    trimmed.length >
    TIMETABLE_V2_CUSTOM_PLAN_MAX_NAME
  ) {
    throw new Error(
      "SUBJECT_NAME_TOO_LONG",
    );
  }

  const key =
    normalizeTimetableV2SubjectKey(
      trimmed,
    );

  const systemSubject =
    getTimetableV2SystemSubjectBank().find(
      (candidate) =>
        normalizeTimetableV2SubjectKey(
          candidate.name,
        ) === key,
    );

  if (systemSubject) {
    return systemSubject;
  }

  const allEntries =
    await prisma.timetableSubjectBankEntry.findMany(
      {
        where: {
          schoolAccountId,
        },

        select: {
          id: true,
          name: true,
        },
      },
    );

  const match =
    allEntries.find(
      (entry) =>
        normalizeTimetableV2SubjectKey(
          entry.name,
        ) === key,
    );

  if (match) {
    return {
      key: `custom:${match.id}`,
      name: match.name,
      isSystem: false,
    };
  }

  const created =
    await prisma.timetableSubjectBankEntry.create(
      {
        data: {
          schoolAccountId,
          name: trimmed,
        },
        select: {
          id: true,
          name: true,
        },
      },
    );

  return {
    key: `custom:${created.id}`,
    name: created.name,
    isSystem: false,
  };
}

function toTemplateSummary(
  row: {
    id: string;
    name: string;
    stageId: string | null;
    gradeId: string | null;
    semesterId: string | null;
    updatedAt: Date;
    items: Array<{
      subjectName: string;
      weeklyLessons: number;
      singlePeriods: number;
      doublePeriods: number;
    }>;
  },
): SchoolCurriculumTemplateSummary {
  const items: CustomCurriculumItemInput[] =
    row.items.map((item) => ({
      subjectName:
        item.subjectName,

      weeklyLessons:
        item.weeklyLessons,

      singlePeriods:
        item.singlePeriods,

      doublePeriods:
        item.doublePeriods,
    }));

  return {
    id: row.id,
    name: row.name,
    stageId: row.stageId,
    gradeId: row.gradeId,
    semesterId: row.semesterId,

    subjectCount: items.length,

    totalWeeklyLessons:
      items.reduce(
        (sum, item) =>
          sum +
          item.weeklyLessons,
        0,
      ),

    items,

    updatedAt:
      row.updatedAt.toISOString(),
  };
}

export async function listTimetableV2SchoolCurriculumTemplates(
  schoolAccountId: string,
  query?: {
    gradeId?: string;
  },
) {
  const where: Prisma.TimetableCurriculumTemplateWhereInput =
    {
      schoolAccountId,
    };

  if (query?.gradeId) {
    where.gradeId = query.gradeId;
  }

  const rows =
    await prisma.timetableCurriculumTemplate.findMany(
      {
        where,

        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      },
    );

  return rows.map(toTemplateSummary);
}

export async function getTimetableV2SchoolCurriculumTemplate(
  schoolAccountId: string,
  templateId: string,
) {
  const row =
    await prisma.timetableCurriculumTemplate.findFirst(
      {
        where: {
          id: templateId,
          schoolAccountId,
        },

        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    );

  return row
    ? toTemplateSummary(row)
    : null;
}

export type CreateTimetableV2SchoolCurriculumTemplateInput =
  {
    name: string;
    stageId: string | null;
    gradeId: string | null;
    semesterId: string | null;
    items: CustomCurriculumItemInput[];
  };

function assertValidTemplateInput(
  nameValue: string,
  items: CustomCurriculumItemInput[],
) {
  const name =
    normalizeTimetableV2PlanText(
      nameValue ?? "",
    );

  if (!name) {
    throw new Error(
      "CUSTOM_PLAN_NAME_REQUIRED",
    );
  }

  if (
    name.length >
    TIMETABLE_V2_CUSTOM_PLAN_MAX_NAME
  ) {
    throw new Error(
      "CUSTOM_PLAN_NAME_TOO_LONG",
    );
  }

  if (items.length === 0) {
    throw new Error(
      "CUSTOM_PLAN_EMPTY",
    );
  }

  if (
    items.length >
    TIMETABLE_V2_CUSTOM_PLAN_MAX_ITEMS
  ) {
    throw new Error(
      "CUSTOM_PLAN_TOO_MANY_SUBJECTS",
    );
  }

  const validation =
    validateTimetableV2CustomCurriculumItems(
      items,
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `CUSTOM_PLAN_INVALID:${validation.errors[0] ?? "بيانات الخطة غير صالحة."}`,
    );
  }

  return name;
}

export async function createTimetableV2SchoolCurriculumTemplate(
  schoolAccountId: string,
  input: CreateTimetableV2SchoolCurriculumTemplateInput,
) {
  const name = assertValidTemplateInput(
    input.name,
    input.items,
  );

  const created =
    await prisma.timetableCurriculumTemplate.create(
      {
        data: {
          schoolAccountId,

          name,

          stageId:
            input.stageId ?? null,

          gradeId:
            input.gradeId ?? null,

          semesterId:
            input.semesterId ??
            null,

          items: {
            create:
              buildTimetableV2TemplateItems(
                input.items,
              ),
          },
        },

        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    );

  return toTemplateSummary(created);
}

export async function updateTimetableV2SchoolCurriculumTemplate(
  schoolAccountId: string,
  templateId: string,
  input: CreateTimetableV2SchoolCurriculumTemplateInput,
) {
  const owned =
    await prisma.timetableCurriculumTemplate.findFirst(
      {
        where: {
          id: templateId,
          schoolAccountId,
        },
        select: {
          id: true,
        },
      },
    );

  if (!owned) {
    throw new Error(
      "CUSTOM_PLAN_NOT_FOUND",
    );
  }

  const name = assertValidTemplateInput(
    input.name,
    input.items,
  );

  const updated =
    await prisma.timetableCurriculumTemplate.update(
      {
        where: {
          id: templateId,
        },

        data: {
          name,

          stageId:
            input.stageId ?? null,

          gradeId:
            input.gradeId ?? null,

          semesterId:
            input.semesterId ??
            null,

          items: {
            deleteMany: {},

            create:
              buildTimetableV2TemplateItems(
                input.items,
              ),
          },
        },

        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    );

  return toTemplateSummary(updated);
}
