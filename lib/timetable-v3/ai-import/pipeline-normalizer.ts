import {
  normalizeTimetableAiStage,
  normalizeTimetableAiStageList,
} from "./stage-normalizer";

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeText(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return value;
  }

  return value
    .normalize("NFKC")
    .replace(/\u0000/g, "")
    .trim();
}

function normalizeNullableText(
  value: unknown,
) {
  if (
    value == null
  ) {
    return null;
  }

  const text =
    String(value)
      .normalize("NFKC")
      .replace(/\u0000/g, "")
      .trim();

  return text.length > 0
    ? text
    : null;
}

function normalizeInteger(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.round(value);
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value
        .replace(
          /[٠-٩]/g,
          (digit) =>
            String(
              "٠١٢٣٤٥٦٧٨٩".indexOf(
                digit,
              ),
            ),
        )
        .replace(
          /[^\d.-]/g,
          "",
        );

    const parsed =
      Number(normalized);

    if (
      Number.isFinite(parsed)
    ) {
      return Math.round(parsed);
    }
  }

  return value;
}

function normalizeConfidence(
  value: unknown,
) {
  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(
        value.replace(
          "%",
          "",
        ),
      );

    if (
      Number.isFinite(parsed)
    ) {
      return parsed > 1
        ? Math.min(
            1,
            parsed / 100,
          )
        : Math.max(
            0,
            parsed,
          );
    }
  }

  if (
    typeof value === "number"
  ) {
    return value > 1
      ? Math.min(
          1,
          value / 100,
        )
      : Math.max(
          0,
          value,
        );
  }

  return value;
}

function normalizeSource(
  value: unknown,
) {
  if (
    value === "USER" ||
    value === "AI_PROPOSAL"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return value;
  }

  const cleaned =
    value
      .trim()
      .toUpperCase();

  if (
    cleaned === "AI" ||
    cleaned === "PROPOSAL" ||
    cleaned === "AI PROPOSAL"
  ) {
    return "AI_PROPOSAL";
  }

  if (
    cleaned === "INPUT" ||
    cleaned === "USER_INPUT"
  ) {
    return "USER";
  }

  return value;
}

function normalizeMode(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return value;
  }

  const cleaned =
    value
      .trim()
      .toUpperCase();

  if (
    cleaned === "EXTRACT" ||
    cleaned === "PROPOSE"
  ) {
    return cleaned;
  }

  return value;
}

function normalizeStringArray(
  value: unknown,
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map(
      normalizeText,
    )
    .filter(
      (
        item,
      ): item is string =>
        typeof item === "string" &&
        item.length > 0,
    );
}

function uniqueStages(
  values: Array<
    "ELEMENTARY" |
    "MIDDLE" |
    "HIGH"
  >,
) {
  return [
    ...new Set(values),
  ];
}

export function normalizeAiImportPhasePayload(
  phase: string,
  value: unknown,
): unknown {
  const record =
    asRecord(value);

  if (
    phase === "PLANNING"
  ) {
    const classes =
      Array.isArray(
        record.classes,
      )
        ? record.classes.map(
            (item) => {
              const entry =
                asRecord(item);

              return {
                ...entry,

                name:
                  normalizeText(
                    entry.name,
                  ),

                stage:
                  normalizeTimetableAiStage(
                    entry.stage,
                  ) ??
                  entry.stage,

                grade:
                  normalizeNullableText(
                    entry.grade,
                  ),

                source:
                  normalizeSource(
                    entry.source,
                  ),

                confidence:
                  normalizeConfidence(
                    entry.confidence,
                  ),
              };
            },
          )
        : [];

    const subjects =
      Array.isArray(
        record.subjects,
      )
        ? record.subjects.map(
            (item) => {
              const entry =
                asRecord(item);

              return {
                ...entry,

                name:
                  normalizeText(
                    entry.name,
                  ),

                stageIds:
                  normalizeTimetableAiStageList(
                    entry.stageIds,
                  ),

                weeklyLessons:
                  entry.weeklyLessons ==
                  null
                    ? null
                    : normalizeInteger(
                        entry.weeklyLessons,
                      ),

                source:
                  normalizeSource(
                    entry.source,
                  ),

                confidence:
                  normalizeConfidence(
                    entry.confidence,
                  ),
              };
            },
          )
        : [];

    const declaredStages =
      normalizeTimetableAiStageList(
        record.stages,
      );

    const classStages =
      classes
        .map(
          (item) =>
            normalizeTimetableAiStage(
              item.stage,
            ),
        )
        .filter(
          (
            stage,
          ): stage is
            | "ELEMENTARY"
            | "MIDDLE"
            | "HIGH" =>
            stage !== null,
        );

    const subjectStages =
      subjects.flatMap(
        (item) =>
          normalizeTimetableAiStageList(
            item.stageIds,
          ),
      );

    const stages =
      uniqueStages([
        ...declaredStages,
        ...classStages,
        ...subjectStages,
      ]);

    return {
      ...record,

      mode:
        normalizeMode(
          record.mode,
        ),

      summary:
        normalizeText(
          record.summary,
        ),

      assumptions:
        normalizeStringArray(
          record.assumptions,
        ),

      alternatives:
        normalizeStringArray(
          record.alternatives,
        ),

      warnings:
        normalizeStringArray(
          record.warnings,
        ),

      stages,
      classes,
      subjects,
    };
  }

  if (
    phase === "TEACHERS"
  ) {
    return {
      ...record,

      teachers:
        Array.isArray(
          record.teachers,
        )
          ? record.teachers.map(
              (item) => {
                const entry =
                  asRecord(item);

                return {
                  ...entry,

                  name:
                    normalizeText(
                      entry.name,
                    ),

                  specialty:
                    normalizeNullableText(
                      entry.specialty,
                    ),

                  maxWeeklyLoad:
                    entry.maxWeeklyLoad ==
                    null
                      ? null
                      : normalizeInteger(
                          entry.maxWeeklyLoad,
                        ),

                  source:
                    normalizeSource(
                      entry.source,
                    ),

                  confidence:
                    normalizeConfidence(
                      entry.confidence,
                    ),
                };
              },
            )
          : [],

      assumptions:
        normalizeStringArray(
          record.assumptions,
        ),

      warnings:
        normalizeStringArray(
          record.warnings,
        ),
    };
  }

  if (
    phase.startsWith(
      "ASSIGNMENTS_",
    )
  ) {
    return {
      ...record,

      assignments:
        Array.isArray(
          record.assignments,
        )
          ? record.assignments.map(
              (item) => {
                const entry =
                  asRecord(item);

                return {
                  ...entry,

                  teacherName:
                    normalizeText(
                      entry.teacherName,
                    ),

                  subjectName:
                    normalizeText(
                      entry.subjectName,
                    ),

                  className:
                    normalizeText(
                      entry.className,
                    ),

                  weeklyLessons:
                    entry.weeklyLessons ==
                    null
                      ? null
                      : normalizeInteger(
                          entry.weeklyLessons,
                        ),

                  source:
                    normalizeSource(
                      entry.source,
                    ),

                  confidence:
                    normalizeConfidence(
                      entry.confidence,
                    ),
                };
              },
            )
          : [],

      assumptions:
        normalizeStringArray(
          record.assumptions,
        ),

      warnings:
        normalizeStringArray(
          record.warnings,
        ),
    };
  }

  if (
    phase === "CONSTRAINTS"
  ) {
    return {
      ...record,

      constraintCandidates:
        Array.isArray(
          record.constraintCandidates,
        )
          ? record.constraintCandidates.map(
              (item) => {
                const entry =
                  asRecord(item);

                return {
                  ...entry,

                  text:
                    normalizeText(
                      entry.text,
                    ),

                  teacherName:
                    normalizeNullableText(
                      entry.teacherName,
                    ),

                  subjectName:
                    normalizeNullableText(
                      entry.subjectName,
                    ),

                  className:
                    normalizeNullableText(
                      entry.className,
                    ),

                  suggestedType:
                    normalizeNullableText(
                      entry.suggestedType,
                    ),

                  source:
                    normalizeSource(
                      entry.source,
                    ),

                  confidence:
                    normalizeConfidence(
                      entry.confidence,
                    ),
                };
              },
            )
          : [],

      assumptions:
        normalizeStringArray(
          record.assumptions,
        ),

      warnings:
        normalizeStringArray(
          record.warnings,
        ),

      uncertainFields:
        Array.isArray(
          record.uncertainFields,
        )
          ? record.uncertainFields
              .map(
                (item) => {
                  if (
                    typeof item === "string"
                  ) {
                    const reason =
                      normalizeNullableText(
                        item,
                      );

                    if (!reason) {
                      return null;
                    }

                    return {
                      entity:
                        "عام",

                      field:
                        "غير محدد",

                      value:
                        null,

                      reason,
                    };
                  }

                  const entry =
                    asRecord(item);

                  const reason =
                    normalizeNullableText(
                      entry.reason ??
                      entry.message ??
                      entry.text ??
                      entry.note,
                    );

                  if (!reason) {
                    return null;
                  }

                  return {
                    entity:
                      normalizeNullableText(
                        entry.entity ??
                        entry.type ??
                        entry.section,
                      ) ??
                      "عام",

                    field:
                      normalizeNullableText(
                        entry.field ??
                        entry.key ??
                        entry.name,
                      ) ??
                      "غير محدد",

                    value:
                      normalizeNullableText(
                        entry.value,
                      ),

                    reason,
                  };
                },
              )
              .filter(
                (
                  item,
                ): item is {
                  entity: string;
                  field: string;
                  value: string | null;
                  reason: string;
                } =>
                  item !== null,
              )
          : [],
    };
  }

  return value;
}