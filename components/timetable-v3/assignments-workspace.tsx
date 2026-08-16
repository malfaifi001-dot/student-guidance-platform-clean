"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  TimetableFeasibilityIssue,
  TimetableFeasibilityReport,
} from "@/lib/timetable-v2/feasibility/feasibility-types";

import {
  TIMETABLE_V3_STAGES,
  resolveTimetableV3ClassClassification,
  type TimetableV3ClassMappings,
  type TimetableV3StageId,
} from "@/lib/timetable-v3/school-setup-catalog";

import { notifyTimetableHistoryUpdated } from "@/lib/timetable-v3/history/history-client";

type Teacher = {
  id: string;
  name: string;
  specialty: string;
  maxWeeklyLoad: number;
  assignedLoad: number;
};

type ClassItem = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  assignedLessons: number;

  singlePeriods: number;
  doublePeriods: number;
};

type ClassSubject = {
  classId: string;
  subjectId: string;
  weeklyLessons: number;
};

type Workspace = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    stages?: TimetableV3StageId[];
  };

  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  classSubjects?: ClassSubject[];
  assignments: Assignment[];
  classMappings?: TimetableV3ClassMappings;
};

function resolveTimetableV3ClassMetadata(
  classId: string,
  className: string,
  mappings: TimetableV3ClassMappings = {},
) {
  const classification = resolveTimetableV3ClassClassification(
    classId,
    className,
    mappings,
  );

  return classification
    ? {
        stageId: classification.stageId,
        gradeId: classification.gradeId,
      }
    : null;
}

type Draft = {
  classId: string;
  subjectId: string;
  assignedLessons: number;
};

type PendingOverload = {
  mode:
    | "CREATE"
    | "UPDATE";

  assignmentId?: string;

  payload: {
    teacherId: string;
    classId: string;
    subjectId: string;
    assignedLessons: number;
  };

  teacher: {
    name: string;
    maxWeeklyLoad: number;
    currentLoad: number;
    projectedLoad: number;
  };
};

export function TimetableV3AssignmentsWorkspace(
  props: {
    projectId: string;
  },
) {
  const [
    workspace,
    setWorkspace,
  ] = useState<
    Workspace |
    null
  >(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    saving,
    setSaving,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(
    null,
  );

  const [
    teacherSearch,
    setTeacherSearch,
  ] = useState(
    "",
  );

  const [
    viewMode,
    setViewMode,
  ] = useState<
    "teacher" |
    "grid"
  >(
    "teacher",
  );

  const [
    gridSearch,
    setGridSearch,
  ] = useState(
    "",
  );

  const [
    gridTeacherId,
    setGridTeacherId,
  ] = useState(
    "",
  );

  const teacherWorkspaceRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    feasibilityReport,
    setFeasibilityReport,
  ] = useState<
    TimetableFeasibilityReport |
    null
  >(null);

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState<
    string |
    null
  >(
    null,
  );

  const [
    editingAssignmentId,
    setEditingAssignmentId,
  ] = useState<
    string |
    null
  >(
    null,
  );

  const [
    draft,
    setDraft,
  ] = useState<Draft>({
    classId:
      "",

    subjectId:
      "",

    assignedLessons:
      1,
  });

  const [
    overload,
    setOverload,
  ] = useState<
    PendingOverload |
    null
  >(
    null,
  );

  async function load() {
    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${props.projectId}/assignments`,
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر تحميل الإسنادات.",
        );
      }

      const next:
        Workspace =
          data.workspace;

      setWorkspace(
        next,
      );

      setSelectedTeacherId(
        (
          current,
        ) => {
          if (
            current &&
            next.teachers.some(
              (teacher) =>
                teacher.id ===
                current,
            )
          ) {
            return current;
          }

          return (
            next.teachers[0]
              ?.id ??
            null
          );
        },
      );
    }
    catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر تحميل الإسنادات.",
      );
    }
    finally {
      setLoading(
        false,
      );
    }
  }

  useEffect(
    () => {
      void load();
    },
    [
      props.projectId,
    ],
  );

  useEffect(() => {
    if (viewMode !== "grid" || !workspace) {
      return;
    }

    let cancelled = false;

    void fetch(
      `/api/dashboard/principal/timetable-v3/projects/${props.projectId}/feasibility`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const data = await response.json() as {
          ok?: boolean;
          report?: TimetableFeasibilityReport;
        };

        if (!response.ok || !data.ok || !data.report) {
          throw new Error("FEASIBILITY_UNAVAILABLE");
        }

        if (!cancelled) {
          setFeasibilityReport(data.report);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeasibilityReport(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [props.projectId, viewMode, workspace]);

  const filteredTeachers =
    useMemo(
      () => {
        if (
          !workspace
        ) {
          return [];
        }

        const query =
          teacherSearch
            .trim()
            .toLocaleLowerCase(
              "ar",
            );

        if (!query) {
          return workspace.teachers;
        }

        return workspace.teachers.filter(
          (teacher) =>
            teacher.name
              .toLocaleLowerCase(
                "ar",
              )
              .includes(
                query,
              ) ||
            teacher.specialty
              .toLocaleLowerCase(
                "ar",
              )
              .includes(
                query,
              ),
        );
      },
      [
        teacherSearch,
        workspace,
      ],
    );

  const teacher =
    workspace?.teachers.find(
      (item) =>
        item.id ===
        selectedTeacherId,
    ) ??
    null;

  const teacherAssignments =
    workspace?.assignments.filter(
      (assignment) =>
        assignment.teacherId ===
        selectedTeacherId,
    ) ??
    [];

  function resetDraft() {
    setEditingAssignmentId(
      null,
    );

    setDraft({
      classId:
        "",

      subjectId:
        "",

      assignedLessons:
        1,
    });
  }

  function edit(
    assignment: Assignment,
  ) {
    setEditingAssignmentId(
      assignment.id,
    );

    setDraft({
      classId:
        assignment.classId,

      subjectId:
        assignment.subjectId,

      assignedLessons:
        assignment.assignedLessons,
    });

    setError(
      null,
    );
  }

  async function submit(
    allowOverload =
      false,
  ) {
    if (
      !teacher ||
      !draft.classId ||
      !draft.subjectId ||
      !Number.isInteger(
        draft.assignedLessons,
      ) ||
      draft.assignedLessons <
        1
    ) {
      setError(
        "اختر الفصل والمادة وعدد الحصص.",
      );

      return;
    }

    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      const mode =
        editingAssignmentId
          ? "UPDATE"
          : "CREATE";

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${props.projectId}/assignments`,
          {
            method:
              mode ===
              "CREATE"
                ? "POST"
                : "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  mode,

                ...(editingAssignmentId
                  ? {
                      assignmentId:
                        editingAssignmentId,
                    }
                  : {}),

                teacherId:
                  teacher.id,

                classId:
                  draft.classId,

                subjectId:
                  draft.subjectId,

                assignedLessons:
                  Number(
                    draft.assignedLessons,
                  ),

                allowOverload,
              }),
          },
        );

      const data =
        await response.json();

      if (
        response.status ===
          409 &&
        data?.code ===
          "TEACHER_LOAD_EXCEEDED"
      ) {
        setOverload({
          mode,

          assignmentId:
            editingAssignmentId ??
            undefined,

          payload: {
            teacherId:
              teacher.id,

            classId:
              draft.classId,

            subjectId:
              draft.subjectId,

            assignedLessons:
              Number(
                draft.assignedLessons,
              ),
          },

          teacher:
            data.overload,
        });

        return;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر حفظ الإسناد.",
        );
      }

      setWorkspace(
        data.workspace,
      );
      notifyTimetableHistoryUpdated();

      setOverload(
        null,
      );

      resetDraft();
    }
    catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر حفظ الإسناد.",
      );
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  async function confirmOverload() {
    if (!overload) {
      return;
    }

    setSaving(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${props.projectId}/assignments`,
          {
            method:
              overload.mode ===
              "CREATE"
                ? "POST"
                : "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  overload.mode,

                ...(overload.assignmentId
                  ? {
                      assignmentId:
                        overload.assignmentId,
                    }
                  : {}),

                ...overload.payload,

                allowOverload:
                  true,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر حفظ الإسناد.",
        );
      }

      setWorkspace(
        data.workspace,
      );
      notifyTimetableHistoryUpdated();

      setOverload(
        null,
      );

      resetDraft();
    }
    catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر حفظ الإسناد.",
      );
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  async function remove(
    assignmentId: string,
  ) {
    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${props.projectId}/assignments`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                assignmentId,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر حذف الإسناد.",
        );
      }

      setWorkspace(
        data.workspace,
      );

      notifyTimetableHistoryUpdated();

      if (
        editingAssignmentId ===
        assignmentId
      ) {
        resetDraft();
      }
    }
    catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر حذف الإسناد.",
      );
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  if (loading) {
    return (
      <Center>
        جاري التحميل...
      </Center>
    );
  }

  if (!workspace) {
    return (
      <Center>
        {error ??
          "تعذر تحميل الإسنادات."}
      </Center>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10"
    >
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            الإسنادات
          </h1>
        </div>

        <div className="text-left text-sm text-slate-500">
          {
            workspace.project.name
          }
        </div>
      </header>

      <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/3 rounded-full bg-[#3478B8]" />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={[
              "rounded-lg px-3 py-2 text-xs font-bold transition",
              viewMode === "teacher"
                ? "bg-[#3478B8] text-white"
                : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            عرض المعلم
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={[
              "rounded-lg px-3 py-2 text-xs font-bold transition",
              viewMode === "grid"
                ? "bg-[#3478B8] text-white"
                : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            عرض شبكي
          </button>
        </div>

        {viewMode === "grid" ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>المعلم</span>
              <select
                value={gridTeacherId}
                onChange={(event) => setGridTeacherId(event.target.value)}
                className="h-10 max-w-[190px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#3478B8]"
              >
                <option value="">جميع المعلمين</option>
                {workspace.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={gridSearch}
              onChange={(event) => setGridSearch(event.target.value)}
              placeholder="بحث بالمعلم أو الفصل أو المادة"
              className="h-10 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </div>
        ) : null}
      </div>

      {viewMode === "grid" ? (
        <AssignmentsGrid
          workspace={workspace}
          search={gridSearch}
          teacherId={gridTeacherId}
          feasibilityReport={feasibilityReport}
          onSelectTeacher={(teacherId) => {
            setSelectedTeacherId(teacherId);
            resetDraft();
            setViewMode("teacher");
            window.setTimeout(() => {
              teacherWorkspaceRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }, 0);
          }}
        />
      ) : (
      <div
        ref={teacherWorkspaceRef}
        className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
      >
        <aside className="rounded-3xl border border-slate-200 bg-white p-4">
          <input
            value={
              teacherSearch
            }
            onChange={
              (event) =>
                setTeacherSearch(
                  event.target.value,
                )
            }
            placeholder="بحث عن معلم"
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
          />

          <div className="mt-3 max-h-[620px] space-y-1 overflow-y-auto">
            {filteredTeachers.map(
              (item) => {
                const active =
                  item.id ===
                  selectedTeacherId;

                return (
                  <button
                    key={
                      item.id
                    }
                    type="button"
                    onClick={
                      () => {
                        setSelectedTeacherId(
                          item.id,
                        );

                        resetDraft();

                        setOverload(
                          null,
                        );
                      }
                    }
                    className={[
                      "w-full rounded-2xl px-4 py-3 text-right transition",
                      active
                        ? "bg-[#3478B8] text-white"
                        : "hover:bg-slate-50",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="font-semibold">
                      {
                        item.name
                      }
                    </div>

                    <div
                      className={[
                        "mt-1 flex items-center justify-between text-xs",
                        active
                          ? "text-white/75"
                          : "text-slate-400",
                      ].join(
                        " ",
                      )}
                    >
                      <span>
                        {
                          item.specialty ||
                          "—"
                        }
                      </span>

                      <span>
                        {
                          item.assignedLoad
                        }
                        /
                        {
                          item.maxWeeklyLoad
                        }
                      </span>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {!teacher ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-sm text-slate-400">
              اختر معلمًا
            </div>
          ) : (
            <>
              <TeacherHeader
                teacher={
                  teacher
                }
              />

              <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_130px_auto] md:items-end">
                  <Field
                    label="الفصل"
                  >
                    <select
                      value={
                        draft.classId
                      }
                      onChange={
                        (event) =>
                          setDraft({
                            ...draft,

                            classId:
                              event.target.value,
                          })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3478B8]"
                    >
                      <option value="">
                        اختر الفصل
                      </option>

                      {workspace.classes.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="المادة"
                  >
                    <select
                      value={
                        draft.subjectId
                      }
                      onChange={
                        (event) =>
                          setDraft({
                            ...draft,

                            subjectId:
                              event.target.value,
                          })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#3478B8]"
                    >
                      <option value="">
                        اختر المادة
                      </option>

                      {workspace.subjects.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="الحصص الأسبوعية"
                  >
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={
                        draft.assignedLessons
                      }
                      onChange={
                        (event) =>
                          setDraft({
                            ...draft,

                            assignedLessons:
                              Number(
                                event.target.value,
                              ),
                          })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#3478B8]"
                    />
                  </Field>

                  <div className="flex gap-2">
                    {editingAssignmentId ? (
                      <button
                        type="button"
                        onClick={
                          resetDraft
                        }
                        className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        إلغاء
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        () =>
                          void submit()
                      }
                      className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-semibold text-white transition hover:bg-[#2D6BA5] disabled:opacity-50"
                    >
                      {editingAssignmentId
                        ? "حفظ"
                        : "إضافة"}
                    </button>
                  </div>
                </div>
              </section>

              {overload ? (
                <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="font-bold text-amber-900">
                    تجاوز النصاب
                  </div>

                  <div className="mt-2 text-sm text-amber-800">
                    {
                      overload.teacher.name
                    }
                    {" · "}
                    {
                      overload.teacher.projectedLoad
                    }
                    /
                    {
                      overload.teacher.maxWeeklyLoad
                    }
                    {" "}
                    حصة
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={
                        () =>
                          setOverload(
                            null,
                          )
                      }
                      className="h-10 rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-900"
                    >
                      رجوع
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        () =>
                          void confirmOverload()
                      }
                      className="h-10 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      اعتماد رغم التجاوز
                    </button>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    error
                  }
                </div>
              ) : null}

              <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-bold text-slate-950">
                    إسنادات المعلم
                  </h2>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {
                      teacherAssignments.length
                    }
                    {" "}
                    إسناد
                  </span>
                </div>

                {teacherAssignments.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                    لا توجد إسنادات
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teacherAssignments.map(
                      (assignment) => (
                        <div
                          key={
                            assignment.id
                          }
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-950">
                              {
                                assignment.className
                              }
                              <span className="mx-2 text-slate-300">
                                ·
                              </span>
                              {
                                assignment.subjectName
                              }
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              {
                                assignment.assignedLessons
                              }
                              {" "}
                              حصص أسبوعيًا
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={
                                () =>
                                  edit(
                                    assignment,
                                  )
                              }
                              className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:border-[#3478B8] hover:text-[#3478B8]"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={
                                () =>
                                  void remove(
                                    assignment.id,
                                  )
                              }
                              className="h-9 rounded-xl px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>

            </>
          )}
        </main>
      </div>
      )}
    </div>
  );
}

function AssignmentsGrid({
  workspace,
  search,
  teacherId,
  feasibilityReport,
  onSelectTeacher,
}: {
  workspace: Workspace;
  search: string;
  teacherId: string;
  feasibilityReport: TimetableFeasibilityReport | null;
  onSelectTeacher: (teacherId: string) => void;
}) {
  const [stageId, setStageId] = useState<TimetableV3StageId | "">("");
  const [gradeId, setGradeId] = useState("");
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const topScrollSpacerRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef(false);
  const classSubjects = workspace.classSubjects ?? [];
  const projectStages = workspace.project.stages ?? [];

  const classMetadata = useMemo(
    () =>
      new Map(
        workspace.classes.map((classItem) => [
          classItem.id,
          resolveTimetableV3ClassMetadata(
            classItem.id,
            classItem.name,
            workspace.classMappings,
          ),
        ]),
      ),
    [workspace.classMappings, workspace.classes],
  );

  const stageOptions = useMemo(() => {
    const projectStageIds = new Set(
      projectStages.length
        ? projectStages
        : workspace.classes
            .map((classItem) => classMetadata.get(classItem.id)?.stageId)
            .filter((value): value is TimetableV3StageId => Boolean(value)),
    );

    return TIMETABLE_V3_STAGES.filter((stage) =>
      projectStageIds.has(stage.id),
    );
  }, [classMetadata, projectStages, workspace.classes]);

  const gradeOptions = useMemo(
    () =>
      TIMETABLE_V3_STAGES.filter(
        (stage) => !stageId || stage.id === stageId,
      ).flatMap((stage) =>
        stage.grades.filter((grade) =>
          workspace.classes.some(
            (classItem) =>
              classMetadata.get(classItem.id)?.gradeId === grade.id,
          ),
        ),
      ),
    [classMetadata, stageId, workspace.classes],
  );

  useEffect(() => {
    if (gradeId && !gradeOptions.some((grade) => grade.id === gradeId)) {
      setGradeId("");
    }
  }, [gradeId, gradeOptions]);

  const query = search.trim().toLocaleLowerCase("ar");
  const matchingAssignments = query
    ? workspace.assignments.filter((assignment) =>
        [
          assignment.teacherName,
          assignment.className,
          assignment.subjectName,
        ].some((value) =>
          value.toLocaleLowerCase("ar").includes(query),
        ),
      )
    : workspace.assignments;

  const classes = workspace.classes.filter((classItem) => {
    const metadata = classMetadata.get(classItem.id);

    if (stageId && metadata?.stageId !== stageId) {
      return false;
    }

    if (gradeId && metadata?.gradeId !== gradeId) {
      return false;
    }

    return (
      !query ||
      matchingAssignments.some(
        (assignment) => assignment.classId === classItem.id,
      )
    );
  });

  const subjects = workspace.subjects.filter((subject) =>
    !query || matchingAssignments.some(
      (assignment) => assignment.subjectId === subject.id,
    ),
  );

  const assignmentsByCell = new Map<string, Assignment[]>();
  for (const assignment of matchingAssignments) {
    const key = `${assignment.classId}:${assignment.subjectId}`;
    const current = assignmentsByCell.get(key) ?? [];
    current.push(assignment);
    assignmentsByCell.set(key, current);
  }

  const requiredByCell = new Map(
    classSubjects.map((item) => [
      `${item.classId}:${item.subjectId}`,
      item.weeklyLessons,
    ]),
  );

  const classIssues = new Map<string, TimetableFeasibilityIssue[]>();
  const cellIssues = new Map<string, TimetableFeasibilityIssue[]>();
  for (const issue of feasibilityReport?.issues ?? []) {
    const classId = issue.evidence.classId;
    const subjectId = issue.evidence.subjectId;
    if (classId) {
      classIssues.set(classId, [
        ...(classIssues.get(classId) ?? []),
        issue,
      ]);
    }
    if (classId && subjectId) {
      const key = `${classId}:${subjectId}`;
      cellIssues.set(key, [
        ...(cellIssues.get(key) ?? []),
        issue,
      ]);
    }
  }

  const selectedTeacher = teacherId
    ? workspace.teachers.find((teacher) => teacher.id === teacherId)
    : null;
  const selectedTeacherRemaining = selectedTeacher
    ? selectedTeacher.maxWeeklyLoad - selectedTeacher.assignedLoad
    : null;
  const incompleteCount = classSubjects.filter((item) => {
    const assigned = (assignmentsByCell.get(`${item.classId}:${item.subjectId}`) ?? [])
      .reduce((sum, assignment) => sum + assignment.assignedLessons, 0);
    return assigned < item.weeklyLessons;
  }).length;
  const overCount = classSubjects.filter((item) => {
    const assigned = (assignmentsByCell.get(`${item.classId}:${item.subjectId}`) ?? [])
      .reduce((sum, assignment) => sum + assignment.assignedLessons, 0);
    return assigned > item.weeklyLessons;
  }).length;
  const unassignedCount = classSubjects.filter((item) => {
    const assigned = (assignmentsByCell.get(`${item.classId}:${item.subjectId}`) ?? [])
      .reduce((sum, assignment) => sum + assignment.assignedLessons, 0);
    return item.weeklyLessons > 0 && assigned === 0;
  }).length;
  const sharedCount = [...assignmentsByCell.values()].filter((cell) => cell.length > 1).length;

  useEffect(() => {
    const matrix = matrixScrollRef.current;
    const top = topScrollRef.current;
    const spacer = topScrollSpacerRef.current;

    if (!matrix || !top || !spacer) {
      return;
    }

    const updateTopScrollWidth = () => {
      spacer.style.width = `${matrix.scrollWidth}px`;
      top.scrollLeft = matrix.scrollLeft;
    };

    const handleTopScroll = () => {
      if (syncingScrollRef.current) {
        return;
      }

      syncingScrollRef.current = true;
      matrix.scrollLeft = top.scrollLeft;
      syncingScrollRef.current = false;
    };

    const handleMatrixScroll = () => {
      if (syncingScrollRef.current) {
        return;
      }

      syncingScrollRef.current = true;
      top.scrollLeft = matrix.scrollLeft;
      syncingScrollRef.current = false;
    };

    top.addEventListener("scroll", handleTopScroll, { passive: true });
    matrix.addEventListener("scroll", handleMatrixScroll, { passive: true });
    window.addEventListener("resize", updateTopScrollWidth);

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateTopScrollWidth);
    observer?.observe(matrix);
    const table = matrix.querySelector("table");
    if (table) {
      observer?.observe(table);
    }

    updateTopScrollWidth();

    return () => {
      top.removeEventListener("scroll", handleTopScroll);
      matrix.removeEventListener("scroll", handleMatrixScroll);
      window.removeEventListener("resize", updateTopScrollWidth);
      observer?.disconnect();
    };
  }, [classes.length, gradeId, search, stageId, subjects.length]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">مصفوفة الإسنادات</h2>
          <p className="mt-1 text-xs text-slate-500">
            الفصول صفوف والمواد أعمدة
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {matchingAssignments.length} إسناد
          </span>
          {incompleteCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              {incompleteCount} غير مكتملة
            </span>
          ) : null}
          {overCount > 0 ? (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
              {overCount} تجاوز
            </span>
          ) : null}
          {unassignedCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
              {unassignedCount} غير مسند
            </span>
          ) : null}
          {sharedCount > 0 ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
              {sharedCount} مشترك
            </span>
          ) : null}
        </div>
      </div>

      {selectedTeacher ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-sky-50/60 px-5 py-3 text-xs font-bold text-slate-600">
          <span className="text-slate-900">{selectedTeacher.name}</span>
          <span>
            المسند {selectedTeacher.assignedLoad} من {selectedTeacher.maxWeeklyLoad}
          </span>
          <span className={selectedTeacherRemaining !== null && selectedTeacherRemaining < 0 ? "text-rose-700" : "text-teal-700"}>
            {selectedTeacherRemaining !== null && selectedTeacherRemaining < 0
              ? `تجاوز ${Math.abs(selectedTeacherRemaining)}`
              : selectedTeacherRemaining === 0
                ? "مكتمل"
                : `متبقي ${selectedTeacherRemaining}`}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-5 py-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-[11px] font-bold text-slate-500 sm:flex-none">
          <span>المرحلة</span>
          <select
            value={stageId}
            onChange={(event) => setStageId(event.target.value as TimetableV3StageId | "")}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#3478B8] focus:ring-2 focus:ring-[#3478B8]/10"
          >
            <option value="">جميع المراحل</option>
            {stageOptions.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-[11px] font-bold text-slate-500 sm:flex-none">
          <span>الصف</span>
          <select
            value={gradeId}
            onChange={(event) => setGradeId(event.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#3478B8] focus:ring-2 focus:ring-[#3478B8]/10"
          >
            <option value="">جميع الصفوف</option>
            {gradeOptions.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {classes.length === 0 || subjects.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-slate-400">
          لا توجد بيانات مطابقة للعرض الشبكي.
        </div>
      ) : (
        <>
          <div
            ref={topScrollRef}
            className="mx-5 mt-3 overflow-x-auto overflow-y-hidden rounded-lg border border-slate-100 bg-slate-50"
            aria-label="التمرير الأفقي لمصفوفة الإسنادات"
          >
            <div
              ref={topScrollSpacerRef}
              className="h-2"
              style={{ width: "1px" }}
              aria-hidden="true"
            />
          </div>

          <div ref={matrixScrollRef} className="overflow-auto">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky right-0 top-0 z-30 min-w-48 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-right text-xs font-black text-white">
                الفصل
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="sticky top-0 z-20 min-w-48 border-b border-l border-slate-200 bg-slate-950 px-3 py-3 text-center text-xs font-black text-white"
                >
                  {subject.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => (
              <tr key={classItem.id}>
                <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-white px-4 py-3 align-top">
                  <div className="font-black text-slate-900">
                    {classItem.name}
                  </div>
                  {(classIssues.get(classItem.id)?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {classIssues.get(classItem.id)?.length} تنبيه
                      </span>
                    </div>
                  ) : null}
                  {(() => {
                    const capacityIssue = (classIssues.get(classItem.id) ?? []).find(
                      (issue) =>
                        issue.code === "CLASS_SLOT_CAPACITY_EXCEEDED" ||
                        issue.code === "CLASS_FULL_DENSITY",
                    );
                    if (!capacityIssue) {
                      return null;
                    }
                    return (
                      <div className="mt-1 text-[10px] font-bold text-rose-700">
                        {capacityIssue.code === "CLASS_FULL_DENSITY"
                          ? "ممتلئ"
                          : capacityIssue.evidence.required !== undefined && capacityIssue.evidence.capacity !== undefined
                            ? `تجاوز سعة الفصل +${Math.max(0, capacityIssue.evidence.required - capacityIssue.evidence.capacity)}`
                            : "تجاوز سعة الفصل"}
                      </div>
                    );
                  })()}
                </td>
                {subjects.map((subject) => {
                  const cell = assignmentsByCell.get(
                    `${classItem.id}:${subject.id}`,
                  ) ?? [];
                  const total = cell.reduce(
                    (sum, assignment) => sum + assignment.assignedLessons,
                    0,
                  );
                  const required = requiredByCell.get(
                    `${classItem.id}:${subject.id}`,
                  );
                  const delta = required === undefined
                    ? null
                    : required - total;
                  const issues = cellIssues.get(
                    `${classItem.id}:${subject.id}`,
                  ) ?? [];
                  const capacityIssue = issues.find((issue) =>
                    issue.code === "CLASS_SLOT_CAPACITY_EXCEEDED" ||
                    issue.code === "CLASS_FULL_DENSITY",
                  );

                  return (
                    <td
                      key={subject.id}
                      className={[
                        "min-w-48 border-b border-l border-slate-100 p-2 align-top",
                        teacherId && cell.some((assignment) => assignment.teacherId === teacherId)
                          ? "bg-sky-100/80"
                          : cell.length
                          ? "bg-sky-50/60"
                          : "bg-slate-50/60",
                      ].join(" ")}
                    >
                      {cell.length ? (
                        <div className="space-y-1.5">
                          {cell.map((assignment) => (
                            <button
                              key={assignment.id}
                              type="button"
                              onClick={() => onSelectTeacher(assignment.teacherId)}
                              className={[
                                "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2 py-2 text-right transition hover:border-[#3478B8] hover:bg-sky-50",
                                teacherId && assignment.teacherId !== teacherId
                                  ? "border-slate-100 opacity-40"
                                  : "border-sky-100",
                              ].join(" ")}
                              title="فتح عرض المعلم"
                            >
                              <span className="max-w-32 truncate text-[11px] font-black text-slate-800">
                                {assignment.teacherName}
                              </span>
                              <span className="shrink-0 text-[10px] font-black text-teal-700">
                                {assignment.assignedLessons} حصص
                              </span>
                            </button>
                          ))}
                          {cell.length > 1 ? (
                            <div className="text-left text-[10px] font-bold text-slate-500">
                              الإجمالي {total} حصة
                            </div>
                          ) : null}
                          {required !== undefined ? (
                            <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                              {delta !== null && delta === 0 ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">مكتمل</span>
                              ) : delta !== null && delta > 0 ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">متبقي {delta}</span>
                              ) : delta !== null ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">تجاوز {Math.abs(delta)}</span>
                              ) : null}
                              {cell.length > 1 ? (
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">مشترك</span>
                              ) : null}
                            </div>
                          ) : null}
                          {capacityIssue ? (
                            <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              {capacityIssue.code === "CLASS_FULL_DENSITY"
                                ? "ممتلئ"
                                : capacityIssue.evidence.required !== undefined && capacityIssue.evidence.capacity !== undefined
                                  ? `تجاوز سعة الفصل +${Math.max(0, capacityIssue.evidence.required - capacityIssue.evidence.capacity)}`
                                  : "تجاوز سعة الفصل"}
                            </span>
                          ) : null}
                          {issues.some((issue) => issue.proven) && !capacityIssue ? (
                            <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              تعارض مؤكد
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex min-h-16 flex-col items-center justify-center gap-1 text-center text-slate-300">
                          <span>—</span>
                          {required !== undefined && required > 0 ? (
                            <span className="text-[10px] font-bold text-slate-500">غير مسند</span>
                          ) : null}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </>
      )}
    </section>
  );
}

function TeacherHeader(
  props: {
    teacher: Teacher;
  },
) {
  const remaining =
    props.teacher.maxWeeklyLoad -
    props.teacher.assignedLoad;

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (
          props.teacher.assignedLoad /
          Math.max(
            1,
            props.teacher.maxWeeklyLoad,
          )
        ) *
          100,
      ),
    );

  return (
    <section className="rounded-3xl border border-[#D7ECF7] bg-[#F4FBFE] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {
              props.teacher.name
            }
          </h2>

          <div className="mt-1 text-sm text-slate-500">
            {
              props.teacher.specialty ||
              "بدون تخصص"
            }
          </div>
        </div>

        <div className="text-left">
          <div className="text-2xl font-bold text-[#3478B8]">
            {
              props.teacher.assignedLoad
            }
            /
            {
              props.teacher.maxWeeklyLoad
            }
          </div>

          <div className="text-xs text-slate-500">
            النصاب الأسبوعي
          </div>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#3478B8] transition-all"
          style={{
            width:
              `${percent}%`,
          }}
        />
      </div>

      <div className="mt-2 text-xs font-medium text-slate-500">
        {remaining >=
        0
          ? `المتبقي ${remaining} حصة`
          : `تجاوز النصاب بـ ${Math.abs(
              remaining,
            )} حصة`}
      </div>
    </section>
  );
}

function Field(
  props: {
    label: string;
    children:
      React.ReactNode;
  },
) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {
          props.label
        }
      </span>

      {
        props.children
      }
    </label>
  );
}

function Center(
  props: {
    children:
      React.ReactNode;
  },
) {
  return (
    <div
      dir="rtl"
      className="grid min-h-[65vh] place-items-center px-4 text-sm text-slate-500"
    >
      {
        props.children
      }
    </div>
  );
}
