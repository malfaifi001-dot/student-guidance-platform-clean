"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

type Workspace = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
};

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

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
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
    </div>
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
