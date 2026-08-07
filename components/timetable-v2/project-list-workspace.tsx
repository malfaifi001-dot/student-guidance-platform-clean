"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
  useTransition,
} from "react";

type Project = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  status: string;

  teacherCount: number;
  classCount: number;
  subjectCount: number;

  requiredLessons: number;
  assignedLessons: number;

  activeConstraintCount: number;
  hardConstraintCount: number;
  softConstraintCount: number;

  dayCount: number;
  periodCount: number;

  progress: number;

  assignmentComplete: boolean;

  latestSchedule: {
    id: string;
    version: number;
    status: string;
    score: number;
    completeness: number;
    isCurrent: boolean;
    generatedAt: string;
  } | null;
};

type Props = {
  projects: Project[];
};

function statusLabel(
  status: string,
) {
  const labels:
    Record<
      string,
      string
    > = {
      DRAFT:
        "مسودة",

      READY:
        "جاهز",

      GENERATED:
        "تم الإنشاء",

      APPROVED:
        "معتمد",

      PUBLISHED:
        "منشور",

      ARCHIVED:
        "مؤرشف",
    };

  return (
    labels[status] ??
    status
  );
}

function statusClass(
  status: string,
) {
  if (
    status ===
      "PUBLISHED" ||
    status ===
      "APPROVED"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    status ===
      "GENERATED"
  ) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (
    status ===
      "ARCHIVED"
  ) {
    return "bg-slate-100 text-slate-500 border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function TimetableV2ProjectListWorkspace({
  projects,
}: Props) {
  const router =
    useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [
    deleteProject,
    setDeleteProject,
  ] = useState<Project | null>(
    null,
  );

  const [
    confirmName,
    setConfirmName,
  ] = useState("");

  const [
    deleteError,
    setDeleteError,
  ] = useState("");

  function closeDelete() {
    if (pending) {
      return;
    }

    setDeleteProject(
      null,
    );

    setConfirmName("");

    setDeleteError("");
  }

  function requestDelete(
    project: Project,
  ) {
    setDeleteProject(
      project,
    );

    setConfirmName("");

    setDeleteError("");
  }

  function confirmDelete() {
    if (
      !deleteProject ||
      confirmName.trim() !==
        deleteProject.name.trim()
    ) {
      return;
    }

    setDeleteError("");

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              `/api/dashboard/principal/timetable-v2/projects/${deleteProject.id}`,
              {
                method:
                  "DELETE",
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => null,
              );

          if (
            !response.ok ||
            !data?.success
          ) {
            throw new Error(
              data?.error ??
                "تعذر حذف المشروع.",
            );
          }

          setDeleteProject(
            null,
          );

          setConfirmName("");

          router.refresh();
        }
        catch (error) {
          setDeleteError(
            error instanceof Error
              ? error.message
              : "تعذر حذف المشروع.",
          );
        }
      },
    );
  }
  return (
    <div
      dir="rtl"
      className="mx-auto max-w-[1500px] space-y-5 pb-20"
    >
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
              الجدول الدراسي
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              مشاريع الجداول
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              أنشئ جدولًا جديدًا أو تابع مشروعًا قائمًا من نفس المكان.
            </p>
          </div>

          <Link
            href="/dashboard/timetable-v2/new"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            + مشروع جدول جديد
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="إجمالي المشاريع"
            value={
              projects.length
            }
          />

          <SummaryCard
            label="مشاريع نشطة"
            value={
              projects.filter(
                (project) =>
                  project.status !==
                  "ARCHIVED",
              ).length
            }
          />

          <SummaryCard
            label="تم إنشاؤها"
            value={
              projects.filter(
                (project) =>
                  Boolean(
                    project.latestSchedule,
                  ),
              ).length
            }
          />

          <SummaryCard
            label="منشورة"
            value={
              projects.filter(
                (project) =>
                  project.status ===
                  "PUBLISHED",
              ).length
            }
          />
        </div>
      </section>

      {projects.length ===
      0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-2xl font-black text-teal-700">
            +
          </div>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            لا توجد مشاريع جداول حتى الآن
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            ابدأ بإنشاء أول مشروع جدول مدرسي.
          </p>

          <Link
            href="/dashboard/timetable-v2/new"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-black text-white"
          >
            إنشاء مشروع
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {projects.map(
            (project) => (
              <article
                key={
                  project.id
                }
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="p-5 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950">
                          {
                            project.name
                          }
                        </h2>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[10px] font-black",
                            statusClass(
                              project.status,
                            ),
                          ].join(" ")}
                        >
                          {
                            statusLabel(
                              project.status,
                            )
                          }
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {
                          project.academicYear
                        }
                        {" • "}
                        {
                          project.semester
                        }
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-2xl font-black text-teal-700">
                        {
                          project.progress
                        }
                        %
                      </div>

                      <div className="text-[10px] text-slate-400">
                        تقدم المشروع
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{
                        width:
                          `${project.progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniMetric
                      label="المعلمون"
                      value={
                        project.teacherCount
                      }
                    />

                    <MiniMetric
                      label="الفصول"
                      value={
                        project.classCount
                      }
                    />

                    <MiniMetric
                      label="المواد"
                      value={
                        project.subjectCount
                      }
                    />

                    <MiniMetric
                      label="القيود"
                      value={
                        project.activeConstraintCount
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-black text-slate-500">
                          الإسناد
                        </div>

                        <div className="mt-1 text-lg font-black text-slate-950">
                          {
                            project.assignedLessons
                          }
                          /
                          {
                            project.requiredLessons
                          }
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-xs font-black text-slate-500">
                          الزمن
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                          {
                            project.dayCount
                          } أيام
                          {" • "}
                          {
                            project.periodCount
                          } حصص
                        </div>
                      </div>
                    </div>
                  </div>

                  {project.latestSchedule ? (
                    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-sky-700">
                            آخر نسخة جدول
                          </div>

                          <div className="mt-1 font-black text-slate-950">
                            نسخة #
                            {
                              project.latestSchedule.version
                            }
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xl font-black text-sky-700">
                            {
                              project.latestSchedule.score
                            }
                            %
                          </div>

                          <div className="text-[10px] text-slate-500">
                            جودة
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500">
                      لم يتم إنشاء جدول لهذا المشروع حتى الآن.
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/timetable-v2/${project.id}`}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                    >
                      فتح المشروع
                    </Link>

                    <Link
                      href={`/dashboard/timetable-v2/${project.id}/readiness`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"
                    >
                      فحص البيانات
                    </Link>

                    <Link
                      href={`/dashboard/timetable-v2/${project.id}/generate`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 text-xs font-black text-teal-700"
                    >
                      إنشاء الجدول
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          project,
                        )
                      }
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </section>
      )}

      <DeleteProjectDialog
        deleteProject={deleteProject}
        confirmName={confirmName}
        deleteError={deleteError}
        pending={pending}
        closeDelete={closeDelete}
        confirmDelete={confirmDelete}
        setConfirmName={setConfirmName}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="text-[10px] font-bold text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-base font-black text-slate-900">
        {value}
      </div>

    </div>
  );
}

function DeleteProjectDialog({
  deleteProject,
  confirmName,
  deleteError,
  pending,
  closeDelete,
  confirmDelete,
  setConfirmName,
}: {
  deleteProject: Project | null;
  confirmName: string;
  deleteError: string;
  pending: boolean;
  closeDelete: () => void;
  confirmDelete: () => void;
  setConfirmName: (value: string) => void;
}) {
  if (!deleteProject) {
    return null;
  }

  return (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDelete();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                  حذف مشروع
                </div>

                <h2 className="mt-3 text-2xl font-black text-slate-950">
                  حذف {deleteProject.name}؟
                </h2>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  سيتم حذف المشروع وجميع بياناته المرتبطة به، بما في ذلك المعلمين والفصول والمواد والإسنادات والقيود ونسخ الجدول والتشغيل اليومي المرتبط بهذا المشروع.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDelete
                }
                disabled={
                  pending
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-500"
              >
                ×
              </button>
            </div>

            {deleteProject.status ===
            "PUBLISHED" ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                هذا المشروع منشور حاليًا، ولا يمكن حذفه مباشرة حفاظًا على التشغيل اليومي والجدول المعتمد.
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="text-sm font-black text-rose-800">
                    هذا الإجراء نهائي.
                  </div>

                  <p className="mt-1 text-xs leading-6 text-rose-700">
                    للتأكيد، اكتب اسم المشروع كما يظهر أدناه:
                  </p>

                  <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-900">
                    {deleteProject.name}
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="text-xs font-black text-slate-600">
                    اسم المشروع
                  </span>

                  <input
                    type="text"
                    value={
                      confirmName
                    }
                    onChange={(event) =>
                      setConfirmName(
                        event.target.value,
                      )
                    }
                    autoComplete="off"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-50"
                    placeholder="اكتب اسم المشروع للتأكيد"
                  />
                </label>

                {deleteError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                    {deleteError}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      closeDelete
                    }
                    disabled={
                      pending
                    }
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={
                      confirmDelete
                    }
                    disabled={
                      pending ||
                      confirmName.trim() !==
                        deleteProject.name.trim()
                    }
                    className="h-11 flex-1 rounded-xl bg-rose-700 px-4 text-sm font-black text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pending
                      ? "جاري الحذف..."
                      : "حذف المشروع نهائيًا"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
  );
}
