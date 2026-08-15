import "server-only";

import type {
  ZodType,
} from "zod";

import {
  callDeepSeekChat,
} from "@/lib/ai/deepseek-client";

import type {
  TimetableAiImportResult,
  TimetableAiImportStage,
} from "@/lib/timetable-v3/ai-import/ai-import-types";

import {
  assignmentsSchema,
  constraintsSchema,
  planningSchema,
  teachersSchema,
} from "@/lib/timetable-v3/ai-import/pipeline-schema";

import {
  buildAssignmentsPrompt,
  buildConstraintsPrompt,
  buildPlanningPrompt,
  buildRepairPrompt,
  buildTeachersPrompt,
} from "@/lib/timetable-v3/ai-import/pipeline-prompts";

const MAX_SOURCE_LENGTH =
  40_000;

function normalizeSourceText(
  value: string,
) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function cleanModelResponse(
  value: string,
) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      "",
    )
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function findBalancedJsonObject(
  value: string,
) {
  let start =
    -1;

  let depth =
    0;

  let insideString =
    false;

  let escaped =
    false;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const character =
      value[index];

    if (insideString) {
      if (escaped) {
        escaped =
          false;

        continue;
      }

      if (character === "\\") {
        escaped =
          true;

        continue;
      }

      if (character === '"') {
        insideString =
          false;
      }

      continue;
    }

    if (character === '"') {
      insideString =
        true;

      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        start =
          index;
      }

      depth +=
        1;

      continue;
    }

    if (character === "}") {
      if (depth === 0) {
        continue;
      }

      depth -=
        1;

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

function parseJson(
  value: string,
) {
  const cleaned =
    cleanModelResponse(
      value,
    );

  try {
    return JSON.parse(
      cleaned,
    ) as unknown;
  }
  catch {
    const balanced =
      findBalancedJsonObject(
        cleaned,
      );

    if (!balanced) {
      throw new Error(
        "AI_IMPORT_INVALID_JSON",
      );
    }

    try {
      return JSON.parse(
        balanced,
      ) as unknown;
    }
    catch {
      throw new Error(
        "AI_IMPORT_INVALID_JSON",
      );
    }
  }
}

async function callJson(
  prompt: string,
) {
  return callDeepSeekChat({
    messages: [
      {
        role:
          "system",

        content:
          "أنت مساعد تخطيط مدرسي لتطبيق تيتش اكس. أعد JSON صالحًا فقط وفق التعليمات.",
      },
      {
        role:
          "user",

        content:
          prompt,
      },
    ],

    temperature:
      0.3,

    maxTokens:
      8_000,

    timeoutMs:
      120_000,

    responseFormat:
      "json_object",
  });
}

async function runPhase<T>(
  input: {
    phase: string;
    prompt: string;
    schema: ZodType<T>;
  },
): Promise<T> {
  const firstResponse =
    await callJson(
      input.prompt,
    );

  let firstJson:
    unknown;

  try {
    firstJson =
      parseJson(
        firstResponse,
      );
  }
  catch {
    const repaired =
      await callJson(
        buildRepairPrompt({
          phase:
            input.phase,

          originalPrompt:
            input.prompt,

          previousResponse:
            firstResponse,

          validationErrors:
            "JSON غير صالح نحويًا.",
        }),
      );

    const repairedParsed =
      input.schema.safeParse(
        parseJson(
          repaired,
        ),
      );

    if (!repairedParsed.success) {
      throw new Error(
        `AI_IMPORT_PHASE_FAILED:${input.phase}`,
      );
    }

    return repairedParsed.data;
  }

  const firstParsed =
    input.schema.safeParse(
      firstJson,
    );

  if (firstParsed.success) {
    return firstParsed.data;
  }

  const repaired =
    await callJson(
      buildRepairPrompt({
        phase:
          input.phase,

        originalPrompt:
          input.prompt,

        previousResponse:
          firstResponse,

        validationErrors:
          JSON.stringify(
            firstParsed.error.flatten(),
          ),
      }),
    );

  const repairedParsed =
    input.schema.safeParse(
      parseJson(
        repaired,
      ),
    );

  if (!repairedParsed.success) {
    console.error(
      "TIMETABLE_V3_AI_IMPORT_PHASE_SCHEMA_FAILED",
      {
        phase:
          input.phase,

        errors:
          repairedParsed.error.flatten(),
      },
    );

    throw new Error(
      `AI_IMPORT_PHASE_FAILED:${input.phase}`,
    );
  }

  return repairedParsed.data;
}

function uniqueStrings(
  values: string[],
) {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function compactTeachers(
  teachers:
    Array<{
      name: string;
      specialty: string | null;
      maxWeeklyLoad: number | null;
    }>,
) {
  return teachers.map(
    (
      teacher,
    ) => ({
      name:
        teacher.name,

      specialty:
        teacher.specialty,

      maxWeeklyLoad:
        teacher.maxWeeklyLoad,
    }),
  );
}

export async function analyzeTimetableV3ImportText(
  sourceText: string,
): Promise<TimetableAiImportResult> {
  const request =
    normalizeSourceText(
      sourceText,
    );

  if (!request) {
    throw new Error(
      "AI_IMPORT_SOURCE_REQUIRED",
    );
  }

  if (
    request.length >
    MAX_SOURCE_LENGTH
  ) {
    throw new Error(
      "AI_IMPORT_SOURCE_TOO_LARGE",
    );
  }

  // ========================================================
  // PHASE 1 — SCHOOL PLAN
  // ========================================================

  const planning =
    await runPhase({
      phase:
        "PLANNING",

      prompt:
        buildPlanningPrompt(
          request,
        ),

      schema:
        planningSchema,
    });

  if (
    planning.stages.length ===
    0
  ) {
    throw new Error(
      "AI_IMPORT_NO_STAGES",
    );
  }

  // ========================================================
  // PHASE 2 — TEACHERS
  // ========================================================

  const teacherPlan =
    await runPhase({
      phase:
        "TEACHERS",

      prompt:
        buildTeachersPrompt({
          request,

          planningJson:
            JSON.stringify({
              stages:
                planning.stages,

              classes:
                planning.classes,

              subjects:
                planning.subjects,
            }),
        }),

      schema:
        teachersSchema,
    });

  // ========================================================
  // PHASE 3 — ASSIGNMENTS
  // One DeepSeek request per school stage.
  // ========================================================

  const assignments:
    TimetableAiImportResult["assignments"] =
      [];

  const assignmentAssumptions:
    string[] =
      [];

  const assignmentWarnings:
    string[] =
      [];

  for (
    const stage of
    planning.stages
  ) {
    const stageClasses =
      planning.classes.filter(
        (
          item,
        ) =>
          item.stage ===
          stage,
      );

    const stageSubjects =
      planning.subjects.filter(
        (
          subject,
        ) =>
          subject.stageIds.length ===
            0 ||
          subject.stageIds.includes(
            stage,
          ),
      );

    if (
      stageClasses.length ===
        0 ||
      stageSubjects.length ===
        0
    ) {
      assignmentWarnings.push(
        `لم يتم إنشاء إسنادات للمرحلة ${stage} بسبب نقص الفصول أو المواد.`,
      );

      continue;
    }

    const stageAssignments =
      await runPhase({
        phase:
          `ASSIGNMENTS_${stage}`,

        prompt:
          buildAssignmentsPrompt({
            request,

            stage,

            classesJson:
              JSON.stringify(
                stageClasses,
              ),

            subjectsJson:
              JSON.stringify(
                stageSubjects,
              ),

            teachersJson:
              JSON.stringify(
                compactTeachers(
                  teacherPlan.teachers,
                ),
              ),
          }),

        schema:
          assignmentsSchema,
      });

    assignments.push(
      ...stageAssignments.assignments,
    );

    assignmentAssumptions.push(
      ...stageAssignments.assumptions,
    );

    assignmentWarnings.push(
      ...stageAssignments.warnings,
    );
  }

  // ========================================================
  // PHASE 4 — CONSTRAINTS
  // ========================================================

  const assignmentSummary =
    assignments
      .slice(
        0,
        250,
      )
      .map(
        (
          item,
        ) =>
          `${item.teacherName} | ${item.subjectName} | ${item.className} | ${item.weeklyLessons ?? "?"}`,
      )
      .join(
        "\n",
      );

  const constraints =
    await runPhase({
      phase:
        "CONSTRAINTS",

      prompt:
        buildConstraintsPrompt({
          request,

          planningJson:
            JSON.stringify({
              stages:
                planning.stages,

              classes:
                planning.classes,

              subjects:
                planning.subjects,
            }),

          teachersJson:
            JSON.stringify(
              compactTeachers(
                teacherPlan.teachers,
              ),
            ),

          assignmentsSummary:
            assignmentSummary,
        }),

      schema:
        constraintsSchema,
    });

  // ========================================================
  // MERGE
  // ========================================================

  return {
    mode:
      planning.mode,

    summary:
      planning.summary,

    stages:
      [
        ...new Set(
          planning.stages,
        ),
      ] as TimetableAiImportStage[],

    classes:
      planning.classes,

    subjects:
      planning.subjects,

    teachers:
      teacherPlan.teachers,

    assignments,

    constraintCandidates:
      constraints.constraintCandidates,

    assumptions:
      uniqueStrings([
        ...planning.assumptions,
        ...teacherPlan.assumptions,
        ...assignmentAssumptions,
        ...constraints.assumptions,
      ]),

    alternatives:
      uniqueStrings(
        planning.alternatives,
      ),

    warnings:
      uniqueStrings([
        ...planning.warnings,
        ...teacherPlan.warnings,
        ...assignmentWarnings,
        ...constraints.warnings,
      ]),

    uncertainFields:
      constraints.uncertainFields,
  };
}