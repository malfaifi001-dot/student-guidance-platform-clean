import { notFound } from "next/navigation";

import {
  type GuardianSummonsReasonItem,
  type GuardianSummonsTemplateData,
} from "@/components/reports/guardian-summons/guardian-summons-template";
import { prisma } from "@/lib/prisma";
import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";

type WorkflowOptionDefinition = {
  id?: string | null;
  label?: string | null;
  value?: string | null;
  order?: number | null;
};

type WorkflowFieldDefinition = {
  id?: string | null;
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: WorkflowOptionDefinition[] | null;
};

type WorkflowForDefinitions = {
  steps?: Array<{
    fields?: WorkflowFieldDefinition[] | null;
  }> | null;
} | null;

type CaseValueRow = {
  id: string;
  fieldId: string | null;
  fieldKey: string;
  value: string | null;
  jsonValue: unknown;
  field: WorkflowFieldDefinition | null;
};

type WorkflowFieldDefinitionMap = {
  byId: Map<string, WorkflowFieldDefinition>;
  byKey: Map<string, WorkflowFieldDefinition>;
  byNormalizedKey: Map<string, WorkflowFieldDefinition>;
};

type StoredChoice = {
  tokens: string[];
  fallbackLabel: string;
};

type UserGender = "MALE" | "FEMALE" | "UNKNOWN" | string | null;

type GuardianSummonsCurrentUser = {
  name: string | null;
  officialName: string | null;
  jobTitle: string | null;
  gender: UserGender;
} | null;

const DAY_LABELS: Record<string, string> = {
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

const PERIOD_LABELS: Record<string, string> = {
  am: "صباحًا",
  morning: "صباحًا",
  pm: "مساءً",
  evening: "مساءً",
  p1: "الحصة الأولى",
  p2: "الحصة الثانية",
  p3: "الحصة الثالثة",
  p4: "الحصة الرابعة",
  p5: "الحصة الخامسة",
  p6: "الحصة السادسة",
  p7: "الحصة السابعة",
};

const LEGACY_REASON_LABELS: Record<string, string> = {
  frequent_absence: "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.",
  absence: "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.",
  morning_lateness: "تأخره الصباحي المتكرر لأكثر من خمسة أيام بدون عذر.",
  lateness: "تأخره الصباحي المتكرر لأكثر من خمسة أيام بدون عذر.",
  low_academic_achievement: "ضعف التحصيل الدراسي.",
  low_achievement: "ضعف التحصيل الدراسي.",
  academic_weakness: "ضعف التحصيل الدراسي.",
  low_test_scores: "انخفاض درجات الاختبارات.",
  behavior_problem: "وجود مشكلة سلوكية.",
  behavioral_problem: "وجود مشكلة سلوكية.",
  other: "أخرى",
  __other__: "أخرى",
};

function cleanText(value: unknown) {
  const text = String(repairPotentialUtf8Mojibake(value) ?? "").trim();

  return text && text !== "null" && text !== "undefined" ? text : "";
}

function normalizeInternalSignatureUrl(value: unknown) {
  const url = cleanText(value).replace(/\\/g, "/");

  if (!url) return "";
  if (url.includes("..")) return "";
  if (/^[a-z]:\//i.test(url)) return "";
  if (/^(https?:|data:|javascript:|file:|blob:)/i.test(url)) return "";
  if (!url.startsWith("/uploads/school-signatures/")) return "";

  return url;
}

function normalizeText(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\s-]+/g, "")
    .trim();
}

function normalizeLookupKey(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .trim();
}

function isOtherReason(value: unknown) {
  const lookupKey = normalizeLookupKey(value);
  const compactKey = normalizeText(value);

  return (
    lookupKey === "other" ||
    lookupKey === "__other__" ||
    compactKey === "اخرى" ||
    compactKey.includes("اخرى")
  );
}

function toArabicDigits(value: string) {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  return value.replace(/\d/g, (digit) => digits[Number(digit)] || digit);
}

function parsePotentialJson(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function getRawStoredValue(row: CaseValueRow) {
  if (row.jsonValue !== null && row.jsonValue !== undefined) {
    return row.jsonValue;
  }

  const text = cleanText(row.value);

  return text ? parsePotentialJson(text) : "";
}

function stringifyRawValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return cleanText(value);

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(stringifyRawValue).filter(Boolean).join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return (
      cleanText(record.label) ||
      cleanText(record.name) ||
      cleanText(record.fullName) ||
      cleanText(record.value) ||
      cleanText(record.key) ||
      cleanText(record.id) ||
      ""
    );
  }

  return cleanText(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function buildWorkflowFieldDefinitionMap(
  workflow: WorkflowForDefinitions,
): WorkflowFieldDefinitionMap {
  const byId = new Map<string, WorkflowFieldDefinition>();
  const byKey = new Map<string, WorkflowFieldDefinition>();
  const byNormalizedKey = new Map<string, WorkflowFieldDefinition>();

  workflow?.steps?.forEach((step) => {
    step.fields?.forEach((field) => {
      const id = cleanText(field.id);
      const key = cleanText(field.key);

      if (id) byId.set(id, field);
      if (key) {
        byKey.set(key, field);
        byNormalizedKey.set(normalizeText(key), field);
      }
    });
  });

  return {
    byId,
    byKey,
    byNormalizedKey,
  };
}

function getFieldForRow(
  row: CaseValueRow,
  fieldMap: WorkflowFieldDefinitionMap,
) {
  const fieldId = cleanText(row.fieldId || row.field?.id);
  const fieldKey = cleanText(row.field?.key || row.fieldKey);
  const normalizedFieldKey = normalizeText(fieldKey);

  return (
    (fieldId ? fieldMap.byId.get(fieldId) : null) ||
    (fieldKey ? fieldMap.byKey.get(fieldKey) : null) ||
    (normalizedFieldKey
      ? fieldMap.byNormalizedKey.get(normalizedFieldKey)
      : null) ||
    row.field ||
    null
  );
}

function findValueRow(
  rows: CaseValueRow[],
  fieldMap: WorkflowFieldDefinitionMap,
  aliases: string[],
) {
  const normalizedAliases = new Set(aliases.map(normalizeText).filter(Boolean));

  return (
    rows.find((row) => {
      const field = getFieldForRow(row, fieldMap);
      const keys = [row.fieldKey, row.field?.key, field?.key]
        .map(normalizeText)
        .filter(Boolean);

      return keys.some((key) => normalizedAliases.has(key));
    }) || null
  );
}

function extractStoredChoices(value: unknown): StoredChoice[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value === "string") {
    const parsed = parsePotentialJson(value);

    if (parsed !== value) {
      return extractStoredChoices(parsed);
    }

    return value
      .split(",")
      .map((item) => cleanText(item))
      .filter(Boolean)
      .map((item) => ({
        tokens: [item],
        fallbackLabel: item,
      }));
  }

  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value);

    return [{ tokens: [text], fallbackLabel: text }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractStoredChoices(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const tokens = [
      record.value,
      record.label,
      record.name,
      record.id,
      record.key,
    ]
      .map(cleanText)
      .filter(Boolean);
    const fallbackLabel =
      cleanText(record.label) ||
      cleanText(record.name) ||
      cleanText(record.value) ||
      cleanText(record.key) ||
      cleanText(record.id);

    return tokens.length ? [{ tokens, fallbackLabel }] : [];
  }

  const text = cleanText(value);

  return text ? [{ tokens: [text], fallbackLabel: text }] : [];
}

function getOtherValueForField(fieldKey: string, rows: CaseValueRow[]) {
  if (!fieldKey) return "";

  const otherKey = `${fieldKey}__other`;

  const found = rows.find((row) => {
    const key = row.field?.key || row.fieldKey;

    return key === otherKey || row.fieldKey === otherKey;
  });

  if (!found) return "";

  return stringifyRawValue(found.jsonValue ?? found.value);
}

function findOptionByChoice(
  field: WorkflowFieldDefinition | null,
  choice: StoredChoice,
) {
  const options = field?.options || [];
  const normalizedTokens = choice.tokens.map(normalizeText).filter(Boolean);

  return (
    options.find((option) => {
      const optionValue = normalizeText(option.value);
      const optionLabel = normalizeText(option.label);
      const optionId = normalizeText(option.id);

      return normalizedTokens.some(
        (token) =>
          token === optionValue || token === optionLabel || token === optionId,
      );
    }) || null
  );
}

function fallbackLabelForToken(value: string) {
  const lookupKey = normalizeLookupKey(value);

  return (
    DAY_LABELS[lookupKey] ||
    PERIOD_LABELS[lookupKey] ||
    LEGACY_REASON_LABELS[lookupKey] ||
    ""
  );
}

function resolveSingleWorkflowLabel(
  field: WorkflowFieldDefinition | null,
  choice: StoredChoice,
  otherValue = "",
) {
  const matchedOption = findOptionByChoice(field, choice);
  const rawValue = choice.tokens[0] || choice.fallbackLabel;
  const optionValue = cleanText(matchedOption?.value);
  const optionLabel = cleanText(matchedOption?.label);
  const normalizedValue = normalizeLookupKey(optionValue || rawValue);

  if (normalizedValue === "other" || normalizedValue === "__other__") {
    return otherValue || optionLabel || "أخرى";
  }

  return (
    optionLabel ||
    fallbackLabelForToken(rawValue) ||
    cleanText(choice.fallbackLabel) ||
    rawValue
  );
}

function resolveStoredOptionLabels(
  field: WorkflowFieldDefinition | null,
  rawValue: unknown,
  otherValue = "",
) {
  const choices = extractStoredChoices(rawValue);
  const seen = new Set<string>();

  return choices
    .map((choice) => resolveSingleWorkflowLabel(field, choice, otherValue))
    .map(cleanText)
    .filter(Boolean)
    .filter((label) => {
      const key = normalizeText(label);

      if (seen.has(key)) return false;
      seen.add(key);

      return true;
    });
}

function resolveWorkflowValue(
  row: CaseValueRow,
  fieldMap: WorkflowFieldDefinitionMap,
  rows: CaseValueRow[],
) {
  const field = getFieldForRow(row, fieldMap);
  const rawValue = getRawStoredValue(row);
  const fieldKey = cleanText(field?.key || row.fieldKey);
  const labels = resolveStoredOptionLabels(
    field,
    rawValue,
    getOtherValueForField(fieldKey, rows),
  );

  if (
    field?.options?.length ||
    labels.some((label) => label !== stringifyRawValue(rawValue))
  ) {
    return labels.join("، ");
  }

  return stringifyRawValue(rawValue);
}

function findResolvedValue(
  rows: CaseValueRow[],
  fieldMap: WorkflowFieldDefinitionMap,
  aliases: string[],
) {
  const row = findValueRow(rows, fieldMap, aliases);

  return row ? cleanText(resolveWorkflowValue(row, fieldMap, rows)) : "";
}

function getObjectText(
  value: Record<string, unknown> | null | undefined,
  keys: string[],
) {
  if (!value) return "";

  for (const key of keys) {
    const text = cleanText(value[key]);
    if (text) return text;
  }

  return "";
}

function formatArabicDate(value: string) {
  const text = cleanText(value);

  if (!text) return "";

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    return toArabicDigits(`${isoDate[3]} / ${isoDate[2]} / ${isoDate[1]}`);
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = String(parsed.getFullYear());

    return toArabicDigits(`${day} / ${month} / ${year}`);
  }

  return toArabicDigits(text);
}

function formatTime(value: string) {
  const text = cleanText(value);

  if (!text) return "";

  return toArabicDigits(text.replace(/:00$/, ":00"));
}

function buildReasonItems(
  rows: CaseValueRow[],
  fieldMap: WorkflowFieldDefinitionMap,
): GuardianSummonsReasonItem[] {
  const row = findValueRow(rows, fieldMap, [
    "summons_reasons",
    "summonsReasons",
    "summons_reason",
    "summonsReason",
  ]);

  if (!row) return [];

  const field = getFieldForRow(row, fieldMap);
  const rawValue = getRawStoredValue(row);
  const choices = extractStoredChoices(rawValue);
  const otherValue = getOtherValueForField(
    cleanText(field?.key || row.fieldKey),
    rows,
  );
  const seen = new Set<string>();

  return choices
    .map((choice, index) => {
      const matchedOption = findOptionByChoice(field, choice);
      const optionValue = cleanText(matchedOption?.value);
      const optionLabel = cleanText(matchedOption?.label);
      const rawIdentity =
        optionValue || choice.tokens[0] || choice.fallbackLabel;

      const resolvedLabel =
        optionLabel ||
        fallbackLabelForToken(rawIdentity) ||
        resolveSingleWorkflowLabel(field, choice, otherValue) ||
        rawIdentity;

      const other =
        normalizeLookupKey(optionValue) === "other" ||
        normalizeLookupKey(optionValue) === "__other__" ||
        normalizeLookupKey(rawIdentity) === "other" ||
        normalizeLookupKey(rawIdentity) === "__other__" ||
        normalizeText(resolvedLabel).includes("اخرى");

      return {
        id: cleanText(matchedOption?.id) || optionValue || `${row.id}-${index}`,
        label: other ? "أخرى" : cleanText(resolvedLabel),
        selected: true,
        otherText: other ? otherValue || null : null,
      };
    })
    .filter((reason) => {
      const key =
        isOtherReason(reason.id) || isOtherReason(reason.label)
          ? "other"
          : normalizeText(reason.label);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function getHijriYear(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date();

  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      year: "numeric",
    }).formatToParts(date);

    return parts.find((part) => part.type === "year")?.value || "";
  } catch {
    return "";
  }
}

function getDefaultCounselorTitle(gender: UserGender) {
  if (gender === "MALE") return "الموجه الطلابي";
  if (gender === "FEMALE") return "الموجهة الطلابية";

  return "الموجه/ـة الطلابي/ـة";
}

function buildGuardianSummonsSignatoryData({
  caseEntry,
  currentUser,
}: {
  caseEntry: Awaited<ReturnType<typeof loadGuardianSummonsCase>>;
  currentUser: GuardianSummonsCurrentUser;
}) {
  const schoolProfile = caseEntry.schoolAccount.profile;
  const creator = caseEntry.createdBy;
  const counselorGender = creator?.gender || currentUser?.gender || "UNKNOWN";
  const counselorJobTitle =
    cleanText(creator?.jobTitle) ||
    cleanText(currentUser?.jobTitle) ||
    getDefaultCounselorTitle(counselorGender);

  return {
    counselorName:
      cleanText(creator?.officialName) ||
      cleanText(creator?.name) ||
      cleanText(currentUser?.officialName) ||
      cleanText(currentUser?.name),
    counselorJobTitle,
    counselorSignatureUrl: normalizeInternalSignatureUrl(
      schoolProfile?.counselorSignatureUrl,
    ),
    principalName: cleanText(schoolProfile?.principalName),
    principalJobTitle: "مدير/ة المدرسة",
    principalSignatureUrl: normalizeInternalSignatureUrl(
      schoolProfile?.principalSignatureUrl,
    ),
  };
}

export async function loadGuardianSummonsCase(
  caseId: string,
  context: {
    isAdmin: boolean;
    schoolAccountId: string | null;
    user: { id: string; role: string };
  },
) {
  if (!context.isAdmin && context.user.role !== "COUNSELOR") {
    notFound();
  }

  const caseEntry = await prisma.caseEntry.findFirst({
    where: {
      id: caseId,
      service: {
        slug: "guardian-summons",
      },
      ...(context.isAdmin
        ? {}
        : { schoolAccountId: context.schoolAccountId || "__missing__" }),
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
            orderBy: {
              order: "asc",
            },
            include: {
              fields: {
                orderBy: {
                  order: "asc",
                },
                include: {
                  options: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      },
      student: {
        include: {
          guardian: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          officialName: true,
          jobTitle: true,
          gender: true,
        },
      },
      values: {
        include: {
          field: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!caseEntry) {
    notFound();
  }

  return caseEntry;
}

export function buildGuardianSummonsTemplateData({
  caseEntry,
  currentUser,
}: {
  caseEntry: Awaited<ReturnType<typeof loadGuardianSummonsCase>>;
  currentUser: GuardianSummonsCurrentUser;
}): GuardianSummonsTemplateData {
  const schoolProfile = caseEntry.schoolAccount.profile;
  const student = caseEntry.student;
  const guardian = student?.guardian;
  const values = caseEntry.values as CaseValueRow[];
  const fieldMap = buildWorkflowFieldDefinitionMap(caseEntry.workflow);
  const selectedStudent = asRecord(
    values.find((item) => item.fieldKey === "selectedStudent")?.jsonValue,
  );
  const guardianSnapshot = asRecord(
    values.find((item) => item.fieldKey === "guardianSnapshot")?.jsonValue,
  );
  const guardianName =
    findResolvedValue(values, fieldMap, [
      "guardian_name",
      "guardianName",
      "parent_name",
      "parentName",
    ]) ||
    cleanText(guardian?.name) ||
    getObjectText(guardianSnapshot, ["name", "fullName", "guardianName"]) ||
    getObjectText(selectedStudent, ["guardianName"]);
  const guardianPhone =
    findResolvedValue(values, fieldMap, [
      "guardian_phone",
      "guardianPhone",
      "parent_phone",
      "parentPhone",
      "guardian_mobile",
      "guardianMobile",
    ]) ||
    cleanText(guardian?.phone) ||
    getObjectText(guardianSnapshot, ["phone", "mobile", "guardianPhone"]) ||
    getObjectText(selectedStudent, ["guardianPhone"]);
  const appointmentDate = findResolvedValue(values, fieldMap, [
    "attendance_date",
    "attendanceDate",
    "summons_date",
    "summonsDate",
  ]);
  const notes = findResolvedValue(values, fieldMap, ["notes", "note"]);
  const signatoryData = buildGuardianSummonsSignatoryData({
    caseEntry,
    currentUser,
  });

  return {
    schoolName:
      cleanText(schoolProfile?.schoolName) ||
      cleanText(caseEntry.schoolAccount.name),
    educationDepartment: cleanText(schoolProfile?.educationDepartment),
    educationOffice: cleanText(schoolProfile?.educationOffice),
    hijriYear:
      cleanText(schoolProfile?.academicYear) ||
      getHijriYear(caseEntry.submittedAt || caseEntry.createdAt),
    guardianName,
    guardianPhone,
    studentGrade:
      findResolvedValue(values, fieldMap, [
        "student_grade",
        "studentGrade",
        "grade",
      ]) ||
      cleanText(student?.grade) ||
      getObjectText(selectedStudent, ["grade", "studentGrade"]),
    studentClassroom:
      findResolvedValue(values, fieldMap, [
        "student_classroom",
        "studentClassroom",
        "classroom",
        "class_name",
        "className",
        "section",
      ]) ||
      cleanText(student?.classroom) ||
      getObjectText(selectedStudent, ["classroom", "section"]),
    appointmentDay: findResolvedValue(values, fieldMap, [
      "attendance_day",
      "attendanceDay",
      "summons_day",
      "summonsDay",
    ]),
    appointmentDate: formatArabicDate(appointmentDate),
    appointmentTime: formatTime(
      findResolvedValue(values, fieldMap, [
        "attendance_time",
        "attendanceTime",
        "summons_time",
        "summonsTime",
      ]),
    ),
    period: findResolvedValue(values, fieldMap, ["period"]),
    reasons: buildReasonItems(values, fieldMap),
    notes,
    ...signatoryData,
  };
}

export async function getGuardianSummonsReportData(
  caseId: string,
  context: {
    isAdmin: boolean;
    schoolAccountId: string | null;
    user: { id: string; role: string };
  },
) {
  const caseEntry = await loadGuardianSummonsCase(caseId, context);
  const currentUser = await prisma.user.findUnique({
    where: { id: context.user.id },
    select: { name: true, officialName: true, jobTitle: true, gender: true },
  });
  return {
    caseEntry,
    data: buildGuardianSummonsTemplateData({ caseEntry, currentUser }),
  };
}
