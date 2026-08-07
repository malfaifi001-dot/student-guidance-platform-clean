import {
  getTimetableV2Grade,
  isTimetableV2StageId,
  isTimetableV2StudyDayId,
  type TimetableV2ProjectSetupInput,
} from "./project-setup";

export type TimetableV2SetupValidationError = {
  field: string;
  message: string;
};

export type TimetableV2SetupValidationResult = {
  valid: boolean;
  errors: TimetableV2SetupValidationError[];
};

export function validateTimetableV2ProjectSetup(
  input: TimetableV2ProjectSetupInput,
): TimetableV2SetupValidationResult {
  const errors: TimetableV2SetupValidationError[] = [];

  if (!input.name.trim()) {
    errors.push({
      field: "name",
      message: "اسم مشروع الجدول مطلوب.",
    });
  }

  if (!input.academicYear.trim()) {
    errors.push({
      field: "academicYear",
      message: "العام الدراسي مطلوب.",
    });
  }

  if (!input.semester.trim()) {
    errors.push({
      field: "semester",
      message: "الفصل الدراسي مطلوب.",
    });
  }

  if (input.stageIds.length === 0) {
    errors.push({
      field: "stageIds",
      message: "اختر مرحلة دراسية واحدة على الأقل.",
    });
  }

  const uniqueStages = new Set(input.stageIds);

  if (uniqueStages.size !== input.stageIds.length) {
    errors.push({
      field: "stageIds",
      message: "لا يمكن تكرار المرحلة الدراسية.",
    });
  }

  for (const stageId of input.stageIds) {
    if (!isTimetableV2StageId(stageId)) {
      errors.push({
        field: "stageIds",
        message: `مرحلة غير مدعومة: ${stageId}`,
      });
    }
  }

  if (
    !Number.isInteger(input.teacherCount) ||
    input.teacherCount < 1 ||
    input.teacherCount > 500
  ) {
    errors.push({
      field: "teacherCount",
      message: "عدد المعلمين يجب أن يكون بين 1 و500.",
    });
  }

  if (
    input.weeklyPeriodTarget !== null &&
    input.weeklyPeriodTarget !== undefined &&
    (
      !Number.isInteger(input.weeklyPeriodTarget) ||
      input.weeklyPeriodTarget < 1 ||
      input.weeklyPeriodTarget > 100
    )
  ) {
    errors.push({
      field: "weeklyPeriodTarget",
      message: "عدد الحصص الأسبوعية يجب أن يكون بين 1 و100.",
    });
  }

  if (input.studyDays.length === 0) {
    errors.push({
      field: "studyDays",
      message: "اختر يوم دراسة واحداً على الأقل.",
    });
  }

  const uniqueDays = new Set(input.studyDays);

  if (uniqueDays.size !== input.studyDays.length) {
    errors.push({
      field: "studyDays",
      message: "لا يمكن تكرار يوم الدراسة.",
    });
  }

  for (const dayId of input.studyDays) {
    if (!isTimetableV2StudyDayId(dayId)) {
      errors.push({
        field: "studyDays",
        message: `يوم دراسة غير مدعوم: ${dayId}`,
      });
    }
  }

  if (
    !Number.isInteger(input.periodsPerDay) ||
    input.periodsPerDay < 1 ||
    input.periodsPerDay > 12
  ) {
    errors.push({
      field: "periodsPerDay",
      message: "عدد الحصص اليومية يجب أن يكون بين 1 و12.",
    });
  }

  if (input.grades.length === 0) {
    errors.push({
      field: "grades",
      message: "لا توجد صفوف مضافة للمشروع.",
    });
  }

  const selectedStages = new Set(input.stageIds);
  const seenGrades = new Set<string>();

  for (const gradeSetup of input.grades) {
    const grade = getTimetableV2Grade(gradeSetup.gradeId);

    if (!grade) {
      errors.push({
        field: "grades",
        message: `صف غير معروف: ${gradeSetup.gradeId}`,
      });

      continue;
    }

    if (!selectedStages.has(grade.stageId)) {
      errors.push({
        field: "grades",
        message: `الصف ${grade.name} لا يتبع المراحل المختارة.`,
      });
    }

    if (seenGrades.has(gradeSetup.gradeId)) {
      errors.push({
        field: "grades",
        message: `تم تكرار الصف ${grade.name}.`,
      });
    }

    seenGrades.add(gradeSetup.gradeId);

    if (gradeSetup.sectionNames.length === 0) {
      errors.push({
        field: `grades.${gradeSetup.gradeId}.sectionNames`,
        message: `أضف فصلًا واحدًا على الأقل للصف ${grade.name}.`,
      });
    }

    const normalizedSections = gradeSetup.sectionNames
      .map((name) => name.trim())
      .filter(Boolean);

    if (
      normalizedSections.length !==
      gradeSetup.sectionNames.length
    ) {
      errors.push({
        field: `grades.${gradeSetup.gradeId}.sectionNames`,
        message: `يوجد اسم فصل فارغ في الصف ${grade.name}.`,
      });
    }

    if (
      new Set(normalizedSections).size !==
      normalizedSections.length
    ) {
      errors.push({
        field: `grades.${gradeSetup.gradeId}.sectionNames`,
        message: `يوجد اسم فصل مكرر في الصف ${grade.name}.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
