"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { FileText, Trash2, Users } from "lucide-react";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";
import { readApiResponse } from "@/lib/http/read-api-response";
import { GuidanceScope } from "@/components/guidance/guidance-scope";
import { StudentDataCardDeleteDialog } from "@/components/data-center/noor-import/student-data-card-delete-dialog";
import { getStudentAudienceLabels } from "@/lib/students/student-audience-labels";

type NoorCycle = {
  id: string;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  totalStudents: number;
  totalSessions: number;
  pendingSessions: number;
  committedSessions: number;
  isArchived?: boolean;
  createdAt: string;
  latestSession?: {
    id: string;
    status: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    conflictCount?: number;
    createdAt: string;
    committedAt?: string | null;
    files?: Array<{
      fileName: string;
    }>;
  } | null;
};

type Props = {
  schoolName: string;
  gender?: string | null;
};
type UploadFileState = { id: string; file: File; status: "waiting" | "processing" | "completed" | "failed"; error?: string };

const termOptions = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
  "الفصل الدراسي الثالث",
];

function defaultAcademicYear() {
  return "1447";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function NoorImportCyclesClient({ schoolName, gender }: Props) {
  const labels = getStudentAudienceLabels(gender);
  const [cycles, setCycles] = useState<NoorCycle[]>([]);
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [term, setTerm] = useState(termOptions[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFileState[]>([]);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoorCycle | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openUpload(cycle?: NoorCycle) {
    setAcademicYear(cycle?.academicYear || defaultAcademicYear());
    setTerm(cycle?.term || termOptions[0]);
    setUploadFiles([]);
    setMessage(null);
    setIsCreateOpen(true);
  }

  function selectUploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
    setUploadFiles(files.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, file, status: "waiting" })));
    if (files.length !== Array.from(fileList || []).length) {
      setMessage({ type: "error", text: "تم تجاهل الملفات غير المدعومة. اختر ملفات xlsx أو xls فقط." });
    }
  }

  async function importSelectedFiles(cycleId: string) {
    let completed = 0;
    for (let index = 0; index < uploadFiles.length; index += 1) {
      const item = uploadFiles[index];
      setUploadCurrent(index + 1);
      setUploadFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "processing", error: undefined } : entry));
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("cycleId", cycleId);
        formData.append("academicYear", academicYear.trim());
        formData.append("term", term.trim());
        formData.append("batchMode", "queue");
        const response = await fetch("/api/dashboard/data-center/student-data-import/preview", { method: "POST", body: formData });
        const result = await readApiResponse(response);
        if (!response.ok) throw new Error(result.error || "تعذر استيراد الملف.");
        completed += 1;
        setUploadFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "completed" } : entry));
      } catch (error) {
        setUploadFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "failed", error: error instanceof Error ? error.message : "تعذر استيراد الملف." } : entry));
      }
    }
    setUploadCurrent(0);
    if (completed > 0) {
      window.location.href = `/dashboard/data-center/students?imported=${completed}&files=${uploadFiles.length}`;
    }
  }

  const loadCycles = useCallback(async () => {
    const response = await fetch("/api/dashboard/data-center/student-data-import/cycles", {
      cache: "no-store",
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result.error || "تعذر جلب بطاقات بيانات الطلاب.");
    }

    setCycles(result.cycles ?? []);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadCycles().catch((error) => {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "تعذر جلب بطاقات بيانات الطلاب.",
        });
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCycles]);

  async function confirmDeleteCycle() {
    if (!deleteTarget || deleteBusy) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/dashboard/data-center/student-data-import/cycles/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف بطاقة بيانات الطلاب.");
      }

      setDeleteTarget(null);
      await loadCycles();
      setMessage({
        type: "success",
        text: "تم حذف بطاقة بيانات الطلاب بنجاح، وتم الاحتفاظ بالتقارير السابقة.",
      });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "تعذر حذف بطاقة بيانات الطلاب. حاول مرة أخرى.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCreateCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!academicYear.trim() || !term.trim() || !uploadFiles.length) {
      setMessage({
        type: "error",
        text: "حدد السنة والفصل واختر ملف Excel واحدًا على الأقل.",
      });
      return;
    }

    setIsLoading(true);
    setMessage({
      type: "info",
      text: "جاري رفع بيانات الطلاب...",
    });

    try {
      const response = await fetch("/api/dashboard/data-center/student-data-import/cycles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYear: academicYear.trim(),
          term: term.trim(),
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تجهيز دفعة بيانات الطلاب.");
      }

      if (result.cycle?.id) {
        await importSelectedFiles(result.cycle.id);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر رفع بيانات الطلاب.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-4 text-right text-slate-950 dark:bg-slate-950 dark:text-slate-100 md:px-8"
      dir="rtl"
      data-school-name={schoolName}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <GuidanceScope context="student-data-import" />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-4 dark:from-sky-950/40 dark:via-slate-900 dark:to-emerald-950/30 md:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-sky-700">مركز بيانات المدرسة</p>
                <h1 className="mt-1 text-xl font-black md:text-2xl">مركز {labels.studentData}</h1>
              </div>

              <button
                type="button"
                onClick={() => openUpload()}
                data-guidance="student-import-start"
                className="min-h-10 rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-700"
              >
                إضافة بيانات {labels.students}
              </button>
            </div>
          </div>
        </section>

        {message ? (
          <section
            className={[
              "rounded-3xl border px-5 py-4 text-sm font-bold leading-7 shadow-sm",
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

        <section
          data-guidance="student-import-current-data"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
                <h2 className="text-lg font-black">بطاقات {labels.studentData}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                بطاقات البيانات حسب السنة والفصل.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openUpload()}
              className="min-h-10 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"
            >
              إضافة بيانات {labels.students}
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {cycles.length ? (
              cycles.map((cycle) => (
                <article
                  key={cycle.id}
                  className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-sky-800 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                      <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                        {labels.studentData} {cycle.academicYear} - {cycle.term}
                      </h3>

                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {cycle.totalSessions} ملفات · آخر رفع: {formatDate(cycle.latestSession?.createdAt || cycle.createdAt)}
                      </p>
                      </div>

                      <ExpandableActionMenu
                        menuId={`student-data-cycle-${cycle.id}`}
                        className="shrink-0"
                        stripClassName="flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                      >
                      <button
                        type="button"
                        onClick={() => openUpload(cycle)}
                        className="min-h-10 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300"
                      >
                        إعادة الرفع
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(cycle);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                      </ExpandableActionMenu>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 max-[340px]:grid-cols-1">
                      <span className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                      <span>{labels.students}</span>
                      <strong className="text-sm text-slate-950 dark:text-white">{cycle.totalStudents || cycle.latestSession?.totalRows || 0}</strong>
                      </span>

                      <span className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                      <span>الملفات</span>
                      <strong className="text-sm text-slate-950 dark:text-white">{cycle.totalSessions}</strong>
                      </span>
                    </div>

                    <Link href="/dashboard/data-center/students" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-700">
                      عرض {labels.students}
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-800/60">
                <h3 className="text-lg font-black text-slate-900">لا توجد بطاقات بعد</h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  أضف بيانات {labels.students} من خلال نافذة الرفع.
                </p>

                <button
                  type="button"
                  onClick={() => openUpload()}
                  className="mt-4 min-h-10 rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-700"
                >
                  إضافة بيانات {labels.students}
                </button>
              </div>
            )}
          </div>
        </section>

        {isCreateOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <form
              onSubmit={handleCreateCycle}
              className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">إضافة بيانات {labels.students}</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    اختر السنة والفصل وملفات Excel، وسيتم حفظ {labels.students} مباشرة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-500"
                >
                  إغلاق
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="text-xs font-black text-slate-500">السنة الدراسية</span>
                  <input
                    value={academicYear}
                    onChange={(event) => setAcademicYear(event.target.value)}
                    placeholder="مثال: 1447"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">الفصل الدراسي</span>
                  <select
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  >
                    {termOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-5 text-center">
                  <span className="text-sm font-black text-sky-800">اختر ملفات Excel</span>
                  <span className="mt-1 block text-xs font-bold text-sky-700">يمكنك اختيار أكثر من ملف وسيتم رفعها بالتتابع.</span>
                  <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={(event) => selectUploadFiles(event.target.files)} />
                </label>

                {uploadFiles.length ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3" aria-live="polite">
                    {uploadFiles.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold">
                        <span className="min-w-0 truncate">{index + 1}. {item.file.name}</span>
                        <span className={item.status === "failed" ? "text-rose-700" : item.status === "completed" ? "text-emerald-700" : item.status === "processing" ? "text-sky-700" : "text-slate-500"}>
                          {item.status === "failed" ? item.error || "فشل" : item.status === "completed" ? "تم" : item.status === "processing" ? "قيد الرفع" : "في الانتظار"}
                        </span>
                      </div>
                    ))}
                    {uploadCurrent ? <p className="text-xs font-black text-sky-700">{uploadCurrent} من {uploadFiles.length} ملفات</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-2 md:flex-row">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isLoading ? `جاري رفع البيانات... ${uploadCurrent ? `${uploadCurrent} من ${uploadFiles.length}` : ""}` : "رفع البيانات"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      <StudentDataCardDeleteDialog
        target={
          deleteTarget
            ? {
                title: `${labels.studentData} ${deleteTarget.academicYear} - ${deleteTarget.term}`,
                academicYear: deleteTarget.academicYear,
                term: deleteTarget.term,
                studentCount: deleteTarget.totalStudents || deleteTarget.latestSession?.totalRows || 0,
                lastUpdatedAt: formatDate(deleteTarget.latestSession?.createdAt || deleteTarget.createdAt),
              }
            : null
        }
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmDeleteCycle()}
      />
    </main>
  );
}
