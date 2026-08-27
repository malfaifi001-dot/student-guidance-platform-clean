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
import { isSchoolBroadcastServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";

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


function buildCustomReportPrepareFields(
  payload: SmartReportPayload,
  languageMode: ReportLanguageMode,
): ReportFlowPrepareField[] {
  const seen = new Set<string>();
  const sourceFields = [...payload.detailFields, ...payload.primaryFields];
  const result: ReportFlowPrepareField[] = [];

  sourceFields.forEach((field, index) => {
    const key = cleanText(field.key) || `custom_report_field_${index + 1}`;
    const label = cleanText(field.label) || key;
    const rawValue =
      field.value === null || field.value === undefined
        ? ""
        : Array.isArray(field.value)
          ? field.value.map((item) => String(item || "").trim()).filter(Boolean).join("، ")
          : String(field.value).trim();

    if (!label || !rawValue) return;

    const uniqueKey = `${key}::${label}::${rawValue}`;

    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);

    result.push({
      id: `custom-report:${key}:${index}`,
      source: "detail",
      key,
      label: applyReportLanguageModeToText(label, languageMode),
      value: rawValue,
      originalLabel: label,
      originalValue: rawValue,
      selected: true,
      technical: false,
    });
  });

  return result;
}
export function buildReportFlowPrepareFields(
  payload: SmartReportPayload,
): ReportFlowPrepareField[] {
  const languageMode = normalizeReportLanguageMode(payload.languageMode);

  if (payload.service?.slug === "custom-report") {
    return buildCustomReportPrepareFields(payload, languageMode);
  }

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

function splitPreparedValueParts(value: string) {
  return value
    .split(/\s*(?:،|,|؛|\r?\n)\s*/g)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function normalizePreparedComparisonText(value: string) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .replace(/[،,؛]/g, "|")
    .toLowerCase();
}

function translateSourceFieldValue(
  value: string | string[],
  key: string,
  label: string,
  languageMode: ReportLanguageMode,
) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      applyReportLanguageModeToFieldValue(item, languageMode, key, label),
    );
  }

  return applyReportLanguageModeToFieldValue(value, languageMode, key, label);
}

function resolvePreparedFieldValue(
  originalField: SmartReportField | undefined,
  field: ReportFlowPrepareField,
  languageMode: ReportLanguageMode,
) {
  const preparedValue = cleanText(field.value);
  const originalLabel = field.originalLabel || field.label;
  const originalValue = originalField?.value;

  if (Array.isArray(originalValue)) {
    const originalItems = originalValue
      .map((item) => displayValue(item))
      .filter(Boolean);

    if (!originalItems.length) {
      return preparedValue;
    }

    const preparedParts = splitPreparedValueParts(preparedValue);
    const originalJoined = originalItems.join("، ");
    const isTechnicalPreparedList =
      preparedParts.length > 0 &&
      preparedParts.every((item) => isEnglishTechnicalText(item));
    const matchesOriginalText =
      normalizePreparedComparisonText(preparedValue) ===
      normalizePreparedComparisonText(originalJoined);

    if (preparedValue && (isTechnicalPreparedList || matchesOriginalText)) {
      return translateSourceFieldValue(
        originalItems.length > 1 ? originalItems : originalItems[0] || "",
        field.key,
        originalLabel,
        languageMode,
      );
    }

    return preparedValue;
  }

  const originalDisplay = displayValue(originalValue);

  if (
    preparedValue &&
    isEnglishTechnicalText(preparedValue) &&
    originalDisplay &&
    !isEnglishTechnicalText(originalDisplay)
  ) {
    return translateSourceFieldValue(
      originalDisplay,
      field.key,
      originalLabel,
      languageMode,
    );
  }

  return preparedValue;
}

function applyFields(
  sourceFields: SmartReportField[],
  preparation: ReportFlowPreparation,
  source: ReportFlowFieldSource,
  languageMode: ReportLanguageMode,
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
        value: resolvePreparedFieldValue(original, field, languageMode),
      } as SmartReportField;
    });
}

export function applyReportFlowPreparationToPayload(
  payload: SmartReportPayload,
  preparation: ReportFlowPreparation,
): SmartReportPayload {
  tracePrincipalSignature({
    stage: "REPORT_FLOW_INPUT",
    location: "applyReportFlowPreparationToPayload",
    payload,
  });
  const languageMode = normalizeReportLanguageMode(preparation.languageMode);
  const showExecutionDescriptionInReport =
    !isSchoolBroadcastServiceSlug(payload.service.slug) &&
    preparation.showExecutionDescriptionInReport !== false;
  const primaryFields = applyFields(
    payload.primaryFields,
    preparation,
    "primary",
    languageMode,
  );

  const detailFields = applyFields(
    payload.detailFields,
    preparation,
    "detail",
    languageMode,
  );

  const preparedPayload = {
    ...payload,
    // Preparation owns report fields and narrative presentation only. Keep
    // the already-resolved semantic identity/signature state intact for the
    // Report2 renderer and its principal signature slot.
    identity: payload.identity ? { ...payload.identity } : payload.identity,
    signatures: payload.signatures
      ? payload.signatures.map((signature) => ({ ...signature }))
      : payload.signatures,
    languageMode,
    primaryFields,
    detailFields,
    narrative: {
      ...payload.narrative,
      title: payload.narrative.title || "وصف التنفيذ",
      visible: showExecutionDescriptionInReport,
      body:
        cleanText(preparation.executionSummary) ||
        cleanText(payload.narrative.body),
    },
  };

  tracePrincipalSignature({
    stage: "REPORT_FLOW_OUTPUT",
    location: "applyReportFlowPreparationToPayload",
    payload: preparedPayload,
  });

  return preparedPayload;
}

export function createReportFlowPreparation({
  payload,
  variantId,
  fields,
  executionSummary,
  executionSummarySource,
  languageMode,
  showExecutionDescriptionInReport,
}: {
  payload: SmartReportPayload;
  variantId: string;
  fields: ReportFlowPrepareField[];
  executionSummary: string;
  executionSummarySource: ReportFlowPreparation["executionSummarySource"];
  languageMode: ReportLanguageMode;
  showExecutionDescriptionInReport?: boolean;
}): ReportFlowPreparation {
  const isSchoolBroadcast = isSchoolBroadcastServiceSlug(payload.service.slug);

  return {
    version: 1,
    caseId: payload.caseInfo.id,
    variantId,
    reportType: payload.reportType,
    languageMode: normalizeReportLanguageMode(languageMode),
    showExecutionDescriptionInReport:
      !isSchoolBroadcast && showExecutionDescriptionInReport !== false,
    selectedFieldIds: fields
      .filter((field) => field.selected)
      .map((field) => field.id),
    fields,
    executionSummary,
    executionSummarySource,
    updatedAt: new Date().toISOString(),
  };
}
