"use client";

import { useEffect, useMemo, useState } from "react";
import { SmartStudentPicker } from "@/components/students/smart-student-picker";
import {
  AppreciationCertificatePreview,
  appreciationCertificatePreviewCaseData,
} from "@/components/report-engine/appreciation-certificate-preview";
import { AppreciationCertificatePdfButton } from "@/components/document-export/appreciation-certificate-pdf-button";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type Student = {
  id: string;
  fullName: string;
  nationalId: string | null;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  guardian: {
    name: string;
    phone: string | null;
  } | null;
};

type CertificateStatus = "DRAFT" | "ISSUED" | "PRINTED";

type CertificateRecord = {
  id: string;
  status: CertificateStatus;
  createdAt: string;
  printedAt?: string;
  student: Student | null;
  values: Record<string, string>;
};

const STORAGE_KEY =
  "student-guidance.student-follow-up.appreciation-certificates.v1";

const initialValues: Record<string, string> = {
  certificateTitle: "شهادة شكر وتقدير",
  appreciationReason: "تميزه في المتابعة الطلبة والمواقف اليومية الطارئةية وتحسن مستوى الانضباط والتحصيل",
  achievementCategory: "الانضباط والتحصيل الدراسي",
  achievementTitle: "تحسن ملحوظ في مستوى الطالب",
  achievementSummary: "نظير التزامه، وتفاعله الإيجابي، وحرصه على تطوير مستواه.",
  termName: "الفصل الدراسي الأول",
  weekName: "الأسبوع الخامس",
  issueDate: new Date().toISOString().slice(0, 10),
  certificateNumber: "",
  score: "95%",
  rank: "ضمن الطلاب المتميزين",
  attendanceRate: "98%",
  behaviorScore: "متميز",
  followUpResult: "تحسن واضح",
  recommendation: "الاستمرار على هذا المستوى والمحافظة على التميز.",
  recipientName: "",
};

const categoryOptions = [
  "الانضباط والتحصيل الدراسي",
  "تحسن السلوك",
  "الانتظام المدرسي",
  "المبادرة الإيجابية",
  "التفوق الدراسي",
  "المشاركة الفاعلة",
  "التعاون والقيادة",
];

export function AppreciationCertificatesClient() {
  const [student, setStudent] = useState<Student | null>(null);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [identity, setIdentity] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRecords(readRecords());

    fetch("/api/dashboard/student-follow-up/appreciation-certificates/identity")
      .then((response) => response.json())
      .then((data) => setIdentity(data.identity || {}))
      .catch(() => setIdentity({}));
  }, []);

  const previewCaseData = useMemo(() => {
    return buildPreviewCaseData({
      student,
      values: {
        ...identity,
        ...values,
      },
    });
  }, [student, values, identity]);

  const payload = useMemo(() => {
    return buildPdfPayload(student, values);
  }, [student, values]);

  const stats = useMemo(() => buildStats(records), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const haystack = [
        record.student?.fullName,
        record.values.recipientName,
        record.values.achievementCategory,
        record.values.appreciationReason,
        record.status,
      ]
        .filter(Boolean)
        .join(" ");

      const statusOk = statusFilter === "ALL" || record.status === statusFilter;
      const searchOk =
        !search.trim() || haystack.includes(search.trim());

      return statusOk && searchOk;
    });
  }, [records, statusFilter, search]);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function saveRecord(status: CertificateStatus) {
    const record: CertificateRecord = {
      id: crypto.randomUUID(),
      status,
      createdAt: new Date().toISOString(),
      student,
      values,
    };

    const next = [record, ...records];

    setRecords(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    return record;
  }

  function markPrinted(recordId: string) {
    const next = records.map((record) =>
      record.id === recordId
        ? {
            ...record,
            status: "PRINTED" as CertificateStatus,
            printedAt: new Date().toISOString(),
          }
        : record
    );

    setRecords(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function deleteRecord(recordId: string) {
    if (!confirm("حذف الشهادة من السجل المحلي؟")) return;

    const next = records.filter((record) => record.id !== recordId);

    setRecords(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-emerald-700">
              متابعة الطلبة والمواقف اليومية الطارئة
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              شهادات الشكر والتقدير
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              أنشئ شهادة شكر من بيانات الطالب، وهوية المدرسة، ومؤشرات المتابعة
              والإحصاء. النص ثابت، والمتغيرات قابلة للتحديث.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveRecord("DRAFT")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              حفظ مسودة
            </button>

            <button
              type="button"
              onClick={() => saveRecord("ISSUED")}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
            >
              إصدار الشهادة
            </button>

            <AppreciationCertificatePdfButton
              payload={payload}
              fileName={buildPdfFileName(student, values)}
              onAfterDownload={() => saveRecord("PRINTED")}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="إجمالي الشهادات" value={stats.total} />
        <StatCard label="تم تحميلها" value={stats.printed} />
        <StatCard label="قيد الإصدار" value={stats.issued} />
        <StatCard label="أكثر مجال" value={stats.topCategory} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              بيانات الشهادة
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              اختر الطالب، ثم عدّل متغيرات التكريم والمؤشرات.
            </p>
          </div>

          <SmartStudentPicker
            onChange={(picked) => {
              const nextStudent = picked as Student | null;
              setStudent(nextStudent);

              if (nextStudent) {
                setValues((current) => ({
                  ...current,
                  recipientName: nextStudent.fullName,
                }));
              }
            }}
          />

          <Field
            label="اسم الطالب/الطالبة يدويًا"
            value={values.recipientName}
            onChange={(value) => updateValue("recipientName", value)}
          />

          <Field
            label="عنوان الشهادة"
            value={values.certificateTitle}
            onChange={(value) => updateValue("certificateTitle", value)}
          />

          <SelectField
            label="مجال التميز"
            value={values.achievementCategory}
            options={categoryOptions}
            onChange={(value) => updateValue("achievementCategory", value)}
          />

          <Field
            label="سبب التكريم"
            value={values.appreciationReason}
            onChange={(value) => updateValue("appreciationReason", value)}
          />

          <Field
            label="عنوان الإنجاز"
            value={values.achievementTitle}
            onChange={(value) => updateValue("achievementTitle", value)}
          />

          <TextAreaField
            label="ملخص الإنجاز"
            value={values.achievementSummary}
            onChange={(value) => updateValue("achievementSummary", value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="الفصل الدراسي"
              value={values.termName}
              onChange={(value) => updateValue("termName", value)}
            />

            <Field
              label="الأسبوع"
              value={values.weekName}
              onChange={(value) => updateValue("weekName", value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="تاريخ الإصدار"
              type="date"
              value={values.issueDate}
              onChange={(value) => updateValue("issueDate", value)}
            />

            <Field
              label="رقم الشهادة"
              value={values.certificateNumber}
              onChange={(value) => updateValue("certificateNumber", value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="المؤشر / الدرجة"
              value={values.score}
              onChange={(value) => updateValue("score", value)}
            />

            <Field
              label="الترتيب"
              value={values.rank}
              onChange={(value) => updateValue("rank", value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="نسبة الحضور"
              value={values.attendanceRate}
              onChange={(value) => updateValue("attendanceRate", value)}
            />

            <Field
              label="مؤشر السلوك"
              value={values.behaviorScore}
              onChange={(value) => updateValue("behaviorScore", value)}
            />
          </div>

          <Field
            label="نتيجة المتابعة"
            value={values.followUpResult}
            onChange={(value) => updateValue("followUpResult", value)}
          />

          <TextAreaField
            label="توصية الموجه"
            value={values.recommendation}
            onChange={(value) => updateValue("recommendation", value)}
          />
        </section>

        <section className="space-y-5">
          <AppreciationCertificatePreview
            previewCaseData={previewCaseData}
            showDynamicFields
          />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  سجل شهادات الشكر
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  سجل محلي مؤقت إلى أن نربطه بجدول قاعدة البيانات.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="بحث..."
                  className="h-10 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
                >
                  <option value="ALL">كل الحالات</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="ISSUED">صادرة</option>
                  <option value="PRINTED">PDF</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {record.student?.fullName ||
                            record.values.recipientName ||
                            "طالب/طالبة"}
                        </div>

                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {record.values.achievementCategory} —{" "}
                          {record.values.issueDate}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                          {statusLabel(record.status)}
                        </span>

                        <AppreciationCertificatePdfButton
                          payload={buildPdfPayload(record.student, record.values)}
                          fileName={buildPdfFileName(record.student, record.values)}
                          onAfterDownload={() => markPrinted(record.id)}
                        >
                          PDF
                        </AppreciationCertificatePdfButton>

                        <button
                          type="button"
                          onClick={() => deleteRecord(record.id)}
                          className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                  لا توجد شهادات حتى الآن.
                </div>
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-400"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 outline-none focus:border-emerald-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildPreviewCaseData({
  student,
  values,
}: {
  student: Student | null;
  values: Record<string, string>;
}): RuntimePreviewCaseData {
  const studentName =
    values.recipientName || student?.fullName || "اسم الطالب/الطالبة";

  const studentClass =
    [student?.grade, student?.classroom].filter(Boolean).join(" / ") ||
    "الصف / الفصل";

  const allValues = {
    ...values,
    studentName,
    recipientName: studentName,
    studentGender: student?.gender || "UNKNOWN",
    studentClass,
    stage: student?.stage || "",
  };

  return {
    ...appreciationCertificatePreviewCaseData,
    student: {
      id: student?.id || "preview-student",
      name: studentName,
      nationalId: student?.nationalId || "",
      grade: student?.grade || "",
      classroom: student?.classroom || "",
      stage: student?.stage || "",
      guardianName: student?.guardian?.name || "",
      guardianPhone: student?.guardian?.phone || "",
    },
    values: Object.entries(allValues).map(([fieldKey, value]) => ({
      fieldKey,
      fieldLabel: fieldKey,
      value,
    })),
  };
}

function buildPdfPayload(student: Student | null, values: Record<string, string>) {
  return {
    student: student
      ? {
          id: student.id,
          fullName: student.fullName,
          nationalId: student.nationalId,
          gender: student.gender,
          grade: student.grade,
          classroom: student.classroom,
          stage: student.stage,
        }
      : {
          id: "",
          fullName: values.recipientName || "",
          nationalId: "",
          gender: "UNKNOWN",
          grade: "",
          classroom: "",
          stage: "",
        },
    ...values,
  };
}

function buildPdfFileName(student: Student | null, values: Record<string, string>) {
  const name = student?.fullName || values.recipientName || "طالب";
  const date = values.issueDate || new Date().toISOString().slice(0, 10);

  return `شهادة-شكر-${name}-${date}.pdf`;
}

function readRecords(): CertificateRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusLabel(status: CertificateStatus) {
  if (status === "PRINTED") return "تم تحميل PDF";
  if (status === "ISSUED") return "صادرة";
  return "مسودة";
}

function buildStats(records: CertificateRecord[]) {
  const total = records.length;
  const printed = records.filter((record) => record.status === "PRINTED").length;
  const issued = records.filter((record) => record.status === "ISSUED").length;

  const categoryCount = records.reduce<Record<string, number>>((acc, record) => {
    const category = record.values.achievementCategory || "غير محدد";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const topCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return {
    total,
    printed,
    issued,
    topCategory,
  };
}
