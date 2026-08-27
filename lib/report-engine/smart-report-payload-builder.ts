import { filterPrivateReportValues } from "@/lib/report-engine/report-private-fields";
import { filterValidReportEvidenceItems } from "@/lib/report-engine/report-evidence-utils";
import { extractSmartReportTables } from "@/lib/report-engine/report-structured-table-extractor";
import type { ReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import {
  applyReportLanguageModeToFieldValue,
  applyReportLanguageModeToText,
  getReportLanguageModeFromUserGender,
} from "@/lib/report-engine/report-language-mode";
import { buildCaseEntryReportWhereForUser } from "@/lib/report-engine/report-access-scope";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";
import type {
  SmartReportEvidenceItem,
  SmartReportField,
  SmartReportFieldImportance,
  SmartReportPayload,
  SmartReportSignature,
  SmartReportType,
} from "@/lib/report-engine/smart-report-types";
import { prisma } from "@/lib/prisma";
import {
  formatWorkflowDisplayValue,
  getWorkflowFieldKey,
  getWorkflowFieldLabel,
  type WorkflowValueLike,
} from "@/lib/workflow-values/workflow-display-value";
import { isStudentDataTable } from "@/lib/workflow-values/structured-value-metadata";
import { shouldIncludeReportNarrative } from "@/lib/report-engine/report-narrative-policy";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";

type CurrentUserLike = {
  user: {
    id: string;
    name: string;
    role: string;
    gender?: string | null;
    officialName?: string | null;
    jobTitle?: string | null;
    signatureUrl?: string | null;
    signatureSignedAt?: Date | null;
    schoolAccountId?: string | null;
    schoolAccount?: {
      name?: string | null;
      profile?: {
        schoolName?: string | null;
        principalName?: string | null;
        principalSignatureUrl?: string | null;
        principalSignatureReusePolicy?:
          | "ALL_STAFF"
          | "SELECTED_STAFF"
          | "MANUAL_ONLY";
        activityLeaderName?: string | null;
        activityLeaderSignatureUrl?: string | null;
        counselorSignatureUrl?: string | null;
        educationDepartment?: string | null;
        educationOffice?: string | null;
        academicYear?: string | null;
        currentSemester?: string | null;
        logoUrl?: string | null;
      } | null;
    } | null;
  };
};

type BuildSmartReportPayloadResult =
  | {
      ok: true;
      payload: SmartReportPayload;
      serviceSlug: string;
      caseEntryId: string;
      reportOwner: {
        id: string;
        schoolAccountId: string | null;
        role: string | null;
      };
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

type CaseValueItem = {
  key: string;
  label: string;
  value: string;
  payloadValue?: string[];
  importance: SmartReportFieldImportance;
};

type FieldLookupItem = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: Array<{
    label?: string | null;
    value?: string | null;
    key?: string | null;
    id?: string | null;
    name?: string | null;
    text?: string | null;
    title?: string | null;
  }> | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeArabicText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of ["label", "name", "title", "value", "text"]) {
      const text = stringifyValue(record[key]);
      if (text) return text;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
}

function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) return "";

  try {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toISOString().slice(0, 10);
  } catch {
    return String(value);
  }
}

function formatDayName(value: Date | string | null | undefined) {
  if (!value) return "";

  try {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      weekday: "long",
    }).format(date);
  } catch {
    return "";
  }
}

function isTechnicalField(key: string, label: string, value: string) {
  const text = normalizeArabicText(`${key} ${label}`);

  return (
    !value ||
    text.includes("json") ||
    key.endsWith("_json") ||
    key.endsWith("__other") ||
    text.includes("metadata") ||
    text === "student" ||
    text === "guardian" ||
    text.includes("token") ||
    text.includes("signature url") ||
    text.includes("signed at")
  );
}

function classifyField(key: string, label: string): SmartReportFieldImportance {
  const text = normalizeArabicText(`${key} ${label}`);

  if (
    text.includes("وصف") ||
    text.includes("description") ||
    text.includes("ملخص") ||
    text.includes("summary") ||
    text.includes("نتيجه") ||
    text.includes("result") ||
    text.includes("توصيه")
  ) {
    return "NARRATIVE";
  }

  if (
    text.includes("شاهد") ||
    text.includes("مرفق") ||
    text.includes("evidence") ||
    text.includes("file") ||
    text.includes("image")
  ) {
    return "EVIDENCE_RELATED";
  }

  if (text.includes("signature") || text.includes("توقيع")) {
    return "SIGNATURE_RELATED";
  }

  return "DETAIL";
}

function collectWorkflowSnapshotFieldLabels(snapshot: unknown) {
  const labels = new Map<string, string>();

  let record: Record<string, unknown> | null = null;

  if (typeof snapshot === "string") {
    try {
      record = JSON.parse(snapshot) as Record<string, unknown>;
    } catch {
      record = null;
    }
  } else if (snapshot && typeof snapshot === "object") {
    record = snapshot as Record<string, unknown>;
  }

  const steps = Array.isArray(record?.steps) ? record.steps : [];

  for (const step of steps) {
    if (!step || typeof step !== "object") continue;

    const fields = Array.isArray((step as Record<string, unknown>).fields)
      ? ((step as Record<string, unknown>).fields as unknown[])
      : [];

    for (const field of fields) {
      if (!field || typeof field !== "object") continue;

      const fieldRecord = field as Record<string, unknown>;
      const key = cleanText(fieldRecord.key);
      const label = cleanText(fieldRecord.label);

      if (key && label) {
        labels.set(key, label);
      }
    }
  }

  return labels;
}

function collectWorkflowSnapshotFields(snapshot: unknown) {
  const fields = new Map<string, unknown>();
  let source: Record<string, unknown> | null = null;

  if (typeof snapshot === "string") {
    try {
      source = JSON.parse(snapshot) as Record<string, unknown>;
    } catch {
      source = null;
    }
  } else if (snapshot && typeof snapshot === "object") {
    source = snapshot as Record<string, unknown>;
  }

  const steps = Array.isArray(source?.steps) ? source.steps : [];
  steps.forEach((step) => {
    if (!step || typeof step !== "object") return;
    const stepFields = Array.isArray((step as Record<string, unknown>).fields)
      ? ((step as Record<string, unknown>).fields as unknown[])
      : [];
    stepFields.forEach((field) => {
      if (!field || typeof field !== "object") return;
      const key = cleanText((field as Record<string, unknown>).key).toLowerCase();
      if (key) fields.set(key, field);
    });
  });

  return fields;
}

function collectActiveWorkflowFieldKeys(caseEntry: any) {
  const keys = new Set<string>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      const key = cleanText(field?.key);

      if (key) {
        keys.add(key);
      }
    });
  });

  if (keys.size > 0) {
    return keys;
  }

  const snapshotLabels = collectWorkflowSnapshotFieldLabels(
    caseEntry.workflowSnapshot,
  );

  for (const key of snapshotLabels.keys()) {
    const cleanKey = cleanText(key);

    if (cleanKey) {
      keys.add(cleanKey);
    }
  }

  return keys;
}

function buildSmartReportFieldMap(
  caseEntry: any,
  snapshotLabels: Map<string, string>
) {
  const map = new Map<string, FieldLookupItem>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      const key = cleanText(field?.key);

      if (!key) return;

      map.set(key, {
        key,
        label: cleanText(field.label) || snapshotLabels.get(key) || key,
        type: field.type,
        options: field.options || [],
      });
    });
  });

  return map;
}

function normalizeSmartReportCaseValue(
  value: any,
  fieldMap: Map<string, FieldLookupItem>,
  snapshotLabels: Map<string, string>
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
          label:
            value.field.label ||
            fieldFromWorkflow?.label ||
            snapshotLabels.get(fieldKey) ||
            fieldKey,
          type: value.field.type || fieldFromWorkflow?.type,
          options: value.field.options || fieldFromWorkflow?.options || [],
        }
      : fieldFromWorkflow
        ? fieldFromWorkflow
        : {
            key: fieldKey,
            label: snapshotLabels.get(fieldKey) || fieldKey,
            options: [],
          },
  };
}

function cleanSmartReportOptionText(value: unknown) {
  return String(value ?? "").trim();
}

function uniqueSmartReportItems(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => cleanSmartReportOptionText(item))
        .filter(Boolean)
    )
  );
}

function collectSmartReportArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const arrayKeys = [
    "values",
    "value",
    "selected",
    "selectedValues",
    "selectedOptions",
    "items",
    "options",
    "answers",
  ];

  for (const key of arrayKeys) {
    const candidate = record[key];

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getSmartReportOptionLabels(item: WorkflowValueLike) {
  const source = item as any;
  const options = Array.isArray(source.field?.options)
    ? source.field.options
    : [];

  const labels = new Map<string, string>();

  for (const option of options) {
    const label =
      cleanSmartReportOptionText(option.label) ||
      cleanSmartReportOptionText(option.name) ||
      cleanSmartReportOptionText(option.value) ||
      cleanSmartReportOptionText(option.key) ||
      cleanSmartReportOptionText(option.id);

    if (!label) {
      continue;
    }

    for (const key of [option.value, option.key, option.id, option.label, option.name]) {
      const cleanKey = cleanSmartReportOptionText(key);

      if (cleanKey) {
        labels.set(cleanKey, label);
      }
    }
  }

  return labels;
}

function resolveSmartReportItemLabel(
  value: unknown,
  optionLabels: Map<string, string>
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveSmartReportItemLabel(item, optionLabels))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return (
      resolveSmartReportItemLabel(record.label, optionLabels) ||
      resolveSmartReportItemLabel(record.name, optionLabels) ||
      resolveSmartReportItemLabel(record.value, optionLabels) ||
      resolveSmartReportItemLabel(record.key, optionLabels) ||
      resolveSmartReportItemLabel(record.id, optionLabels)
    );
  }

  const text = cleanSmartReportOptionText(value);

  return optionLabels.get(text) || text;
}

function splitSmartReportDisplayValue(displayValue: string) {
  return uniqueSmartReportItems(
    String(displayValue || "")
      .split(/\s*(?:،|,|؛|\r?\n)\s*/g)
      .map((item) => item.trim())
  );
}

function isSmartReportMultiValueField(item: WorkflowValueLike) {
  const type = String((item as any).field?.type || "").toLowerCase();

  return (
    type.includes("multi") ||
    type.includes("multiple") ||
    type.includes("checkbox") ||
    type.includes("checklist")
  );
}

function getSmartReportDisplayItems(
  item: WorkflowValueLike,
  displayValue: string
) {
  const source = item as any;
  const optionLabels = getSmartReportOptionLabels(item);

  const rawItems =
    collectSmartReportArrayValue(source.jsonValue).length > 0
      ? collectSmartReportArrayValue(source.jsonValue)
      : collectSmartReportArrayValue(source.value);

  const directItems = uniqueSmartReportItems(
    rawItems.map((value) => resolveSmartReportItemLabel(value, optionLabels))
  );

  if (directItems.length > 1) {
    return directItems;
  }

  if (isSmartReportMultiValueField(item)) {
    const displayItems = splitSmartReportDisplayValue(displayValue);

    if (displayItems.length > 1) {
      return displayItems;
    }
  }

  return [];
}

function applyLanguageModeToSmartReportValue(
  value: string | string[] | undefined,
  languageMode: ReportLanguageMode,
  key: string,
  label: string
) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      applyReportLanguageModeToFieldValue(item, languageMode, key, label)
    );
  }

  return applyReportLanguageModeToFieldValue(
    value || "غير محدد",
    languageMode,
    key,
    label
  );
}

function buildReportFieldMap(caseEntry: any) {
  const snapshotLabels = collectWorkflowSnapshotFieldLabels(
    caseEntry.workflowSnapshot,
  );
  const map = new Map<string, FieldLookupItem>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      const key = cleanText(field?.key);

      if (!key) return;

      map.set(key, {
        key,
        label: cleanText(field.label) || snapshotLabels.get(key) || key,
        type: field.type,
        options: field.options || [],
      });
    });
  });

  return map;
}

function cleanReportOptionText(value: unknown) {
  return String(value ?? "").trim();
}

function buildReportOptionLabelMap(field?: FieldLookupItem | null) {
  const labels = new Map<string, string>();
  const options = Array.isArray(field?.options) ? field?.options || [] : [];

  for (const option of options) {
    const label =
      cleanReportOptionText(option.label) ||
      cleanReportOptionText(option.name) ||
      cleanReportOptionText(option.text) ||
      cleanReportOptionText(option.title) ||
      cleanReportOptionText(option.value) ||
      cleanReportOptionText(option.key) ||
      cleanReportOptionText(option.id);

    if (!label) continue;

    for (const key of [
      option.value,
      option.key,
      option.id,
      option.label,
      option.name,
      option.text,
      option.title,
    ]) {
      const cleanKey = cleanReportOptionText(key);
      if (cleanKey) labels.set(cleanKey, label);
    }
  }

  return labels;
}

function getReportRawArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const keys = [
    "values",
    "value",
    "selected",
    "selectedValues",
    "selectedOptions",
    "items",
    "options",
    "answers",
  ];

  for (const key of keys) {
    const candidate = record[key];

    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function resolveReportOptionItemLabel(
  value: unknown,
  optionLabels: Map<string, string>
): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveReportOptionItemLabel(item, optionLabels))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return (
      resolveReportOptionItemLabel(record.label, optionLabels) ||
      resolveReportOptionItemLabel(record.name, optionLabels) ||
      resolveReportOptionItemLabel(record.text, optionLabels) ||
      resolveReportOptionItemLabel(record.title, optionLabels) ||
      resolveReportOptionItemLabel(record.value, optionLabels) ||
      resolveReportOptionItemLabel(record.key, optionLabels) ||
      resolveReportOptionItemLabel(record.id, optionLabels)
    );
  }

  const text = cleanReportOptionText(value);
  return optionLabels.get(text) || text;
}

function uniqueReportOptionItems(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => cleanReportOptionText(item))
        .filter(Boolean)
    )
  );
}

function resolveReportOptionDisplayValue(
  caseValue: any,
  fieldMap: Map<string, FieldLookupItem>
): string | string[] {
  const key = caseValue.field?.key || caseValue.fieldKey || "";
  const field = caseValue.field || fieldMap.get(key);
  const optionLabels = buildReportOptionLabelMap(field);
  const raw = caseValue.jsonValue ?? caseValue.value;

  const rawArray = getReportRawArrayValue(raw);

  if (rawArray.length) {
    const labels = uniqueReportOptionItems(
      rawArray.map((item) => resolveReportOptionItemLabel(item, optionLabels))
    );

    return labels.length > 1 ? labels : labels[0] || "";
  }

  if (typeof raw === "string") {
    const text = cleanReportOptionText(raw);

    if (optionLabels.has(text)) {
      return optionLabels.get(text) || text;
    }

    const parts = text
      .split(/\s*(?:،|,|؛|\r?\n)\s*/g)
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length > 1 && parts.every((part) => optionLabels.has(part))) {
      return uniqueReportOptionItems(
        parts.map((part) => optionLabels.get(part) || part)
      );
    }
  }

  return resolveReportOptionItemLabel(raw, optionLabels) || stringifyValue(raw);
}

function normalizeCaseValues(caseEntry: any): CaseValueItem[] {
  const snapshotLabels = collectWorkflowSnapshotFieldLabels(
    caseEntry.workflowSnapshot,
  );
  const activeWorkflowFieldKeys = collectActiveWorkflowFieldKeys(caseEntry);
  const fieldMap = buildReportFieldMap(caseEntry);
  const allowSnapshotFallback = fieldMap.size === 0;

  return (caseEntry.values || [])
    .map((item: any) => {
      const key = item.field?.key || item.fieldKey || "";

      if (!key) {
        return null;
      }

      if (!activeWorkflowFieldKeys.has(key)) {
        return null;
      }

      const label =
        cleanText(fieldMap.get(key)?.label) ||
        (allowSnapshotFallback ? snapshotLabels.get(key) : "") ||
        cleanText(item.field?.label) ||
        key ||
        "حقل بدون اسم";

      const resolvedValue = resolveReportOptionDisplayValue(item, fieldMap);
      const payloadValue = Array.isArray(resolvedValue)
        ? resolvedValue.filter(Boolean)
        : undefined;
      const value = Array.isArray(resolvedValue)
        ? resolvedValue.filter(Boolean).join("، ")
        : cleanText(resolvedValue);

      return {
        key,
        label,
        value,
        ...(payloadValue && payloadValue.length > 1 ? { payloadValue } : {}),
        importance: classifyField(key, label),
      };
    })
    .filter((item: CaseValueItem | null): item is CaseValueItem => {
      if (!item) {
        return false;
      }

      return !isTechnicalField(item.key, item.label, item.value);
    });
}

function findByIntent(values: CaseValueItem[], intents: string[]) {
  const normalizedIntents = intents.map(normalizeArabicText);

  return (
    values.find((item) => {
      const text = normalizeArabicText(`${item.key} ${item.label}`);
      return normalizedIntents.some((intent) => text.includes(intent));
    }) || null
  );
}

function findTitle(caseEntry: any, values: CaseValueItem[]) {
  const fromCase = String(caseEntry.title || "").trim();

  if (fromCase && fromCase !== "بدون عنوان" && fromCase.length < 120) {
    return fromCase;
  }

  const titleField = findByIntent(values, [
    "activity title",
    "activity name",
    "program title",
    "program name",
    "عنوان النشاط",
    "اسم النشاط",
    "عنوان البرنامج",
    "اسم البرنامج",
    "الموضوع",
    "title",
  ]);

  return titleField?.value || caseEntry.service?.name || "تقرير حالة";
}

function buildReportType(serviceSlug: string): SmartReportType {
  if (serviceSlug === "custom-report") return "SUMMARY_REPORT";

  if (serviceSlug.startsWith("activity-programs")) return "ACTIVITY_REPORT";

  if (serviceSlug.includes("committees") || serviceSlug.includes("meetings")) {
    return "MEETING_REPORT";
  }

  if (serviceSlug.includes("family") || serviceSlug.includes("guardian")) {
    return "FAMILY_COMMUNICATION_REPORT";
  }

  if (serviceSlug.includes("follow")) return "STUDENT_FOLLOWUP_REPORT";

  return "GENERAL_CASE_REPORT";
}

function makePrimaryField({
  key,
  label,
  value,
  languageMode,
  transformValue = true,
}: {
  key: string;
  label: string;
  value: string;
  languageMode: ReportLanguageMode;
  transformValue?: boolean;
}): SmartReportField {
  return {
    key,
    label: applyReportLanguageModeToText(label, languageMode),
    value: transformValue
      ? applyReportLanguageModeToFieldValue(
          value || "غير محدد",
          languageMode,
          key,
          label,
        )
      : value || "غير محدد",
    importance: "PRIMARY",
  };
}

function makeDetailField(
  item: CaseValueItem,
  languageMode: ReportLanguageMode,
): SmartReportField {
  const value = item.payloadValue && item.payloadValue.length > 1
    ? item.payloadValue.map((entry) =>
        applyReportLanguageModeToFieldValue(
          entry,
          languageMode,
          item.key,
          item.label,
        )
      )
    : applyReportLanguageModeToFieldValue(
        item.value || "غير محدد",
        languageMode,
        item.key,
        item.label,
      );

  return {
    key: item.key,
    label: applyReportLanguageModeToText(item.label, languageMode),
    value,
    importance: item.importance,
    group: item.importance === "NARRATIVE" ? "وصف وتفاصيل" : "تفاصيل الحالة",
  };
}

const SMART_REPORT_IMAGE_EVIDENCE_EXTENSION_PATTERN =
  /\.(png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

function hasSmartReportImageEvidenceExtension(value: unknown) {
  const text = cleanText(value).replaceAll("\\", "/");

  if (!text) return false;

  return SMART_REPORT_IMAGE_EVIDENCE_EXTENSION_PATTERN.test(text);
}

function isImageEvidence(item: any) {
  const evidenceType = cleanText(item?.type).toUpperCase();
  const mimeType = cleanText(item?.mimeType).toLowerCase();

  if (evidenceType === "IMAGE") return true;
  if (mimeType.startsWith("image/")) return true;

  return [
    item?.fileUrl,
    item?.url,
    item?.imageUrl,
    item?.publicUrl,
    item?.fileName,
    item?.originalName,
    item?.name,
  ].some((value) => hasSmartReportImageEvidenceExtension(value));
}

function normalizeEvidence(caseEntry: any): SmartReportEvidenceItem[] {
  const normalItems: SmartReportEvidenceItem[] = filterValidReportEvidenceItems(
    caseEntry.evidences || [],
  )
    .map((item: any) => ({
      id: item.id,
      title: item.fileName || item.note || "شاهد",
      caption: item.note || undefined,
      url:
        item.fileUrl ||
        item.url ||
        item.imageUrl ||
        item.publicUrl ||
        item.storagePath ||
        undefined,
      type: isImageEvidence(item) ? "IMAGE" : "FILE",
      ...(item.title ? { title: item.title } : {}),
      ...(item.caption ? { caption: item.caption } : {}),
    }));

  const caseEvidenceItems: SmartReportEvidenceItem[] = filterValidReportEvidenceItems(
    caseEntry.caseEvidences || [],
  )
    .map((item: any) => ({
      id: item.id,
      title: item.fileName || "شاهد",
      url:
        item.fileUrl ||
        item.url ||
        item.imageUrl ||
        item.publicUrl ||
        item.storagePath ||
        undefined,
      type: isImageEvidence(item) ? "IMAGE" : "FILE",
      ...(item.title ? { title: item.title } : {}),
      ...(item.caption || item.note
        ? { caption: item.caption || item.note }
        : {}),
    }));

  const assignmentEvidenceItems: SmartReportEvidenceItem[] = Array.isArray(
    caseEntry.activityAssignment?.submittedEvidenceItems,
  )
    ? filterValidReportEvidenceItems(
        caseEntry.activityAssignment.submittedEvidenceItems,
      )
        .map((item: any, index: number) => ({
          id: item.id || `assignment-evidence-${index + 1}`,
          title: item.fileName || item.title || `شاهد ${index + 1}`,
          caption: item.caption || item.note || undefined,
          url:
            item.fileUrl ||
            item.url ||
            item.imageUrl ||
            item.publicUrl ||
            item.storagePath ||
            undefined,
          type: isImageEvidence(item) ? "IMAGE" : "FILE",
        }))
    : [];

  return [...normalItems, ...caseEvidenceItems, ...assignmentEvidenceItems];
}

function resolveSchoolProfileForReport(
  caseEntry: any,
  current: CurrentUserLike,
) {
  return (
    caseEntry?.schoolAccount?.profile ||
    current.user.schoolAccount?.profile ||
    null
  );
}
const ACTIVITY_REPORT_SERVICE_SLUGS = new Set([
  "activity-programs",
  "citizenship-life",
  "science-technology",
  "culture-arts",
  "sports-health",
  "scouting",
  "events-occasions",
  "non-class-periods",
  "school-broadcast",
]);

function isActivityProgramReportService(serviceSlug: string) {
  const slug = String(serviceSlug || "").trim();

  if (!slug) {
    return false;
  }

  return (
    ACTIVITY_REPORT_SERVICE_SLUGS.has(slug) ||
    slug.startsWith("activity-programs/") ||
    slug.startsWith("activity-programs-")
  );
}

function buildSignatures(
  caseEntry: any,
  current: CurrentUserLike,
  languageMode: ReportLanguageMode,
  effectivePrincipalSignatureUrl: string | null,
): SmartReportSignature[] {
  const profile = resolveSchoolProfileForReport(caseEntry, current);
  tracePrincipalSignature({
    stage: "SCHOOL_PROFILE_LOADED",
    location: "buildSmartReportPayloadForCase",
    details: {
      caseId: caseEntry.id,
      schoolAccountId: caseEntry.schoolAccountId,
      viewerId: current.user.id,
      viewerRole: current.user.role,
      principalSignatureSignedAtExists: Boolean(profile?.principalSignatureSignedAt),
      policy: profile?.principalSignatureReusePolicy || "MANUAL_ONLY",
      principalNamePresent: Boolean(profile?.principalName),
    },
    signature: profile?.principalSignatureUrl,
  });
  const serviceSlug = caseEntry.service?.slug || "";
  const isActivity = isActivityProgramReportService(serviceSlug);
  const hasActivityAssignment = Boolean(caseEntry.activityAssignment);
  const transformTitle = (value: string) =>
    applyReportLanguageModeToText(value, languageMode);

  if (current.user.role === "PRINCIPAL") {
    const managerLabel = getArabicUserRoleLabel({
      role: current.user.role,
      gender: current.user.gender,
    });

    return [
      {
        key: "principal",
        label: managerLabel,
        signerName:
          profile?.principalName ||
          current.user.officialName ||
          current.user.name,
        signerTitle: managerLabel,
        imageUrl: effectivePrincipalSignatureUrl,
        required: false,
      },
    ];
  }

  const signatures: SmartReportSignature[] = [];

  signatures.push({
    key: "principal",
    label: transformTitle("مدير المدرسة"),
    signerName: profile?.principalName || "مدير المدرسة",
    signerTitle: transformTitle("مدير المدرسة"),
    // The effective school-identity signature is part of the semantic report
    // payload. The resolver remains the authority for other report-specific
    // signature sources; this builder preserves the approved school identity
    // signature in the same principal slot when it is available.
    imageUrl: effectivePrincipalSignatureUrl,
    required: false,
  });

  if (
    isActivity &&
    (current.user.role !== "TEACHER" || hasActivityAssignment)
  ) {
    signatures.push({
      key: "activity_leader",
      label: transformTitle("رائد النشاط"),
      signerName:
        profile?.activityLeaderName ||
        current.user.officialName ||
        current.user.name,
      signerTitle: transformTitle("رائد النشاط"),
      imageUrl: profile?.activityLeaderSignatureUrl || profile?.counselorSignatureUrl || null,
      required: true,
    });
  } else {
    const isTeacher = current.user.role === "TEACHER";
    const currentUserRoleLabel = getArabicUserRoleLabel({
      role: current.user.role,
      gender: current.user.gender,
    });

    signatures.push({
      key: "counselor",
      label: isTeacher
        ? currentUserRoleLabel
        : transformTitle("الموجه الطلابي"),
      signerName: current.user.officialName || current.user.name,
      signerTitle: isTeacher
        ? currentUserRoleLabel
        : current.user.jobTitle || transformTitle("الموجه الطلابي"),
      imageUrl: isTeacher
        ? current.user.signatureUrl || null
        : profile?.counselorSignatureUrl ||
          profile?.activityLeaderSignatureUrl ||
          null,
      signedAt: isTeacher
        ? current.user.signatureSignedAt?.toISOString() || null
        : null,
      required: true,
    });
  }

  if (caseEntry.activityAssignment?.teacherName) {
    signatures.push({
      key: "teacher",
      label: transformTitle("توقيع المعلم المنفذ"),
      signerName:
        caseEntry.activityAssignment.teacherSignedName ||
        caseEntry.activityAssignment.teacherName,
      signerTitle: transformTitle("المعلم المنفذ"),
      imageUrl:
        caseEntry.activityAssignment.teacherSignatureUrl ||
        (current.user.role === "TEACHER"
          ? current.user.signatureUrl || null
          : null),
      signedAt:
        caseEntry.activityAssignment.teacherSignedAt?.toISOString?.() ||
        (current.user.role === "TEACHER"
          ? current.user.signatureSignedAt?.toISOString() || null
          : null),
      required: true,
    });
  }

  return signatures;
}

function buildNarrative({
  title,
  serviceName,
  semester,
  executor,
  executionDate,
  targetGroup,
  executionMethod,
  evidenceCount,
  languageMode,
}: {
  title: string;
  serviceName: string;
  semester: string;
  executor: string;
  executionDate: string;
  targetGroup: string;
  executionMethod: string;
  evidenceCount: number;
  languageMode: ReportLanguageMode;
}) {
  const executorRole = applyReportLanguageModeToText("المعلم المنفذ", languageMode);
  const safeTargetGroup = applyReportLanguageModeToFieldValue(
    targetGroup || "الفئة المستهدفة",
    languageMode,
    "target_group",
    "الفئة المستهدفة",
  );
  const safeExecutionMethod = applyReportLanguageModeToFieldValue(
    executionMethod || "غير محددة",
    languageMode,
    "execution_method",
    "طريقة التنفيذ",
  );

  return [
    `تم تنفيذ برنامج النشاط الطلابي «${title}» ضمن مجال ${serviceName}.`,
    `ونُفذ البرنامج خلال ${semester || "الفصل الدراسي المحدد"}، ${languageMode === "FEMALE" ? "وتولت التنفيذ" : "وتولى التنفيذ"} ${executorRole} ${executor || "غير محدد"}.`,
    `وكان تاريخ التنفيذ ${executionDate || "غير محدد"}.`,
    `واستهدف البرنامج ${safeTargetGroup}.`,
    `وجرى التنفيذ وفق آلية: ${safeExecutionMethod}.`,
    `وتم توثيق النشاط من خلال ${evidenceCount} شاهد/مرفق محفوظ في الحالة.`,
  ].join(" ");
}

export async function buildSmartReportPayloadForCase({
  caseId,
  current,
}: {
  caseId: string;
  current: CurrentUserLike;
}): Promise<BuildSmartReportPayloadResult> {
  if (!caseId) {
    return {
      ok: false,
      status: 400,
      message: "رقم الحالة مطلوب.",
    };
  }

  const isAdmin = current.user.role === "ADMIN";

  if (!isAdmin && !current.user.schoolAccountId) {
    return {
      ok: false,
      status: 401,
      message: "يلزم تسجيل الدخول بحساب مدرسة.",
    };
  }

  const caseEntry = await prisma.caseEntry.findFirst({
    where: {
      id: caseId,
      ...buildCaseEntryReportWhereForUser(current.user),
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
      service: true,
      workflow: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      student: {
        include: {
          guardian: true,
        },
      },
      createdBy: true,
      values: {
        include: {
          field: {
            include: {
              options: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },
      caseEvidences: {
        orderBy: {
          createdAt: "asc",
        },
      },
      activityAssignment: true,
    },
  });

  if (!caseEntry) {
    return {
      ok: false,
      status: 404,
      message: "لم يتم العثور على الحالة أو لا تملك صلاحية الوصول لها.",
    };
  }

  const languageMode = getReportLanguageModeFromUserGender(current.user.gender);
  const workflowFields = (caseEntry.workflow?.steps || []).flatMap(
    (step: any) => step.fields || [],
  );
  let tables = extractSmartReportTables({
    values: caseEntry.values || [],
    fields: workflowFields,
    snapshotFields: collectWorkflowSnapshotFields(caseEntry.workflowSnapshot),
  });
  const studentTableRowIds = Array.from(
    new Set(
      tables
        .filter(isStudentDataTable)
        .flatMap((table) => table.rows.map((row) => cleanText(row.id)))
        .filter(Boolean),
    ),
  );
  if (studentTableRowIds.length) {
    const studentGenders = await prisma.student.findMany({
      where: {
        id: { in: studentTableRowIds },
        schoolAccountId: caseEntry.schoolAccountId,
      },
      select: { id: true, gender: true },
    });
    const genderByStudentId = new Map(
      studentGenders.map((student) => [student.id, student.gender]),
    );
    tables = tables.map((table) =>
      isStudentDataTable(table)
        ? {
            ...table,
            rows: table.rows.map((row) => ({
              ...row,
              metadata: {
                ...row.metadata,
                gender:
                  genderByStudentId.get(row.id) ||
                  (row.id === caseEntry.studentId
                    ? caseEntry.student?.gender || null
                    : null),
              },
            })),
          }
        : table,
    );
  }
  const tableFieldKeys = new Set(tables.map((table) => table.sourceFieldKey));
  const values = filterPrivateReportValues(normalizeCaseValues(caseEntry)).filter(
    (item) => !tableFieldKeys.has(cleanText(item.key).toLowerCase()),
  );
  const title = findTitle(caseEntry, values);
  const serviceSlug = caseEntry.service?.slug || "general";
  const isCustomReport = serviceSlug === "custom-report";
  const serviceName = caseEntry.service?.name || "خدمة";
  const reportType = buildReportType(serviceSlug);
  const profile = resolveSchoolProfileForReport(caseEntry, current);
  const [selectedStaffAuthorization, reportTwoActive] = await Promise.all([
    caseEntry.schoolAccountId && caseEntry.createdById
      ? prisma.principalSignatureReuseAuthorization.findUnique({
          where: {
            schoolAccountId_userId: {
              schoolAccountId: caseEntry.schoolAccountId,
              userId: caseEntry.createdById,
            },
          },
          select: { id: true },
        })
      : null,
    prisma.reportTwoActive.findUnique({
      where: { caseEntryId: caseEntry.id },
      select: {
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureSignedById: true,
        signatureRequests: {
          where: {
            status: "SIGNED",
            signedAt: { not: null },
            signatureUrl: { not: null },
          },
          orderBy: { signedAt: "desc" },
          take: 1,
          select: { status: true, signedAt: true, signatureUrl: true },
        },
      },
    }),
  ]);
  const effectivePrincipalSignature = resolvePrincipalSignatureForReport({
    schoolIdentity: {
      schoolAccountId: caseEntry.schoolAccountId || current.user.schoolAccountId || null,
      principalSignatureUrl: profile?.principalSignatureUrl,
      principalSignatureSignedAt: profile?.principalSignatureSignedAt || null,
    },
    signLink: reportTwoActive?.signatureRequests[0] || null,
    principalDashboard: reportTwoActive,
    reusePolicy: profile?.principalSignatureReusePolicy,
    reportOwner: {
      id: caseEntry.createdById || current.user.id,
      schoolAccountId: caseEntry.schoolAccountId || current.user.schoolAccountId || null,
      role: caseEntry.createdBy?.role || current.user.role,
    },
    selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
  });
  tracePrincipalSignature({
    stage: "REPORT_OWNER_RESOLVED",
    location: "buildSmartReportPayloadForCase",
    details: {
      caseId: caseEntry.id,
      ownerId: caseEntry.createdById || current.user.id,
      ownerRole: caseEntry.createdBy?.role || current.user.role,
      ownerSchoolAccountId: caseEntry.schoolAccountId || current.user.schoolAccountId || null,
      viewerId: current.user.id,
      viewerRole: current.user.role,
      ownerEqualsViewer: (caseEntry.createdById || current.user.id) === current.user.id,
      policy: profile?.principalSignatureReusePolicy || "MANUAL_ONLY",
      selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
    },
  });
  tracePrincipalSignature({
    stage: "SMART_PAYLOAD_AFTER_RESOLVER",
    location: "buildSmartReportPayloadForCase",
    details: { caseId: caseEntry.id, resolverSource: effectivePrincipalSignature.source },
    signature: effectivePrincipalSignature.signatureUrl,
  });

  const executionDateField = findByIntent(values, [
    "execution date",
    "activity date",
    "meeting date",
    "gregorian date",
    "date",
    "تاريخ التنفيذ",
    "تاريخ",
    "اليوم",
  ]);

  const semesterField = findByIntent(values, [
    "semester",
    "term",
    "الفصل الدراسي",
    "الفصل",
  ]);

  const executorField = findByIntent(values, [
    "executor",
    "teacher",
    "activity leader",
    "assigned teacher",
    "المعلم المنفذ",
    "المعلم",
    "المنفذ",
    "رائد النشاط",
  ]);

  const targetGroupField = findByIntent(values, [
    "target group",
    "beneficiaries",
    "target",
    "الفئة المستهدفة",
    "المستفيدون",
    "الصف",
    "الفصول",
  ]);

  const executionMethodField = findByIntent(values, [
    "execution method",
    "method",
    "mechanism",
    "آلية التنفيذ",
    "الية التنفيذ",
    "طريقة التنفيذ",
  ]);

  const weekField = findByIntent(values, [
    "week",
    "school week",
    "الأسبوع",
    "اسبوع",
  ]);

  const dateText =
    executionDateField?.value ||
    formatDateOnly(caseEntry.submittedAt || caseEntry.createdAt);

  const dayText = formatDayName(executionDateField?.value || caseEntry.createdAt);
  const executionDateText = dayText ? `${dateText} - ${dayText}` : dateText;

  const semesterText =
    semesterField?.value ||
    profile?.currentSemester ||
    "الفصل الدراسي غير محدد";

  const executorText =
    executorField?.value ||
    caseEntry.activityAssignment?.teacherName ||
    current.user.officialName ||
    current.user.name ||
    "غير محدد";

  const targetGroupText =
    targetGroupField?.value ||
    caseEntry.student?.grade ||
    caseEntry.student?.stage ||
    "غير محدد";

  const executionMethodText = executionMethodField?.value || "غير محدد";

  const evidence = normalizeEvidence(caseEntry);
  const primaryFields: SmartReportField[] = [];

  const detailFields: SmartReportField[] = values.map((item) =>
    makeDetailField(item, languageMode),
  );

  const missingItems: string[] = [];

  if (!isCustomReport) {
    if (!evidence.length) {
      missingItems.push("لا توجد شواهد مرفقة.");
    }

    if (!executorText || executorText === "غير محدد") {
      missingItems.push("اسم المنفذ غير محدد.");
    }
  }

  const percentage = Math.max(40, 100 - missingItems.length * 15);

  const payload: SmartReportPayload = {
    reportType,
    languageMode,
    title,
    identity: {
      ministryName: "وزارة التعليم",
      educationDepartment:
        profile?.educationDepartment || "الإدارة العامة للتعليم",
      educationOffice: profile?.educationOffice || "مكتب التعليم",
      schoolName:
        profile?.schoolName ||
        caseEntry.schoolAccount?.name ||
        current.user.schoolAccount?.name ||
        "اسم المدرسة",
      schoolLogoUrl: profile?.logoUrl || "/uploads/school-logos/MOE.png",
      academicYear: profile?.academicYear || "العام الدراسي",
      currentSemester: profile?.currentSemester || semesterText,
      counselorName: current.user.officialName || current.user.name || "",
      counselorSignatureUrl: profile?.counselorSignatureUrl || "",
      principalName: profile?.principalName || "",
      principalSignatureUrl: effectivePrincipalSignature.signatureUrl || "",
      activityLeaderName: profile?.activityLeaderName || "",
      activityLeaderSignatureUrl: profile?.activityLeaderSignatureUrl || "",
      schoolLeaderName: profile?.principalName || "",
      schoolLeaderSignatureUrl: effectivePrincipalSignature.signatureUrl || "",
      userName: current.user.officialName || current.user.name || "",
      userSignatureUrl:
        current.user.role === "PRINCIPAL"
          ? effectivePrincipalSignature.signatureUrl || ""
          : current.user.role === "TEACHER"
          ? current.user.signatureUrl || ""
          : profile?.counselorSignatureUrl ||
            profile?.activityLeaderSignatureUrl ||
            "",
    },
    caseInfo: {
      id: caseEntry.id,
      title,
      status: caseEntry.status,
      createdAt: formatDateOnly(caseEntry.createdAt),
      issuedAt: formatDateOnly(new Date()),
      issuedBy: current.user.officialName || current.user.name,
    },
    service: {
      slug: serviceSlug,
      name: serviceName,
    },
    student: caseEntry.student
      ? {
          name: caseEntry.student.fullName || undefined,
          nationalId: caseEntry.student.nationalId || undefined,
          grade: caseEntry.student.grade || undefined,
          classroom: caseEntry.student.classroom || undefined,
          stage: caseEntry.student.stage || undefined,
          guardianName: caseEntry.student.guardian?.name || undefined,
          guardianPhone: caseEntry.student.guardian?.phone || undefined,
        }
      : null,
    primaryFields: isCustomReport
      ? detailFields.map((field) => ({
          ...field,
          importance: "PRIMARY" as const,
          group: "حقول التقرير الخاص",
        }))
      : primaryFields,
    detailFields,
    ...(tables.length ? { tables } : {}),
    narrative: isCustomReport
      ? {
          title: "ملخص التقرير",
          body:
            detailFields.length > 0
              ? detailFields
                  .map((field) => `${field.label}: ${field.value || "غير محدد"}`)
                  .join("، ")
              : "تم إنشاء تقرير خاص من بيانات الحالة.",
        }
      : {
          title: "وصف التنفيذ",
          body: !shouldIncludeReportNarrative(serviceSlug)
            ? ""
            : buildNarrative({
            title,
            serviceName,
            semester: semesterText,
            executor: executorText,
            executionDate: executionDateText,
            targetGroup: targetGroupText,
            executionMethod: executionMethodText,
            evidenceCount: evidence.length,
            languageMode,
            }),
        },
    evidence: {
      layout: "GRID_2X2",
      items: evidence,
    },
    signatures: buildSignatures(caseEntry, current, languageMode, effectivePrincipalSignature.signatureUrl),
    readiness: {
      status: missingItems.length ? "NEEDS_REVIEW" : "READY",
      percentage,
      missingItems,
      notes: [],
    },
  };

  tracePrincipalSignature({
    stage: "SMART_PAYLOAD_FINAL",
    location: "buildSmartReportPayloadForCase",
    details: { caseId: caseEntry.id, expectedPrincipalCardsMax: 1 },
    payload,
  });

  return {
    ok: true,
    payload,
    serviceSlug,
    caseEntryId: caseEntry.id,
    reportOwner: {
      id: caseEntry.createdById || current.user.id,
      schoolAccountId: caseEntry.schoolAccountId || current.user.schoolAccountId || null,
      role: caseEntry.createdBy?.role || current.user.role || null,
    },
  };
}
