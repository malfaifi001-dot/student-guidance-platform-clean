"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CheckSquare,
  Download,
  FileSpreadsheet,
  Search,
  Upload,
  Users,
} from "lucide-react";
import {
  CERTIFICATE_TYPES,
  getCertificateTypeLabel,
} from "@/lib/certificates/certificate-types";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";
import { CertificateTemplateSelector } from "@/components/certificates/certificate-template-preview";
import { DEFAULT_CERTIFICATE_TEMPLATE_KEY } from "@/lib/certificates/certificate-renderer";

type PreviewRow = {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  recipientName: string;
  recipientType: string;
  grade: string;
  classroom: string;
  nationalId: string;
  certificateType: string;
  reason: string;
  issueDate: string;
  principalName: string;
  issuerName: string;
};

type StudentOption = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  gender?: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mapStudentGenderToRecipientType(gender?: string | null) {
  const normalized = String(gender || "").trim();

  if (normalized.includes("أنث") || normalized.includes("بنت") || normalized.includes("طالبة")) {
    return "student_female";
  }

  return "student";
}

export function BulkCertificatesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"students" | "excel">("students");

  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [query, setQuery] = useState("");
  const [grades, setGrades] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [certificateType, setCertificateType] = useState("thanks");
  const [recipientType, setRecipientType] = useState<"student" | "student_female">("student");
  const [templateKey, setTemplateKey] = useState<string>(DEFAULT_CERTIFICATE_TEMPLATE_KEY);
  const [reason, setReason] = useState("");
  const [issueDate, setIssueDate] = useState(today());

  const [excelRows, setExcelRows] = useState<PreviewRow[]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");

  const selectedStudents = useMemo(() => {
    const ids = new Set(selectedStudentIds);

    return students.filter((student) => ids.has(student.id));
  }, [students, selectedStudentIds]);

  const studentPreviewRows = useMemo<PreviewRow[]>(() => {
    return selectedStudents.map((student, index) => ({
      rowNumber: index + 1,
      isValid: Boolean(student.fullName && reason.trim()),
      errors: reason.trim() ? [] : ["سبب التكريم مطلوب."],
      recipientName: student.fullName,
      recipientType,
      grade: student.grade || "",
      classroom: student.classroom || "",
      nationalId: student.nationalId || "",
      certificateType,
      reason,
      issueDate,
      principalName: "",
      issuerName: "",
    }));
  }, [selectedStudents, certificateType, reason, issueDate, recipientType]);

  const activeRows = tab === "students" ? studentPreviewRows : excelRows;
  const validCount = activeRows.filter((item) => item.isValid).length;
  const invalidCount = activeRows.filter((item) => !item.isValid).length;

  useEffect(() => {
    let ignore = false;

    async function loadStudents() {
      setStudentsLoading(true);
      setError("");

      try {
        const search = new URLSearchParams();

        if (grade) search.set("grade", grade);
        if (classroom) search.set("classroom", classroom);
        if (query.trim()) search.set("query", query.trim());

        const response = await fetch(`/api/dashboard/certificates/students/options?${search.toString()}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل الطلاب.");
        }

        if (!ignore) {
          setGrades(Array.isArray(data.grades) ? data.grades : []);
          setClassrooms(Array.isArray(data.classrooms) ? data.classrooms : []);
          setStudents(Array.isArray(data.students) ? data.students : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "تعذر تحميل الطلاب.");
        }
      } finally {
        if (!ignore) {
          setStudentsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadStudents, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [grade, classroom, query]);

  function toggleStudent(id: string) {
    setSelectedStudentIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  function selectAllVisibleStudents() {
    setSelectedStudentIds((current) => {
      const ids = new Set(current);
      students.forEach((student) => ids.add(student.id));
      return Array.from(ids);
    });
  }

  function clearSelectedStudents() {
    setSelectedStudentIds([]);
  }

  async function issueBatch() {
    if (issuing) return;

    setError("");

    if (!activeRows.length) {
      setError("أضف أسماء للمعاينة قبل إصدار الدفعة.");
      return;
    }

    if (invalidCount > 0) {
      setError("راجع الصفوف غير الصحيحة قبل إصدار الدفعة.");
      return;
    }

    const items = activeRows.filter((item) => item.isValid).map((item) => ({
      ...item,
      recipientType,
    }));

    if (!items.length) {
      setError("لا توجد شهادات صالحة للإصدار.");
      return;
    }

    setIssuing(true);

    try {
      const response = await fetch("/api/dashboard/certificates/bulk/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: tab,
          recipientType,
          templateKey,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "تعذر إصدار الدفعة.");
      }

      router.push("/dashboard/certificates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إصدار الدفعة.");
    } finally {
      setIssuing(false);
    }
  }

  async function previewExcel(file: File | null) {
    if (!file) return;

    setExcelLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/dashboard/certificates/bulk/preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحليل ملف Excel.");
      }

      setExcelRows(Array.isArray(data.items) ? data.items : []);
      setTab("excel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحليل ملف Excel.");
    } finally {
      setExcelLoading(false);
    }
  }

  return (
    <main className="min-w-0 space-y-5 pb-6 sm:space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-lg sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-sky-100">الشهادات</p>
            <h1 className="mt-3 text-2xl font-black sm:text-4xl">إصدار جماعي للشهادات</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-sky-50">
              اختر الطلاب ثم أصدر الشهادات.
            </p>
          </div>

          <Link
            href="/dashboard/certificates"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للأرشيف
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric icon={<Users className="h-5 w-5" />} label="المحددين" value={String(activeRows.length)} />
        <Metric icon={<CheckSquare className="h-5 w-5" />} label="جاهزة" value={String(validCount)} />
        <Metric icon={<Award className="h-5 w-5" />} label="تحتاج مراجعة" value={String(invalidCount)} />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">طريقة الإدخال</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">اختر مصدر الأسماء</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              اختر طريقة الإدخال.
            </p>
          </div>

          <NativeDownloadLink
            href="/api/dashboard/certificates/bulk/template"
            fileName="certificates-template.xlsx"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            تحميل نموذج Excel
          </NativeDownloadLink>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("students")}
            className={[
              "rounded-xl px-4 py-2.5 text-sm font-black transition",
              tab === "students"
                ? "bg-sky-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            من بيانات الطلاب
          </button>

          <button
            type="button"
            onClick={() => setTab("excel")}
            className={[
              "rounded-xl px-4 py-2.5 text-sm font-black transition",
              tab === "excel"
                ? "bg-sky-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            من Excel
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-black text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900">
            {error}
          </div>
        ) : null}
      </section>

      {tab === "students" ? (
        <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-5">
              <p className="text-xs font-black text-sky-700">إعدادات الشهادة</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">تطبق على المحددين</h2>

              <div className="mt-4 space-y-3">
                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">صيغة الشهادة</span>
                  <select
                    value={recipientType}
                    onChange={(event) => setRecipientType(event.target.value as "student" | "student_female")}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-sky-200 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  >
                    <option value="student">طالب</option>
                    <option value="student_female">طالبة</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">نوع الشهادة</span>
                  <select
                    value={certificateType}
                    onChange={(event) => setCertificateType(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-sky-200 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  >
                    {CERTIFICATE_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">سبب التكريم</span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={4}
                    placeholder="مثال: المشاركة الفاعلة في أنشطة المدرسة"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  />
                </label>

                <div className="space-y-2 [&_button]:rounded-xl [&_button]:p-2 [&_button]:shadow-none [&_button_p]:hidden [&_button_span]:text-xs">
                  <div>
                    <p className="text-xs font-black text-slate-500">تصميم الشهادة</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">يُستخدم التصميم المختار لجميع شهادات الدفعة.</p>
                  </div>
                  <CertificateTemplateSelector value={templateKey} onChange={setTemplateKey} />
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-slate-500">تاريخ الإصدار</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none focus:border-sky-200 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  />
                </label>
              </div>
            </section>
          </aside>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">اختيار الطلاب</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">الصف والفصل والبحث</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllVisibleStudents}
                  className="min-h-10 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  تحديد الظاهر
                </button>
                <button
                  type="button"
                  onClick={clearSelectedStudents}
                  className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-3">
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setClassroom("");
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-sky-200 focus:bg-white"
              >
                <option value="">كل الصفوف</option>
                {grades.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select
                value={classroom}
                onChange={(event) => setClassroom(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-sky-200 focus:bg-white"
              >
                <option value="">كل الفصول</option>
                {classrooms.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="بحث بالاسم أو الهوية..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-1">
              {studentsLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
                  جاري تحميل الطلاب...
                </div>
              ) : students.length ? (
                students.map((student) => {
                  const selected = selectedStudentIds.includes(student.id);

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={[
                        "rounded-xl border p-3 text-right transition",
                        selected
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{student.fullName}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {student.grade || "صف غير محدد"} · {student.classroom || "فصل غير محدد"} · {student.nationalId || "بدون هوية"}
                          </p>
                        </div>

                        <span className={[
                          "rounded-full px-3 py-1 text-xs font-black",
                          selected ? "bg-sky-700 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600",
                        ].join(" ")}>
                          {selected ? "محدد" : "اختيار"}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
                  لا توجد نتائج.
                </div>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs font-black text-sky-700">رفع Excel</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">ارفع النموذج بعد تعبئته</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                الأعمدة عربية. المطلوب فقط اسم المستفيد وسبب التكريم، والباقي اختياري.
              </p>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-sky-300 hover:bg-sky-50">
                <Upload className="h-9 w-9 text-sky-700" />
                <span className="mt-3 text-sm font-black text-slate-950">
                  اختر ملف Excel
                </span>
                <span className="mt-1 text-xs font-bold text-slate-500">
                  xlsx / xls
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => previewExcel(event.target.files?.[0] || null)}
                />
              </label>

              {excelLoading ? (
                <p className="mt-4 text-sm font-black text-slate-500">جاري قراءة الملف...</p>
              ) : null}
            </div>

            <div className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-100">
              <FileSpreadsheet className="h-8 w-8 text-sky-700" />
              <h3 className="mt-3 text-lg font-black text-slate-950">
                النموذج العربي
              </h3>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                حمل النموذج، انسخ الأسماء وسبب التكريم، ثم ارفعه هنا للمعاينة.
              </p>
              <NativeDownloadLink
                href="/api/dashboard/certificates/bulk/template"
                fileName="certificates-template.xlsx"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                <Download className="h-4 w-4" />
                تحميل النموذج
              </NativeDownloadLink>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">المعاينة</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">الشهادات الجاهزة</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              راجع الأسماء قبل الإصدار. سيتم حفظ الدفعة وكل شهادة في الأرشيف.
            </p>
          </div>

          <button
            type="button"
            onClick={issueBatch}
            disabled={issuing || validCount === 0 || invalidCount > 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {issuing ? "جاري إصدار الدفعة..." : "إصدار الدفعة"}
            <Award className="h-4 w-4" />
          </button>
        </div>

        {activeRows.length ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="min-w-[680px] grid grid-cols-[80px_1.2fr_0.8fr_1.4fr_0.7fr] bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <span>الحالة</span>
              <span>المستفيد</span>
              <span>نوع الشهادة</span>
              <span>سبب التكريم</span>
              <span>التاريخ</span>
            </div>

            <div className="max-h-[520px] divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
              {activeRows.map((row) => (
                <div
                  key={`${row.rowNumber}-${row.recipientName}`}
                  className="min-w-[680px] grid grid-cols-[80px_1.2fr_0.8fr_1.4fr_0.7fr] items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className={[
                    "w-fit rounded-full px-3 py-1 text-xs font-black",
                    row.isValid
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
                  ].join(" ")}>
                    {row.isValid ? "جاهزة" : "خطأ"}
                  </span>

                  <div>
                    <p className="font-black text-slate-950">{row.recipientName || "بدون اسم"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {row.grade || "بدون صف"} · {row.classroom || "بدون فصل"}
                    </p>
                  </div>

                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {getCertificateTypeLabel(row.certificateType)}
                  </span>

                  <div>
                    <p className="line-clamp-2 font-bold text-slate-600 dark:text-slate-300">
                      {row.reason || "بدون سبب"}
                    </p>
                    {!row.isValid ? (
                      <p className="mt-1 text-xs font-black text-rose-600">
                        {row.errors.join(" ")}
                      </p>
                    ) : null}
                  </div>

                  <span className="font-bold text-slate-500">{row.issueDate}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center dark:border-slate-700 dark:bg-slate-800">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-800">
              لا توجد أسماء في المعاينة
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
              اختر طلابًا من القائمة أو ارفع ملف Excel.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          {icon}
        </div>
        <div>
          <p className="truncate text-[10px] font-black text-slate-400 sm:text-xs">{label}</p>
          <p className="mt-0.5 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{value}</p>
        </div>
      </div>
    </article>
  );
}
