"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/http/read-api-response";
import { getStudentAudienceLabels } from "@/lib/students/student-audience-labels";

type StudentItem = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  gender?: string | null;
  stage?: string | null;
  grade?: string | null;
  classroom?: string | null;
  isActive: boolean;
  guardian?: {
    id: string;
    name: string;
    phone?: string | null;
    relation?: string | null;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  grades: number;
  classrooms: number;
};

type EditingStudent = {
  id: string;
  fullName: string;
  stage: string;
  grade: string;
  classroom: string;
  guardianName: string;
  guardianPhone: string;
  isActive: boolean;
};

type Props = {
  schoolName: string;
  gender?: string | null;
  importedCount?: number;
  importedFiles?: number;
};

const statusOptions = [
  { value: "ACTIVE", label: "النشطون" },
  { value: "INACTIVE", label: "غير النشطين" },
  { value: "ALL", label: "الكل" },
];

export function StudentsCenterClient({ schoolName, gender, importedCount, importedFiles }: Props) {
  const labels = getStudentAudienceLabels(gender);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 40,
    total: 0,
    totalPages: 1,
  });

  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    grades: 0,
    classrooms: 0,
  });

  const [grades, setGrades] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const [editing, setEditing] = useState<EditingStudent | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadStudents(page = 1) {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        status,
      });

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (grade) {
        params.set("grade", grade);
      }

      if (classroom) {
        params.set("classroom", classroom);
      }

      const response = await fetch(
        `/api/dashboard/data-center/students?${params.toString()}`,
        { cache: "no-store" },
      );

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر جلب سجل الطلاب.");
      }

      setStudents(result.students ?? []);
      setPagination(result.pagination);
      setStats(result.stats);
      setGrades(result.filters?.grades ?? []);
      setClassrooms(result.filters?.classrooms ?? []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر جلب سجل الطلاب.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadStudents(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, grade, classroom, status]);

  function startEdit(student: StudentItem) {
    setEditing({
      id: student.id,
      fullName: student.fullName || "",
      stage: student.stage || "",
      grade: student.grade || "",
      classroom: student.classroom || "",
      guardianName: student.guardian?.name || "",
      guardianPhone: student.guardian?.phone || "",
      isActive: student.isActive,
    });
  }

  async function saveStudent() {
    if (!editing) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/dashboard/data-center/students/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editing),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر حفظ بيانات الطالب.");
      }

      setMessage({
        type: "success",
        text: result.message || "تم حفظ بيانات الطالب.",
      });

      setEditing(null);
      await loadStudents(pagination.page);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر حفظ بيانات الطالب.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 text-right text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-4 dark:from-sky-950/40 dark:via-slate-900 dark:to-emerald-950/30 md:p-5">
            <p className="text-sm font-black text-sky-700">مركز بيانات المدرسة</p>
            <h1 className="mt-1 text-xl font-black md:text-2xl">سجل {labels.students}</h1>
            <p className="mt-1 max-w-4xl text-xs font-bold text-slate-600 dark:text-slate-400">
              هذا هو السجل الناتج من {labels.studentData} لمدرسة {schoolName}.
            </p>
            {importedCount ? (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                تم استيراد {importedCount} {labels.students} من {importedFiles || 1} ملفات بنجاح.
              </p>
            ) : null}
          </div>
        </section>

        {message ? (
          <section
            className={[
              "rounded-2xl border px-4 py-3 text-sm font-bold leading-7 shadow-sm",
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : message.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-sky-200 bg-sky-50 text-sky-800",
            ].join(" ")}
          >
            {message.text}
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black text-slate-400">إجمالي {labels.students}</p>
            <p className="mt-1 text-xl font-black">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black text-slate-400">النشطون</p>
            <p className="mt-1 text-xl font-black">{stats.active}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black text-slate-400">غير النشطين</p>
            <p className="mt-1 text-xl font-black">{stats.inactive}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black text-slate-400">الصفوف</p>
            <p className="mt-1 text-xl font-black">{stats.grades}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black text-slate-400">الفصول</p>
            <p className="mt-1 text-xl font-black">{stats.classrooms}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_160px]">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="اكتب اسم الطالب، الهوية، ولي الأمر، الصف أو الفصل..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">كل الصفوف</option>
              {grades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={classroom}
              onChange={(event) => setClassroom(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">كل الفصول</option>
              {classrooms.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-xs font-bold text-slate-500">
              البحث يعمل تلقائيًا أثناء الكتابة.
              {isLoading ? " جاري التحديث..." : ""}
            </p>

            {(q || grade || classroom || status !== "ACTIVE") ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setGrade("");
                  setClassroom("");
                  setStatus("ACTIVE");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700"
              >
                مسح الفلاتر
              </button>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-right">الطالب</th>
                    <th className="px-4 py-3 text-right">الهوية</th>
                    <th className="px-4 py-3 text-right">الصف</th>
                    <th className="px-4 py-3 text-right">الفصل</th>
                    <th className="px-4 py-3 text-right">ولي الأمر</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">إجراء</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{student.fullName}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{student.stage || "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">{student.nationalId || "—"}</td>
                      <td className="px-4 py-3 font-bold text-slate-600">{student.grade || "—"}</td>
                      <td className="px-4 py-3 font-bold text-slate-600">{student.classroom || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{student.guardian?.name || "—"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{student.guardian?.phone || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                            student.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600",
                          ].join(" ")}
                        >
                          {student.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEdit(student)}
                          className="rounded-2xl border border-sky-200 bg-white px-4 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-50"
                        >
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!students.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        لا توجد نتائج مطابقة.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <p className="text-sm font-bold text-slate-500">
              صفحة {pagination.page} من {pagination.totalPages} · إجمالي النتائج {pagination.total}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadStudents(Math.max(pagination.page - 1, 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                السابق
              </button>

              <button
                type="button"
                onClick={() => loadStudents(Math.min(pagination.page + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        </section>

        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">تعديل بيانات الطالب</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    استخدم هذا التعديل للحالات الشاذة مثل اسم ولي الأمر أو الصف أو الفصل.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-500"
                >
                  إغلاق
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-xs font-black text-slate-500">اسم الطالب</span>
                  <input
                    value={editing.fullName}
                    onChange={(event) => setEditing({ ...editing, fullName: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">المرحلة</span>
                  <input
                    value={editing.stage}
                    onChange={(event) => setEditing({ ...editing, stage: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">الصف</span>
                  <input
                    value={editing.grade}
                    onChange={(event) => setEditing({ ...editing, grade: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">الفصل</span>
                  <input
                    value={editing.classroom}
                    onChange={(event) => setEditing({ ...editing, classroom: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">الحالة</span>
                  <select
                    value={editing.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) => setEditing({ ...editing, isActive: event.target.value === "ACTIVE" })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  >
                    <option value="ACTIVE">نشط</option>
                    <option value="INACTIVE">غير نشط</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">اسم ولي الأمر</span>
                  <input
                    value={editing.guardianName}
                    onChange={(event) => setEditing({ ...editing, guardianName: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">جوال ولي الأمر</span>
                  <input
                    value={editing.guardianPhone}
                    onChange={(event) => setEditing({ ...editing, guardianPhone: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-2 md:flex-row">
                <button
                  type="button"
                  onClick={saveStudent}
                  disabled={isSaving}
                  className="flex-1 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التعديل"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
