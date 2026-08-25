import type { ActivityExecutionCardReportData } from "@/components/activity-programs/reports/activity-execution-card-report";
import {
  formatWorkflowDisplayValue,
  stringifyWorkflowRawValue,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";

type FieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
  }> | null;
};

type RuntimeReportValue = {
  fieldKey: string;
  fieldLabel: string;
  displayValue: string;
  rawValue: string;
  value: WorkflowValueLike;
};

const STATIC_ACTIVITY_VALUE_LABELS: Record<string, string> = {
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  scouting: "النشاط الكشفي",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",
  school_broadcast: "الإذاعة المدرسية",

  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  term_3: "الفصل الدراسي الثالث",

  semester_1: "الفصل الدراسي الأول",
  semester_2: "الفصل الدراسي الثاني",
  semester_3: "الفصل الدراسي الثالث",

  all_school: "كل المدرسة",
  whole_school: "كل المدرسة",
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulValue(value: unknown) {
  const text = cleanText(value);
  const normalized = normalizeText(text);

  return Boolean(
    text &&
      ![
        "0",
        "غير محدد",
        "غير مدخل",
        "غير متوفر",
        "لا يوجد",
        "null",
        "undefined",
        "-",
        "—",
      ].includes(normalized),
  );
}

function getStaticArabicLabel(value: unknown) {
  const key = cleanText(value);

  return STATIC_ACTIVITY_VALUE_LABELS[key] || "";
}

function getProgramCodeFallback(value: unknown) {
  const text = cleanText(value);
  const match = /^program[_-](\d+)$/i.exec(text);

  if (!match) {
    return "";
  }

  return `برنامج النشاط رقم ${Number(match[1])}`;
}

function formatGregorianDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function getSnapshotWorkflowSource(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const record = snapshot as Record<string, any>;

  if (Array.isArray(record.steps)) {
    return record;
  }

  if (record.workflow && Array.isArray(record.workflow.steps)) {
    return record.workflow;
  }

  if (record.runtimeWorkflow && Array.isArray(record.runtimeWorkflow.steps)) {
    return record.runtimeWorkflow;
  }

  return null;
}

function buildFieldMap(caseEntry: any) {
  const map = new Map<string, FieldLookupItem>();

  const addField = (field: any) => {
    if (!field?.key) {
      return;
    }

    map.set(field.key, {
      key: field.key,
      label: field.label,
      type: field.type,
      options: Array.isArray(field.options) ? field.options : [],
    });
  };

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach(addField);
  });

  const snapshot = getSnapshotWorkflowSource(caseEntry.workflowSnapshot);

  snapshot?.steps?.forEach((step: any) => {
    step.fields?.forEach(addField);
  });

  return map;
}

function normalizeWorkflowValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>,
): WorkflowValueLike {
  const fieldKey = value.field?.key || value.fieldKey || "";
  const fieldFromWorkflow = fieldMap.get(fieldKey);

  return {
    id: value.id,
    fieldKey,
    value: value.value,
    jsonValue: value.jsonValue,
    field: value.field
      ? {
          key: value.field.key || fieldKey,
          label: value.field.label || fieldFromWorkflow?.label || fieldKey,
          type: value.field.type || fieldFromWorkflow?.type,
          options: value.field.options?.length
            ? value.field.options
            : fieldFromWorkflow?.options || [],
        }
      : {
          key: fieldKey,
          label: fieldFromWorkflow?.label || fieldKey,
          type: fieldFromWorkflow?.type,
          options: fieldFromWorkflow?.options || [],
        },
  };
}

function stringifyDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return cleanText(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyDisplayValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return cleanText(record.label || record.name || record.value);
  }

  return cleanText(value);
}

function extractTokens(value: unknown): string[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value).trim()].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTokens(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractTokens(record.value),
      ...extractTokens(record.id),
      ...extractTokens(record.key),
      ...extractTokens(record.slug),
      ...extractTokens(record.label),
      ...extractTokens(record.name),
    ];
  }

  return [];
}

function getWorkflowOptionLabel(value: WorkflowValueLike) {
  const options = Array.isArray(value.field?.options) ? value.field.options : [];
  const tokens = [
    ...extractTokens(value.jsonValue),
    ...extractTokens(value.value),
  ];

  const labels: string[] = [];

  for (const token of tokens) {
    const cleanToken = cleanText(token);

    if (!cleanToken) {
      continue;
    }

    const option = options.find((item: any) => {
      return (
        cleanText(item?.value) === cleanToken ||
        cleanText(item?.label) === cleanToken
      );
    });

    if (option?.label) {
      labels.push(cleanText(option.label));
      continue;
    }

    const staticLabel =
      getStaticArabicLabel(cleanToken) ||
      getProgramCodeFallback(cleanToken);

    if (staticLabel) {
      labels.push(staticLabel);
    }
  }

  return Array.from(new Set(labels.filter(Boolean))).join("، ");
}

function buildRuntimeValues(caseEntry: any): RuntimeReportValue[] {
  const fieldMap = buildFieldMap(caseEntry);

  const normalizedValues = caseEntry.values.map((value: any) =>
    normalizeWorkflowValue(value, fieldMap),
  );

  return normalizedValues
    .map((value: WorkflowValueLike, index: number) => {
      const fieldKey = cleanText(value.field?.key || value.fieldKey);
      const fieldLabel = cleanText(value.field?.label || fieldKey || `حقل ${index + 1}`);

      const rawText = stringifyDisplayValue(value.value ?? value.jsonValue);
      const formattedText = stringifyDisplayValue(
        formatWorkflowDisplayValue(value, normalizedValues),
      );

      const displayValue =
        getWorkflowOptionLabel(value) ||
        getStaticArabicLabel(rawText) ||
        getProgramCodeFallback(rawText) ||
        getStaticArabicLabel(formattedText) ||
        getProgramCodeFallback(formattedText) ||
        formattedText ||
        stringifyDisplayValue(stringifyWorkflowRawValue(value.value ?? value.jsonValue));

      return {
        fieldKey,
        fieldLabel,
        displayValue,
        rawValue: rawText,
        value,
      };
    })
    .filter((item: RuntimeReportValue) => {
      const key = item.fieldKey;

      return (
        key &&
        isUsefulValue(item.displayValue) &&
        key !== "selectedStudent" &&
        key !== "student" &&
        key !== "guardian" &&
        key !== "metadata" &&
        !key.endsWith("__other")
      );
    });
}

function valueMatchesIntent(item: RuntimeReportValue, intents: string[]) {
  const text = normalizeText(`${item.fieldKey} ${item.fieldLabel}`);

  return intents.some((intent) => text.includes(normalizeText(intent)));
}

function findFirstValue(values: RuntimeReportValue[], intents: string[]) {
  return (
    values.find((item) => valueMatchesIntent(item, intents))?.displayValue || ""
  );
}

function joinValues(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(isUsefulValue))).join("، ");
}

function isImageMime(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function buildProgramTitle(values: RuntimeReportValue[], fallback: string) {
  const programValues = values
    .filter((item) => {
      const text = normalizeText(`${item.fieldKey} ${item.fieldLabel}`);

      return (
        !text.includes("domain") &&
        !text.includes("مجال") &&
        !text.includes("teacher") &&
        !text.includes("معلم") &&
        (
          text.includes("program") ||
          text.includes("activity") ||
          text.includes("title") ||
          text.includes("name") ||
          text.includes("برنامج") ||
          text.includes("نشاط") ||
          text.includes("عنوان") ||
          text.includes("اسم")
        )
      );
    })
    .map((item) => item.displayValue)
    .filter(isUsefulValue);

  return joinValues(programValues) || fallback || "برنامج نشاط طلابي";
}

function buildExtraItems(input: {
  semester: string;
  implementationMethod: string;
  periodsCount: string;
  week: string;
  day: string;
}) {
  return [
    {
      label: "الفصل الدراسي",
      value: input.semester,
    },
    {
      label: "طريقة التنفيذ",
      value: input.implementationMethod,
    },
    {
      label: "عدد حصص البرنامج",
      value: input.periodsCount,
    },
    {
      label: "الأسبوع",
      value: input.week,
    },
    {
      label: "اليوم",
      value: input.day,
    },
  ].filter((item) => isUsefulValue(item.value));
}

function buildNarrative(input: {
  title: string;
  domain: string;
  teacherName: string;
  activityDate: string;
  targetGroup: string;
  beneficiaryCount: string;
  location: string;
  semester: string;
  implementationMethod: string;
  periodsCount: string;
  evidenceCount: number;
}) {
  const sentences = [
    `تم تنفيذ برنامج النشاط الطلابي «${input.title}» ضمن مجال ${input.domain}.`,
  ];

  if (isUsefulValue(input.semester)) {
    sentences.push(`ونُفذ البرنامج خلال ${input.semester}.`);
  }

  if (isUsefulValue(input.teacherName)) {
    sentences.push(`وتولى التنفيذ المعلم/المعلمة ${input.teacherName}.`);
  }

  if (isUsefulValue(input.activityDate)) {
    sentences.push(`وكان تاريخ التنفيذ ${input.activityDate}.`);
  }

  if (isUsefulValue(input.location)) {
    sentences.push(`وتم التنفيذ في ${input.location}.`);
  }

  if (isUsefulValue(input.targetGroup)) {
    sentences.push(`واستهدف البرنامج ${input.targetGroup}.`);
  }

  if (isUsefulValue(input.beneficiaryCount)) {
    sentences.push(`وبلغ عدد المستفيدين ${input.beneficiaryCount}.`);
  }

  if (isUsefulValue(input.periodsCount)) {
    sentences.push(`واستغرق التنفيذ ${input.periodsCount}.`);
  }

  if (isUsefulValue(input.implementationMethod)) {
    sentences.push(`وجرى التنفيذ وفق آلية: ${input.implementationMethod}.`);
  }

  if (input.evidenceCount > 0) {
    sentences.push(
      `وتم توثيق النشاط من خلال ${input.evidenceCount} شاهد/مرفق محفوظ في الحالة.`,
    );
  }

  return sentences.join(" ");
}

export function buildActivityExecutionCardReportData(
  caseEntry: any,
): ActivityExecutionCardReportData {
  const values = buildRuntimeValues(caseEntry);
  const profile = caseEntry.schoolAccount?.profile;
  const schoolAccount = caseEntry.schoolAccount;

  const domain =
    findFirstValue(values, ["activity_domain", "مجال النشاط", "المجال"]) ||
    caseEntry.service?.name ||
    "مجال النشاط";

  const title = buildProgramTitle(values, caseEntry.title || caseEntry.service?.name);

  const teacherName =
    findFirstValue(values, [
      "assigned_teacher_name",
      "teacher_name",
      "اسم المعلم",
      "المعلم المنفذ",
      "المعلمة المنفذة",
    ]) ||
    caseEntry.createdBy?.name ||
    "";

  const signedName =
    findFirstValue(values, ["assigned_teacher_signed_name"]) ||
    teacherName;

  const signatureUrl =
    findFirstValue(values, ["assigned_teacher_signature_url"]) || "";

  const activityDate =
    findFirstValue(values, [
      "execution_date",
      "activity_date",
      "program_date",
      "gregorian_date",
      "date",
      "تاريخ التنفيذ",
      "التاريخ",
    ]) || formatGregorianDate(caseEntry.submittedAt || caseEntry.createdAt);

  const targetGroup =
    findFirstValue(values, [
      "target_group",
      "target",
      "الفئة المستهدفة",
      "المستهدفين",
      "المستفيدين",
    ]) || "";

  const beneficiaryCount =
    findFirstValue(values, [
      "beneficiary_count",
      "beneficiaries_count",
      "student_count",
      "عدد المستفيدين",
      "عدد الطلاب",
    ]) || "";

  const location =
    findFirstValue(values, [
      "location",
      "place",
      "مكان التنفيذ",
      "مقر التنفيذ",
      "المكان",
    ]) || "";

  const implementationMethod =
    findFirstValue(values, [
      "implementation_method",
      "execution_method",
      "طريقة التنفيذ",
      "الية التنفيذ",
      "آلية التنفيذ",
    ]) || "";

  const semester =
    findFirstValue(values, [
      "semester",
      "term",
      "الفصل الدراسي",
      "الفصل",
    ]) || profile?.currentSemester || "";

  const periodsCount =
    findFirstValue(values, [
      "periods_count",
      "sessions_count",
      "عدد حصص البرنامج",
      "عدد الحصص",
    ]) || "";

  const week =
    findFirstValue(values, ["week", "الأسبوع", "اسبوع"]) || "";

  const day =
    findFirstValue(values, ["day", "اليوم"]) || "";

  const evidences = caseEntry.evidences.map((item: any, index: number) => ({
    id: item.id,
    title: item.note || item.fileName || `شاهد ${index + 1}`,
    imageUrl: isImageMime(item.mimeType) ? item.fileUrl || undefined : undefined,
    fileName: item.fileName || "مرفق",
  }));

  const implementationDescription =
    caseEntry.service?.slug === "activity-programs-school-broadcast"
      ? ""
      : buildNarrative({
          title,
          domain,
          teacherName,
          activityDate,
          targetGroup,
          beneficiaryCount,
          location,
          semester,
          implementationMethod,
          periodsCount,
          evidenceCount: evidences.length,
        });

  return {
    serviceSlug: caseEntry.service?.slug,
    identity: {
      ministryName: "وزارة التعليم",
      educationDepartment: profile?.district
        ? `إدارة التعليم - ${profile.district}`
        : "إدارة التعليم",
      educationOffice: profile?.city
        ? `مكتب التعليم - ${profile.city}`
        : "مكتب التعليم",
      schoolName: profile?.schoolName || schoolAccount?.name || "اسم المدرسة",
      academicYear: profile?.academicYear || "العام الدراسي",
      semester: profile?.currentSemester || semester || "الفصل الدراسي",
      ministryLogoUrl: "/uploads/school-logos/MOE.png",
      schoolLogoUrl: undefined,
    },

    activity: {
      domain,
      title,
      teacherName,
      activityDate,
      targetGroup,
      beneficiaryCount,
      location,
      implementationDescription,
      objectives: [],
      procedures: [],
      indicators: [],
      extraItems: buildExtraItems({
        semester,
        implementationMethod,
        periodsCount,
        week,
        day,
      }),
    },

    evidences,

    approvals: {
      teacherSignedName: signedName || teacherName || "المعلم المنفذ",
      teacherSignatureUrl: signatureUrl || undefined,
      activityLeaderName: caseEntry.createdBy?.name || "رائد النشاط",
      principalName: profile?.principalName || undefined,
    },
  };
}
