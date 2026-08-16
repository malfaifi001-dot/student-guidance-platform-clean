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
} from "./ai-import-types";

import {
  assignmentsSchema,
  constraintsSchema,
  planningSchema,
  teachersSchema,
} from "./pipeline-schema";

import {
  buildAssignmentsPrompt,
  buildConstraintsPrompt,
  buildPlanningPrompt,
  buildRepairPrompt,
  buildTeachersPrompt,
} from "./pipeline-prompts";

import {
  normalizeAiImportPhasePayload,
} from "./pipeline-normalizer";

import {
  auditTimetableAiImportResult,
} from "./pipeline-audit";

import {
  detectTimetableAiImportLanguage,
  type TimetableAiImportLanguage,
} from "./language";

const MAX_SOURCE_LENGTH =
  40_000;

const PHASE_TIMEOUT_MS =
  120_000;

const PHASE_MAX_TOKENS =
  8_000;

type RequestHints = {
  teacherCount: number | null;
  classCount: number | null;
  stageCount: number | null;
};

function createRunId() {
  return Math.random()
    .toString(36)
    .slice(2, 8);
}

function logPhase(
  runId: string,
  phase: string,
  status: string,
  details = "",
) {
  const suffix =
    details
      ? ` ${details}`
      : "";

  console.info(
    `[AI_IMPORT] ${runId} ${phase} ${status}${suffix}`,
  );
}

function normalizeSourceText(
  value: string,
) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .normalize("NFKC")
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
  let start = -1;
  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const character =
      value[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (
        character === "\\"
      ) {
        escaped = true;
        continue;
      }

      if (
        character === '"'
      ) {
        insideString = false;
      }

      continue;
    }

    if (
      character === '"'
    ) {
      insideString = true;
      continue;
    }

    if (
      character === "{"
    ) {
      if (
        depth === 0
      ) {
        start = index;
      }

      depth += 1;
      continue;
    }

    if (
      character === "}"
    ) {
      if (
        depth === 0
      ) {
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

    return JSON.parse(
      balanced,
    ) as unknown;
  }
}

function parseArabicOrLatinNumber(
  value: string,
) {
  const normalized =
    value.replace(
      /[٠-٩]/g,
      (
        digit,
      ) =>
        String(
          "٠١٢٣٤٥٦٧٨٩".indexOf(
            digit,
          ),
        ),
    );

  const parsed =
    Number(normalized);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function extractCount(
  text: string,
  patterns: RegExp[],
) {
  for (
    const pattern of
    patterns
  ) {
    const match =
      text.match(pattern);

    if (
      !match?.[1]
    ) {
      continue;
    }

    const parsed =
      parseArabicOrLatinNumber(
        match[1],
      );

    if (
      parsed != null &&
      parsed > 0 &&
      parsed < 500
    ) {
      return Math.round(
        parsed,
      );
    }
  }

  return null;
}

function extractRequestHints(
  text: string,
): RequestHints {
  return {
    teacherCount:
      extractCount(
        text,
        [
          /(?:عدد\s*)?(?:المعلمين|معلمين|معلم)\s*[:=-]?\s*([0-9٠-٩]+)/i,
          /([0-9٠-٩]+)\s*(?:معلمين|معلم)/i,
          /([0-9]+)\s*teachers?/i,
        ],
      ),

    classCount:
      extractCount(
        text,
        [
          /([0-9٠-٩]+)\s*(?:فصول|فصل)(?:\s|$|[،,.؛;])/i,
          /(?:عدد\s*)?(?:الفصول|فصول|فصل)\s*[:=-]?\s*([0-9٠-٩]+)/i,
          /([0-9]+)\s*(?:classes|sections)(?:\s|$|[,.])/i,
        ],
      ),

    stageCount:
      extractCount(
        text,
        [
          /(?:عدد\s*)?(?:المراحل|مراحل|مرحلة)\s*[:=-]?\s*([0-9٠-٩]+)/i,
          /([0-9٠-٩]+)\s*(?:مراحل|مرحلة)/i,
          /([0-9]+)\s*stages?/i,
        ],
      ),
  };
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
          "أنت مساعد تخطيط مدرسي داخل منصة تيتش اكس. التزم بالمخطط وأعد JSON صالحًا فقط.",
      },
      {
        role:
          "user",

        content:
          prompt,
      },
    ],

    temperature:
      0.25,

    maxTokens:
      PHASE_MAX_TOKENS,

    timeoutMs:
      PHASE_TIMEOUT_MS,

    responseFormat:
      "json_object",
  });
}

function formatSchemaErrors(
  value: unknown,
) {
  try {
    return JSON.stringify(
      value,
    );
  }
  catch {
    return "تعذر قراءة أخطاء التحقق.";
  }
}

function logValidationFailure(
  input: {
    runId: string;
    phase: string;
    durationMs: number;
    error: unknown;
  },
) {
  console.error(
    `[AI_IMPORT] ${input.runId} ${input.phase} FAILED code=SCHEMA_VALIDATION duration=${input.durationMs}ms`,
  );

  if (
    input.error &&
    typeof input.error === "object" &&
    "issues" in input.error &&
    Array.isArray(
      (input.error as {
        issues?: unknown[];
      }).issues,
    )
  ) {
    const issues =
      (
        input.error as {
          issues: Array<{
            path?: Array<
              string | number
            >;
            message?: string;
            code?: string;
          }>;
        }
      ).issues;

    for (
      const issue of
      issues.slice(0, 8)
    ) {
      console.error(
        `[AI_IMPORT] ${input.runId} ${input.phase} DETAILS field=${issue.path?.join(".") || "root"} code=${issue.code ?? "UNKNOWN"} message=${issue.message ?? "Unknown validation error"}`,
      );
    }
  }
}

function getAiImportErrorCode(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return "UNKNOWN_ERROR";
  }

  const message =
    error.message || "";

  if (
    message.includes(
      "DEEPSEEK_TIMEOUT",
    )
  ) {
    return "DEEPSEEK_TIMEOUT";
  }

  if (
    message.includes(
      "TIMEOUT",
    )
  ) {
    return "TIMEOUT";
  }

  if (
    message.includes(
      "AI_IMPORT_INVALID_JSON",
    )
  ) {
    return "INVALID_JSON";
  }

  if (
    message.includes(
      "AI_IMPORT_PHASE_FAILED",
    )
  ) {
    return "PHASE_FAILED";
  }

  if (
    message.includes(
      "fetch failed",
    )
  ) {
    return "NETWORK_ERROR";
  }

  return error.name ||
    "UNKNOWN_ERROR";
}

async function runPhase<T>(
  input: {
    runId: string;
    phase: string;
    language: TimetableAiImportLanguage;
    prompt: string;
    schema: ZodType<T>;
    semanticValidate?: (
      value: T,
    ) => string[];
  },
): Promise<T> {
  const startedAt =
    Date.now();

  logPhase(
    input.runId,
    input.phase,
    "START",
  );

  const validate = (
    raw: unknown,
  ) => {
    const normalized =
      normalizeAiImportPhasePayload(
        input.phase,
        raw,
      );

    const parsed =
      input.schema.safeParse(
        normalized,
      );

    if (!parsed.success) {
      logValidationFailure({
        runId:
          input.runId,

        phase:
          input.phase,

        durationMs:
          Date.now() -
          startedAt,

        error:
          parsed.error,
      });

      return {
        ok:
          false as const,

        errors:
          formatSchemaErrors(
            parsed.error.flatten(),
          ),
      };
    }

    const semanticErrors =
      input.semanticValidate?.(
        parsed.data,
      ) ?? [];

    if (
      semanticErrors.length >
      0
    ) {
      return {
        ok:
          false as const,

        errors:
          semanticErrors.join(
            "\n",
          ),
      };
    }

    return {
      ok:
        true as const,

      data:
        parsed.data,
    };
  };

  let firstResponse:
    string;

  try {
    firstResponse =
      await callJson(
        input.prompt,
      );
  }
  catch (error) {
    const code =
      getAiImportErrorCode(
        error,
      );

    console.error(
      `[AI_IMPORT] ${input.runId} ${input.phase} FAILED code=${code} duration=${Date.now() - startedAt}ms message=${error instanceof Error ? error.message : "Unknown error"}`,
    );

    throw error;
  }

  let firstRaw:
    unknown;

  try {
    firstRaw =
      parseJson(
        firstResponse,
      );
  }
  catch {
    firstRaw =
      null;
  }

  if (
    firstRaw != null
  ) {
    const firstValidation =
      validate(
        firstRaw,
      );

    if (
      firstValidation.ok
    ) {
      logPhase(
        input.runId,
        input.phase,
        "OK",
        `${Date.now() - startedAt}ms`,
      );

      return firstValidation.data;
    }

    const repairResponse =
      await callJson(
        buildRepairPrompt({
          phase:
            input.phase,

          language:
            input.language,

          originalPrompt:
            input.prompt,

          previousResponse:
            firstResponse,

          validationErrors:
            firstValidation.errors,
        }),
      );

    const repairValidation =
      validate(
        parseJson(
          repairResponse,
        ),
      );

    if (
      repairValidation.ok
    ) {
      logPhase(
        input.runId,
        input.phase,
        "REPAIRED",
        `${Date.now() - startedAt}ms`,
      );

      return repairValidation.data;
    }

    console.error(
      "TIMETABLE_V3_AI_IMPORT_PHASE_SCHEMA_FAILED",
      {
        runId:
          input.runId,
        phase:
          input.phase,
        errors:
          repairValidation.errors,
      },
    );

    throw new Error(
      `AI_IMPORT_PHASE_FAILED:${input.phase}`,
    );
  }

  const repairResponse =
    await callJson(
      buildRepairPrompt({
        phase:
          input.phase,

        language:
          input.language,

        originalPrompt:
          input.prompt,

        previousResponse:
          firstResponse,

        validationErrors:
          "JSON غير صالح نحويًا.",
      }),
    );

  const repairValidation =
    validate(
      parseJson(
        repairResponse,
      ),
    );

  if (
    !repairValidation.ok
  ) {
    console.error(
      "TIMETABLE_V3_AI_IMPORT_PHASE_SCHEMA_FAILED",
      {
        runId:
          input.runId,
        phase:
          input.phase,
        errors:
          repairValidation.errors,
      },
    );

    throw new Error(
      `AI_IMPORT_PHASE_FAILED:${input.phase}`,
    );
  }

  logPhase(
    input.runId,
    input.phase,
    "REPAIRED",
    `${Date.now() - startedAt}ms`,
  );

  return repairValidation.data;
}

function uniqueStrings(
  values: string[],
) {
  return [
    ...new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function compactTeachers(
  teachers:
    TimetableAiImportResult["teachers"],
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
  const runId =
    createRunId();

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

  const hints =
    extractRequestHints(
      request,
    );

  const language =
    detectTimetableAiImportLanguage(
      request,
    );

  logPhase(
    runId,
    "PIPELINE",
    "START",
    `teachers=${hints.teacherCount ?? "?"} classes=${hints.classCount ?? "?"} stages=${hints.stageCount ?? "?"}`,
  );

  const planning =
    await runPhase({
      runId,

      phase:
        "PLANNING",

      language,

      prompt:
        buildPlanningPrompt({
          request,

          expectedTeacherCount:
            hints.teacherCount,

          expectedClassCount:
            hints.classCount,

          expectedStageCount:
            hints.stageCount,
        }),

      schema:
        planningSchema,

      semanticValidate:
        (
          value,
        ) => {
          const errors:
            string[] = [];

          if (
            value.stages.length ===
            0
          ) {
            errors.push(
              "يجب تحديد مرحلة دراسية واحدة على الأقل.",
            );
          }

          if (
            hints.stageCount != null &&
            value.stages.length !==
              hints.stageCount
          ) {
            errors.push(
              `عدد المراحل المطلوب ${hints.stageCount} لكن الناتج يحتوي ${value.stages.length}.`,
            );
          }

          if (
            hints.classCount != null &&
            value.classes.length !==
              hints.classCount
          ) {
            errors.push(
              `عدد الفصول المطلوب ${hints.classCount} لكن الناتج يحتوي ${value.classes.length}.`,
            );
          }

          return errors;
        },
    });

  const teacherPlan =
    await runPhase({
      runId,

      phase:
        "TEACHERS",

      language,

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

          expectedTeacherCount:
            hints.teacherCount,
        }),

      schema:
        teachersSchema,

      semanticValidate:
        (
          value,
        ) => {
          if (
            hints.teacherCount != null &&
            value.teachers.length !==
              hints.teacherCount
          ) {
            return [
              `عدد المعلمين المطلوب ${hints.teacherCount} لكن الناتج يحتوي ${value.teachers.length}.`,
            ];
          }

          return [];
        },
    });

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

    const stageResult =
      await runPhase({
        runId,

        phase:
          `ASSIGNMENTS_${stage}`,

        language,

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
      ...stageResult.assignments,
    );

    assignmentAssumptions.push(
      ...stageResult.assumptions,
    );

    assignmentWarnings.push(
      ...stageResult.warnings,
    );
  }

  const assignmentSummary =
    assignments
      .slice(
        0,
        350,
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
      runId,

      phase:
        "CONSTRAINTS",

      language,

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

  const merged:
    TimetableAiImportResult = {
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

  const audited =
    auditTimetableAiImportResult(
      merged,
    );

  logPhase(
    runId,
    "PIPELINE",
    "COMPLETED",
    `stages=${audited.stages.length} classes=${audited.classes.length} subjects=${audited.subjects.length} teachers=${audited.teachers.length} assignments=${audited.assignments.length} warnings=${audited.warnings.length}`,
  );

  return audited;
}
