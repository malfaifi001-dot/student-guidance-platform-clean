import type {
  CustomReportField,
  CustomReportFieldType,
  CustomReportOption,
  CustomReportSchema,
  CustomReportSection,
} from "./custom-report-types";

const allowedFieldTypes: CustomReportFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "radio",
];

const absenceReasonOptions: CustomReportOption[] = [
  { label: "مرض أو ظرف صحي", value: "health_condition" },
  { label: "ظروف أسرية", value: "family_circumstances" },
  { label: "صعوبة في الاستيقاظ أو تنظيم النوم", value: "sleep_schedule" },
  { label: "ضعف الدافعية تجاه المدرسة", value: "low_motivation" },
  { label: "مشكلات في المواصلات", value: "transportation" },
  { label: "قلق أو ضغوط نفسية", value: "psychological_pressure" },
  { label: "تأخر دراسي أو صعوبة في مادة", value: "academic_difficulty" },
  { label: "سفر أو مرافقة الأسرة", value: "travel_family" },
  { label: "أخرى", value: "other" },
];

const actionOptions: CustomReportOption[] = [
  { label: "مقابلة الطالب", value: "student_meeting" },
  { label: "تواصل مع ولي الأمر", value: "guardian_contact" },
  { label: "توعية الطالب بأثر الغياب", value: "student_awareness" },
  { label: "إعداد خطة متابعة أسبوعية", value: "weekly_follow_up" },
  { label: "إحالة للموجه الطلابي", value: "counselor_referral" },
  { label: "إشعار إدارة المدرسة", value: "school_admin_notice" },
  { label: "متابعة الحضور يوميًا", value: "daily_attendance_tracking" },
  { label: "أخرى", value: "other" },
];

const guardianContactOptions: CustomReportOption[] = [
  { label: "اتصال هاتفي", value: "phone_call" },
  { label: "رسالة نصية", value: "sms" },
  { label: "واتساب", value: "whatsapp" },
  { label: "حضور ولي الأمر للمدرسة", value: "guardian_visit" },
  { label: "تعذر التواصل", value: "unable_to_contact" },
  { label: "أخرى", value: "other" },
];

const recommendationOptions: CustomReportOption[] = [
  { label: "استمرار المتابعة الأسبوعية", value: "weekly_follow_up" },
  { label: "تعزيز انتظام الطالب بالحضور", value: "attendance_reinforcement" },
  { label: "إشراك ولي الأمر في الخطة", value: "guardian_involvement" },
  { label: "معالجة السبب الرئيسي للغياب", value: "treat_main_reason" },
  { label: "إحالة للموجه الطلابي عند الحاجة", value: "counselor_referral_if_needed" },
  { label: "رفع الحالة لإدارة المدرسة عند التكرار", value: "school_admin_escalation" },
  { label: "أخرى", value: "other" },
];

const followUpPlanOptions: CustomReportOption[] = [
  { label: "متابعة الحضور لمدة أسبوع", value: "one_week_tracking" },
  { label: "متابعة الحضور لمدة أسبوعين", value: "two_weeks_tracking" },
  { label: "تقرير مختصر نهاية كل أسبوع", value: "weekly_summary" },
  { label: "تواصل دوري مع ولي الأمر", value: "periodic_guardian_contact" },
  { label: "مقابلة متابعة مع الطالب", value: "follow_up_meeting" },
  { label: "تعزيز الطالب عند التحسن", value: "positive_reinforcement" },
  { label: "أخرى", value: "other" },
];

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeKey(value: unknown, fallback: string) {
  const raw = asText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return raw || fallback;
}

function normalizeType(value: unknown): CustomReportFieldType {
  const raw = asText(value, "text").toLowerCase();

  if (raw === "textarea" || raw === "long_text") return "textarea";
  if (raw === "number") return "number";
  if (raw === "date") return "date";
  if (raw === "select") return "select";
  if (raw === "multi_select" || raw === "multiselect") return "multi_select";
  if (raw === "checkbox") return "checkbox";
  if (raw === "radio") return "radio";

  return allowedFieldTypes.includes(raw as CustomReportFieldType)
    ? (raw as CustomReportFieldType)
    : "text";
}

function normalizeOptions(value: unknown): CustomReportOption[] {
  if (!Array.isArray(value)) return [];

  const options = value
    .slice(0, 10)
    .map((option, index) => {
      if (typeof option === "string") {
        const label = option.trim() || `خيار ${index + 1}`;

        return {
          label,
          value: label === "أخرى" ? "other" : normalizeKey(label, `option_${index + 1}`),
        };
      }

      if (option && typeof option === "object") {
        const record = option as Record<string, unknown>;
        const label = asText(record.label, `خيار ${index + 1}`);

        return {
          label,
          value: label === "أخرى" ? "other" : normalizeKey(record.value ?? label, `option_${index + 1}`),
        };
      }

      return null;
    })
    .filter(Boolean) as CustomReportOption[];

  return ensureOtherOption(options);
}

function ensureOtherOption(options: CustomReportOption[]) {
  const cleaned = options.filter((option) => option.label && option.value).slice(0, 9);
  const hasOther = cleaned.some((option) => option.value === "other" || option.label.includes("أخرى"));

  if (hasOther) {
    return cleaned.map((option) =>
      option.label.includes("أخرى") ? { label: "أخرى", value: "other" } : option,
    );
  }

  return [...cleaned, { label: "أخرى", value: "other" }];
}

function getEducationalPreset(label: string, key: string) {
  const text = `${label} ${key}`;

  if (text.includes("أسباب") && text.includes("غياب")) {
    return {
      type: "multi_select" as CustomReportFieldType,
      options: absenceReasonOptions,
    };
  }

  if (text.includes("سبب") && text.includes("غياب")) {
    return {
      type: "multi_select" as CustomReportFieldType,
      options: absenceReasonOptions,
    };
  }

  if (text.includes("الإجراءات") || text.includes("إجراء")) {
    return {
      type: "multi_select" as CustomReportFieldType,
      options: actionOptions,
    };
  }

  if (text.includes("تواصل") && text.includes("ولي")) {
    return {
      type: "select" as CustomReportFieldType,
      options: guardianContactOptions,
    };
  }

  if (text.includes("التوصيات") || text.includes("توصيات")) {
    return {
      type: "multi_select" as CustomReportFieldType,
      options: recommendationOptions,
    };
  }

  if (text.includes("خطة") && text.includes("متابعة")) {
    return {
      type: "multi_select" as CustomReportFieldType,
      options: followUpPlanOptions,
    };
  }

  return null;
}

function normalizeField(field: unknown, sectionIndex: number, fieldIndex: number): CustomReportField {
  const record = field && typeof field === "object" ? (field as Record<string, unknown>) : {};
  const fallbackKey = `field_${sectionIndex + 1}_${fieldIndex + 1}`;
  const label = asText(record.label, `حقل ${fieldIndex + 1}`);
  const key = normalizeKey(record.key ?? label, fallbackKey);
  const preset = getEducationalPreset(label, key);
  const type = preset?.type ?? normalizeType(record.type);
  const rawOptions = normalizeOptions(record.options);
  const options = preset?.options ?? (["select", "multi_select", "radio"].includes(type) ? rawOptions : []);

  return {
    key,
    label,
    type,
    required: Boolean(record.required),
    placeholder: asText(record.placeholder, ""),
    helpText: asText(record.helpText, ""),
    reportLabel: asText(record.reportLabel, label),
    showInReport: record.showInReport === false ? false : true,
    order: fieldIndex + 1,
    options: ["select", "multi_select", "radio"].includes(type) ? ensureOtherOption(options) : [],
  };
}

function normalizeSection(section: unknown, sectionIndex: number): CustomReportSection {
  const record = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
  const rawFields = Array.isArray(record.fields) ? record.fields : [];

  return {
    id: normalizeKey(record.id ?? record.title, `section_${sectionIndex + 1}`),
    title: asText(record.title, `قسم ${sectionIndex + 1}`),
    description: asText(record.description, ""),
    order: sectionIndex + 1,
    fields: rawFields.slice(0, 8).map((field, fieldIndex) => normalizeField(field, sectionIndex, fieldIndex)),
  };
}

export function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("تعذر قراءة JSON من استجابة الذكاء.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export function normalizeCustomReportSchema(input: unknown): CustomReportSchema {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawSections = Array.isArray(record.sections) ? record.sections : [];

  let totalFields = 0;

  const sections = rawSections
    .slice(0, 3)
    .map((section, sectionIndex) => normalizeSection(section, sectionIndex))
    .map((section) => {
      const available = Math.max(0, 12 - totalFields);
      const fields = section.fields.slice(0, available);
      totalFields += fields.length;

      return {
        ...section,
        fields,
      };
    })
    .filter((section) => section.fields.length > 0);

  return {
    title: asText(record.title, "تقرير خاص"),
    description: asText(record.description, ""),
    version: 1,
    sections:
      sections.length > 0
        ? sections
        : [
            {
              id: "section_1",
              title: "بيانات التقرير",
              description: "",
              order: 1,
              fields: [
                {
                  key: "report_summary",
                  label: "ملخص التقرير",
                  type: "textarea",
                  required: true,
                  showInReport: true,
                  reportLabel: "ملخص التقرير",
                  order: 1,
                  options: [],
                },
              ],
            },
          ],
  };
}