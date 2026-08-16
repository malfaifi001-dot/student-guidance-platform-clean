import type {
  TimetableAiImportResult,
} from "./ai-import-types";

function key(
  value: string,
) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

export function auditTimetableAiImportResult(
  result: TimetableAiImportResult,
): TimetableAiImportResult {
  const warnings = [
    ...result.warnings,
  ];

  const classes: TimetableAiImportResult["classes"] = [];
  const seenClasses =
    new Set<string>();

  for (
    const item of
    result.classes
  ) {
    const itemKey =
      key(item.name);

    if (
      seenClasses.has(
        itemKey,
      )
    ) {
      warnings.push(
        `تم تجاهل فصل مكرر: ${item.name}`,
      );
      continue;
    }

    seenClasses.add(
      itemKey,
    );
    classes.push(item);
  }

  const subjects: TimetableAiImportResult["subjects"] = [];
  const seenSubjects =
    new Set<string>();

  for (
    const item of
    result.subjects
  ) {
    const itemKey =
      key(item.name);

    if (
      seenSubjects.has(
        itemKey,
      )
    ) {
      warnings.push(
        `تم تجاهل مادة مكررة: ${item.name}`,
      );
      continue;
    }

    seenSubjects.add(
      itemKey,
    );
    subjects.push(item);
  }

  const teachers: TimetableAiImportResult["teachers"] = [];
  const seenTeachers =
    new Set<string>();

  for (
    const item of
    result.teachers
  ) {
    const itemKey =
      key(item.name);

    if (
      seenTeachers.has(
        itemKey,
      )
    ) {
      warnings.push(
        `تم تجاهل معلم مكرر: ${item.name}`,
      );
      continue;
    }

    seenTeachers.add(
      itemKey,
    );
    teachers.push(item);
  }

  const classNames =
    new Set(
      classes.map(
        (item) =>
          key(item.name),
      ),
    );

  const subjectNames =
    new Set(
      subjects.map(
        (item) =>
          key(item.name),
      ),
    );

  const teacherNames =
    new Set(
      teachers.map(
        (item) =>
          key(item.name),
      ),
    );

  const assignments: TimetableAiImportResult["assignments"] = [];
  const assignmentKeys =
    new Set<string>();

  for (
    const item of
    result.assignments
  ) {
    if (
      !teacherNames.has(
        key(item.teacherName),
      )
    ) {
      warnings.push(
        `تم تجاهل إسناد يشير إلى معلم غير موجود: ${item.teacherName}`,
      );
      continue;
    }

    if (
      !subjectNames.has(
        key(item.subjectName),
      )
    ) {
      warnings.push(
        `تم تجاهل إسناد يشير إلى مادة غير موجودة: ${item.subjectName}`,
      );
      continue;
    }

    if (
      !classNames.has(
        key(item.className),
      )
    ) {
      warnings.push(
        `تم تجاهل إسناد يشير إلى فصل غير موجود: ${item.className}`,
      );
      continue;
    }

    const assignmentKey = [
      key(item.teacherName),
      key(item.subjectName),
      key(item.className),
    ].join("|");

    if (
      assignmentKeys.has(
        assignmentKey,
      )
    ) {
      warnings.push(
        `تم تجاهل إسناد مكرر: ${item.teacherName} / ${item.subjectName} / ${item.className}`,
      );
      continue;
    }

    assignmentKeys.add(
      assignmentKey,
    );

    assignments.push(
      item,
    );
  }

  const teacherLoad =
    new Map<string, number>();

  for (
    const assignment of
    assignments
  ) {
    if (
      assignment.weeklyLessons == null
    ) {
      continue;
    }

    const teacherKey =
      key(
        assignment.teacherName,
      );

    teacherLoad.set(
      teacherKey,
      (
        teacherLoad.get(
          teacherKey,
        ) ?? 0
      ) +
        assignment.weeklyLessons,
    );
  }

  for (
    const teacher of
    teachers
  ) {
    if (
      teacher.maxWeeklyLoad == null
    ) {
      continue;
    }

    const load =
      teacherLoad.get(
        key(
          teacher.name,
        ),
      ) ?? 0;

    if (
      load >
      teacher.maxWeeklyLoad
    ) {
      warnings.push(
        `النصاب المقترح للمعلم ${teacher.name} هو ${load} حصة ويتجاوز الحد الأسبوعي ${teacher.maxWeeklyLoad}.`,
      );
    }
  }

  const stages =
    result.stages.filter(
      (
        stage,
      ) =>
        classes.some(
          (
            item,
          ) =>
            item.stage ===
            stage,
        ) ||
        subjects.some(
          (
            item,
          ) =>
            item.stageIds.includes(
              stage,
            ),
        ),
    );

  return {
    ...result,

    stages:
      stages.length > 0
        ? stages
        : result.stages,

    classes,
    subjects,
    teachers,
    assignments,

    warnings:
      uniqueStrings(
        warnings,
      ),
  };
}
