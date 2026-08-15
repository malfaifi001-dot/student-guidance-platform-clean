"use client";

import { useMemo, useState } from "react";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

export type SelectedReportField = {
  id: string;
  source: "primary" | "detail";
  key: string;
  label: string;
  value: SmartReportField["value"];
};

type ReportFieldSelectionGateProps = {
  payload: SmartReportPayload;
  onContinue: (fields: SelectedReportField[]) => void;
};

type FieldOptionLike = {
  label?: unknown;
  name?: unknown;
  text?: unknown;
  title?: unknown;
  value?: unknown;
  key?: unknown;
  id?: unknown;
};

type FieldWithDisplayMetadata = SmartReportField & {
  valueLabel?: unknown;
  displayValue?: unknown;
  selectedLabel?: unknown;
  arabicValue?: unknown;
  options?: FieldOptionLike[];
  fieldOptions?: FieldOptionLike[];
  choices?: FieldOptionLike[];
};

const TECHNICAL_FIELD_PATTERNS = [
  /(^|_)id$/i,
  /studentsearch/i,
  /email/i,
  /phone/i,
  /token/i,
  /url/i,
  /icon/i,
  /resource/i,
  /bank/i,
  /raw/i,
  /json/i,
];

const FIELD_LABEL_TRANSLATIONS: Record<string, string> = {
  execution_date: "تاريخ التنفيذ / اليوم",
  semester: "الفصل الدراسي",
  week: "الأسبوع",
  executor: "المعلم المنفذ",
  target_group: "الفئة المستهدفة",
  execution_method: "طريقة التنفيذ",
  execution_mode: "طريقة التنفيذ",
  problem_type: "نوع المشكلة",
  academic_classification: "التصنيف الأكاديمي",
  action_taken: "الإجراء المتخذ",
  result: "النتيجة",
  discussion_summary: "ملخص المناقشة",
  contact_method: "طريقة التواصل",
  contact_reason: "سبب التواصل",
  contact_result: "نتيجة التواصل",
  activity_domain: "مجال النشاط",
  beneficiary_count: "عدد المستفيدين",
  beneficiaries_count: "عدد المستفيدين",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  parents_participated: "مشاركة أولياء الأمور",
  community_partnership_count: "عدد الشراكات المجتمعية",
  studentSnapshot: "اسم الطالب",
  selectedStudent: "اسم الطالب",
  student: "اسم الطالب",
  student_name: "اسم الطالب",
  guardianSnapshot: "اسم ولي الأمر",
};

const VALUE_TRANSLATIONS: Record<string, string> = {
  academic: "أكاديمي",
  behavioral: "سلوكي",
  social: "اجتماعي",
  psychological: "نفسي",
  educational: "تعليمي",
  improved: "تحسن",
  not_improved: "لم يتحسن",
  low_achievement: "تدني التحصيل",
  attendance: "حضور وغياب",
  action_required: "يتطلب إجراء",
  exists: "يوجد",
  none: "لا يوجد",
  yes: "نعم",
  no: "لا",
  true: "نعم",
  false: "لا",
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  first_semester: "الفصل الدراسي الأول",
  second_semester: "الفصل الدراسي الثاني",
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  phone: "اتصال هاتفي",
  call: "اتصال هاتفي",
  message: "رسالة",
  meeting: "اجتماع",
  elementary: "المرحلة الابتدائية",
  intermediate: "المرحلة المتوسطة",
  secondary: "المرحلة الثانوية",
  primary: "الأول الابتدائي",
  middle: "المتوسط",
  high: "الثانوي",
  all: "الكل",
  student: "طالب",
  students: "طلاب",
  counselor: "الموجه الطلابي",
  activity_leader: "رائد النشاط",
};

function hasArabicText(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function isEnglishTechnicalText(value: string) {
  return /^[a-z0-9_\-.@:/]+$/i.test(value.trim());
}

function isTechnicalKey(key: string) {
  const normalizedKey = String(key || "").replace(/\s+/g, "").toLowerCase();

  if (
    normalizedKey === "studentsnapshot" ||
    normalizedKey === "selectedstudent" ||
    normalizedKey === "student" ||
    normalizedKey === "student_name" ||
    normalizedKey === "guardiansnapshot"
  ) {
    return false;
  }

  return TECHNICAL_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
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

function normalizePrimitive(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getOptionLabel(options: FieldOptionLike[] | undefined, value: unknown) {
  if (!options || options.length === 0) return "";

  const normalizedValue = normalizePrimitive(value);

  const matchedOption = options.find((option) => {
    const possibleValues = [option.value, option.key, option.id, option.label];

    return possibleValues.some(
      (item) => normalizePrimitive(item) === normalizedValue,
    );
  });

  if (!matchedOption) return "";

  const label =
    matchedOption.label ||
    matchedOption.name ||
    matchedOption.text ||
    matchedOption.title;

  const labelText = typeof label === "string" ? label.trim() : "";

  return hasArabicText(labelText) ? labelText : "";
}

function extractArabicNameFromSnapshot(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") {
    const text = value.trim();

    if (looksLikeJson(text)) {
      try {
        return extractArabicNameFromSnapshot(JSON.parse(text));
      } catch {
        return "";
      }
    }

    return hasArabicText(text) ? text : "";
  }

  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;

  const directName =
    record.fullName ||
    record.studentName ||
    record.guardianName ||
    record.guardianFullName ||
    record.parentName ||
    record.fatherName ||
    record.name ||
    record.arabicName ||
    record.nameAr;

  if (typeof directName === "string" && directName.trim()) {
    return hasArabicText(directName) ? directName.trim() : "";
  }

  return "";
}

function extractObjectArabicValue(value: Record<string, unknown>) {
  const preferredValues = [
    value.arabicName,
    value.arabicLabel,
    value.labelAr,
    value.nameAr,
    value.fullName,
    value.name,
    value.studentName,
    value.grade,
    value.stage,
    value.className,
  ]
    .map((item) => extractDisplayValue(item))
    .filter(Boolean);

  return Array.from(new Set(preferredValues)).join("، ");
}

function extractDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (Array.isArray(value)) {
    return value.map(extractDisplayValue).filter(Boolean).join("، ");
  }

  if (typeof value === "object") {
    return extractObjectArabicValue(value as Record<string, unknown>);
  }

  const text = String(value).trim();
  const normalized = text.toLowerCase();

  if (VALUE_TRANSLATIONS[normalized]) return VALUE_TRANSLATIONS[normalized];

  if (looksLikeJson(text)) {
    try {
      return extractDisplayValue(JSON.parse(text));
    } catch {
      return "";
    }
  }

  if (isEnglishTechnicalText(text)) return "";

  return hasArabicText(text) ? text : "";
}

function getFieldLabel(field: SmartReportField) {
  const key = field.key || "";
  const normalizedKey = String(key).toLowerCase();

  if (
    normalizedKey === "studentsnapshot" ||
    normalizedKey === "selectedstudent" ||
    normalizedKey === "student" ||
    normalizedKey === "student_name"
  ) {
    return "اسم الطالب";
  }

  if (normalizedKey === "guardiansnapshot") {
    return "اسم ولي الأمر";
  }

  const directTranslation = FIELD_LABEL_TRANSLATIONS[key];

  if (directTranslation) return directTranslation;

  const label = field.label || "";

  if (label && label !== key && hasArabicText(label)) return label;

  return "";
}

function getFieldArabicValue(field: SmartReportField) {
  const fieldWithMeta = field as FieldWithDisplayMetadata;
  const normalizedKey = String(field.key || "").toLowerCase();

  if (
    normalizedKey === "studentsnapshot" ||
    normalizedKey === "selectedstudent" ||
    normalizedKey === "student" ||
    normalizedKey === "student_name" ||
    normalizedKey === "guardiansnapshot"
  ) {
    return extractArabicNameFromSnapshot(field.value);
  }

  const directDisplay =
    fieldWithMeta.valueLabel ||
    fieldWithMeta.displayValue ||
    fieldWithMeta.selectedLabel ||
    fieldWithMeta.arabicValue;

  const directDisplayText = extractDisplayValue(directDisplay);

  if (directDisplayText) return directDisplayText;

  const options =
    fieldWithMeta.options ||
    fieldWithMeta.fieldOptions ||
    fieldWithMeta.choices ||
    [];

  if (Array.isArray(field.value)) {
    const values = field.value
      .map((item) => getOptionLabel(options, item) || extractDisplayValue(item))
      .filter(Boolean);

    return Array.from(new Set(values)).join("، ");
  }

  const optionLabel = getOptionLabel(options, field.value);

  if (optionLabel) return optionLabel;

  return extractDisplayValue(field.value);
}

function createInitialFields(payload: SmartReportPayload): SelectedReportField[] {
  const primary = payload.primaryFields.map((field, index) => ({
    id: `primary:${field.key}:${index}`,
    source: "primary" as const,
    key: field.key,
    label: getFieldLabel(field),
    value: getFieldArabicValue(field),
  }));

  const detail = payload.detailFields.map((field, index) => ({
    id: `detail:${field.key}:${index}`,
    source: "detail" as const,
    key: field.key,
    label: getFieldLabel(field),
    value: getFieldArabicValue(field),
  }));

  const uniqueFields = new Map<string, SelectedReportField>();

  for (const field of [...primary, ...detail]) {
    const label = String(field.label || "").trim();
    const value = String(field.value || "").trim();

    if (!label || !value) continue;
    if (isTechnicalKey(field.key)) continue;

    const uniqueKey = `${label}::${value}`;

    if (!uniqueFields.has(uniqueKey)) {
      uniqueFields.set(uniqueKey, field);
    }
  }

  return Array.from(uniqueFields.values());
}

export function ReportFieldSelectionGate({
  payload,
  onContinue,
}: ReportFieldSelectionGateProps) {
  const initialFields = useMemo(() => createInitialFields(payload), [payload]);

  const [fields, setFields] = useState<SelectedReportField[]>(initialFields);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialFields.map((field) => field.id)),
  );

  const selectedCount = selectedIds.size;

  function toggleField(fieldId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }

      return next;
    });
  }

  function updateField(
    fieldId: string,
    patch: Partial<Pick<SelectedReportField, "label" | "value">>,
  ) {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    );
  }

  function continueToReport() {
    const selectedFields = fields
      .filter((field) => selectedIds.has(field.id))
      .filter((field) => String(field.value || "").trim().length > 0)
      .filter((field) => String(field.label || "").trim().length > 0);

    onContinue(selectedFields);
  }

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-8" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <section data-guidance="report-prepare-fields" className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">
                اختيار بيانات التقرير
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">
                اختر الحقول التي تريد ظهورها داخل التقرير
              </h1>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                لا يتم عرض أي قيمة تقنية أو إنجليزية من Workflow؛ تظهر فقط
                العناوين والقيم العربية.
              </p>
            </div>

            <button
              type="button"
              onClick={continueToReport}
              data-guidance="report-prepare-continue"
              disabled={selectedCount === 0}
              className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              متابعة إلى محرر التقرير
            </button>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
            <div className="mb-4 text-sm font-black text-slate-900">
              الحقول المختارة: {selectedCount}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => {
                const selected = selectedIds.has(field.id);

                return (
                  <article
                    key={field.id}
                    className={[
                      "rounded-2xl border p-4 transition",
                      selected
                        ? "border-emerald-200 bg-white shadow-sm"
                        : "border-slate-100 bg-white/60 opacity-70",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleField(field.id)}
                          className="h-4 w-4 accent-emerald-700"
                        />
                        <span className="text-xs font-black text-slate-700">
                          عرض في التقرير
                        </span>
                      </label>
                    </div>

                    <label className="mb-1 block text-[10px] font-black text-slate-500">
                      العنوان الظاهر
                    </label>
                    <input
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                      className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
                    />

                    <label className="mb-1 block text-[10px] font-black text-slate-500">
                      القيمة
                    </label>
                    <textarea
                      value={String(field.value || "")}
                      onChange={(event) =>
                        updateField(field.id, { value: event.target.value })
                      }
                      rows={3}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black leading-6 text-slate-950 outline-none transition focus:border-emerald-300 focus:bg-white"
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
