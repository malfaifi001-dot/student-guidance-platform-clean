import type { ReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import {
  applyReportLanguageModeToFieldValue,
  applyReportLanguageModeToText,
  normalizeReportLanguageMode,
} from "@/lib/report-engine/report-language-mode";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";
import type {
  ReportFlowFieldSource,
  ReportFlowPrepareContext,
  ReportFlowPrepareField,
  ReportFlowPreparation,
} from "@/lib/report-flow/report-flow-types";

const FIELD_LABEL_TRANSLATIONS: Record<string, string> = {
  execution_date: "تاريخ التنفيذ / اليوم",
  semester: "الفصل الدراسي",
  week: "الأسبوع",
  executor: "المعلم المنفذ",
  target_group: "الفئة المستهدفة",
  execution_method: "طريقة التنفيذ",
  execution_mode: "طريقة التنفيذ",
  activity_domain: "مجال النشاط",
  activity_program: "برنامج النشاط",
  beneficiary_count: "عدد المستفيدين",
  beneficiaries_count: "عدد المستفيدين",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  parents_participated: "مشاركة أولياء الأمور",
  community_partnership_count: "عدد الشراكات المجتمعية",
  location: "مكان التنفيذ",
  execution_location: "مكان التنفيذ",
};

const VALUE_TRANSLATIONS: Record<string, string> = {
  yes: "نعم",
  no: "لا",
  true: "نعم",
  false: "لا",
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  term_3: "الفصل الدراسي الثالث",
  semester_1: "الفصل الدراسي الأول",
  semester_2: "الفصل الدراسي الثاني",
  semester_3: "الفصل الدراسي الثالث",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  activity_leader: "رائد النشاط",
  counselor: "الموجه الطلابي",
  teacher: "المعلم",
  lecture: "محاضرة",
  workshop: "ورشة عمل",
  meeting: "لقاء",
  competition: "مسابقة",
  field_visit: "زيارة ميدانية",
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function hasArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function looksLikeJson(value: string) {
  const text = value.trim();

  return (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]")) ||
    text.includes('":') ||
    text.includes('","')
  );
}

function isEnglishTechnicalText(value: string) {
  return /^[a-z0-9_\-.@:/]+$/i.test(value.trim());
}

function isTechnicalField(key: string, label: string, value: string) {
  const text = `${key} ${label}`.toLowerCase().replace(/\s+/g, "");

  if (!value) return true;
  if (looksLikeJson(value)) return true;

  return (
    /(^|_)id$/i.test(key) ||
    text.includes("json") ||
    text.includes("metadata") ||
    text.includes("token") ||
    text.includes("url") ||
    text.includes("signatureurl") ||
    text.includes("signedat") ||
    text.includes("raw") ||
    text.includes("email") ||
    text.includes("phone")
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (Array.isArray(value)) {
    return value.map(displayValue).filter(Boolean).join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const candidates = [
      record.displayValue,
      record.valueLabel,
      record.optionLabel,
      record.selectedOptionLabel,
      record.labelAr,
      record.nameAr,
      record.titleAr,
      record.fullName,
      record.name,
      record.title,
      record.label,
      record.text,
      record.value,
    ];

    for (const candidate of candidates) {
      const text = displayValue(candidate);
      if (text) return text;
    }

    return "";
  }

  const raw = cleanText(value);
  const lower = raw.toLowerCase();

  if (VALUE_TRANSLATIONS[lower]) return VALUE_TRANSLATIONS[lower];

  if (looksLikeJson(raw)) {
    try {
      return displayValue(JSON.parse(raw));
    } catch {
      return "";
    }
  }

  if (isEnglishTechnicalText(raw) && !VALUE_TRANSLATIONS[lower]) return "";

  return raw;
}

function displayLabel(field: SmartReportField) {
  const key = cleanText(field.key);
  const label = cleanText(field.label);

  if (FIELD_LABEL_TRANSLATIONS[key]) return FIELD_LABEL_TRANSLATIONS[key];
  if (label && label !== key && hasArabic(label)) return label;

  return "";
}

function makePrepareField(
  field: SmartReportField,
  source: ReportFlowFieldSource,
  index: number,
  languageMode: ReportLanguageMode,
): ReportFlowPrepareField | null {
  const key = cleanText(field.key) || `${source}-${index + 1}`;
  const originalLabel = displayLabel(field);
  const originalValue = displayValue(field.value);
  const technical = isTechnicalField(key, originalLabel, originalValue);

  if (!originalLabel || !originalValue) return null;

  return {
    id: `${source}:${key}:${index}`,
    source,
    key,
    label: applyReportLanguageModeToText(originalLabel, languageMode),
    value: applyReportLanguageModeToFieldValue(
      originalValue,
      languageMode,
      key,
      originalLabel,
    ),
    originalLabel,
    originalValue,
    selected: !technical,
    technical,
  };
}

export function buildReportFlowPrepareFields(
  payload: SmartReportPayload,
): ReportFlowPrepareField[] {
  const languageMode = normalizeReportLanguageMode(payload.languageMode);

  const fields = [
    ...payload.primaryFields.map((field, index) =>
      makePrepareField(field, "primary", index, languageMode),
    ),
    ...payload.detailFields.map((field, index) =>
      makePrepareField(field, "detail", index, languageMode),
    ),
  ].filter((field): field is ReportFlowPrepareField => Boolean(field));

  const unique = new Map<string, ReportFlowPrepareField>();

  for (const field of fields) {
    const key = `${field.originalLabel}::${field.originalValue}`;

    if (!unique.has(key)) {
      unique.set(key, field);
    }
  }

  return Array.from(unique.values());
}

export function applyReportFlowLanguageModeToFields(
  fields: ReportFlowPrepareField[],
  languageMode: ReportLanguageMode,
): ReportFlowPrepareField[] {
  const normalizedMode = normalizeReportLanguageMode(languageMode);

  return fields.map((field) => ({
    ...field,
    label: applyReportLanguageModeToText(
      field.originalLabel || field.label,
      normalizedMode,
    ),
    value: applyReportLanguageModeToFieldValue(
      field.originalValue || field.value,
      normalizedMode,
      field.key,
      field.originalLabel || field.label,
    ),
  }));
}

export function buildReportFlowContext(
  payload: SmartReportPayload,
): ReportFlowPrepareContext {
  const allFields = [...payload.primaryFields, ...payload.detailFields];
  const languageMode = normalizeReportLanguageMode(payload.languageMode);

  const executor =
    allFields.find((field) =>
      ["executor", "assigned_teacher", "teacher"].includes(field.key),
    )?.value || "";

  return {
    caseId: payload.caseInfo.id,
    languageMode,
    title: payload.title || payload.caseInfo.title || "تقرير",
    serviceName: payload.service.name,
    serviceSlug: payload.service.slug,
    studentName: payload.student?.name || "",
    executorName: cleanText(executor),
    executorTitle: cleanText(executor)
      ? applyReportLanguageModeToText("المعلم المنفذ", languageMode)
      : "",
  };
}

function applyFields(
  sourceFields: SmartReportField[],
  preparation: ReportFlowPreparation,
  source: ReportFlowFieldSource,
): SmartReportField[] {
  const selectedIds = new Set(preparation.selectedFieldIds);

  return preparation.fields
    .filter((field) => field.source === source)
    .filter((field) => selectedIds.has(field.id))
    .map((field) => {
      const original =
        sourceFields.find((item) => item.key === field.key) || sourceFields[0];

      return {
        ...(original || {
          key: field.key,
          importance: source === "primary" ? "PRIMARY" : "DETAIL",
        }),
        key: field.key,
        label: field.label,
        value: field.value,
      } as SmartReportField;
    });
}

export function applyReportFlowPreparationToPayload(
  payload: SmartReportPayload,
  preparation: ReportFlowPreparation,
): SmartReportPayload {
  const primaryFields = applyFields(
    payload.primaryFields,
    preparation,
    "primary",
  );

  const detailFields = applyFields(payload.detailFields, preparation, "detail");

  return {
    ...payload,
    languageMode: normalizeReportLanguageMode(preparation.languageMode),
    primaryFields,
    detailFields,
    narrative: {
      ...payload.narrative,
      title: payload.narrative.title || "وصف التنفيذ",
      body:
        cleanText(preparation.executionSummary) ||
        cleanText(payload.narrative.body),
    },
  };
}

export function createReportFlowPreparation({
  payload,
  variantId,
  fields,
  executionSummary,
  executionSummarySource,
  languageMode,
}: {
  payload: SmartReportPayload;
  variantId: string;
  fields: ReportFlowPrepareField[];
  executionSummary: string;
  executionSummarySource: ReportFlowPreparation["executionSummarySource"];
  languageMode: ReportLanguageMode;
}): ReportFlowPreparation {
  return {
    version: 1,
    caseId: payload.caseInfo.id,
    variantId,
    reportType: payload.reportType,
    languageMode: normalizeReportLanguageMode(languageMode),
    selectedFieldIds: fields
      .filter((field) => field.selected)
      .map((field) => field.id),
    fields,
    executionSummary,
    executionSummarySource,
    updatedAt: new Date().toISOString(),
  };
}
