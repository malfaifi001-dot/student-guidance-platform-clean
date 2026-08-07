"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type TeacherRow = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
  isActive: boolean;
  userId: string | null;

  _count: {
    assignments: number;
    dailyAbsences: number;
    originalSubstitutions: number;
    assignedSubstitutions: number;
    supervisionAssignments: number;
  };
};

type Props = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  initialTeachers: TeacherRow[];
};

type EditableTeacher = {
  name: string;
  specialty: string;
  maxWeeklyLoad: number;
  isActive: boolean;
};

function toEditable(
  teacher: TeacherRow,
): EditableTeacher {
  return {
    name: teacher.name,
    specialty:
      teacher.specialty ?? "",
    maxWeeklyLoad:
      teacher.maxWeeklyLoad,
    isActive:
      teacher.isActive,
  };
}

export function TimetableV2TeachersWorkspace({
  project,
  initialTeachers,
}: Props) {
  const router =
    useRouter();

  const [
    teachers,
    setTeachers,
  ] = useState(
    initialTeachers,
  );

  const [
    drafts,
    setDrafts,
  ] = useState<
    Record<
      string,
      EditableTeacher
    >
  >(
    Object.fromEntries(
      initialTeachers.map(
        (teacher) => [
          teacher.id,
          toEditable(teacher),
        ],
      ),
    ),
  );

  const [
    newTeacher,
    setNewTeacher,
  ] = useState<EditableTeacher>({
    name: "",
    specialty: "",
    maxWeeklyLoad: 24,
    isActive: true,
  });

  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(
    null,
  );

  const [
    message,
    setMessage,
  ] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const activeCount =
    useMemo(
      () =>
        teachers.filter(
          (teacher) =>
            teacher.isActive,
        ).length,
      [teachers],
    );

  const totalCapacity =
    useMemo(
      () =>
        teachers
          .filter(
            (teacher) =>
              teacher.isActive,
          )
          .reduce(
            (sum, teacher) =>
              sum +
              teacher.maxWeeklyLoad,
            0,
          ),
      [teachers],
    );

  const apiPath =
    `/api/dashboard/principal/timetable-v2/projects/${project.id}/teachers`;

  const updateDraft = (
    teacherId: string,
    patch: Partial<EditableTeacher>,
  ) => {
    setDrafts(
      (current) => ({
        ...current,

        [teacherId]: {
          ...current[
            teacherId
          ],
          ...patch,
        },
      }),
    );
  };

  const saveTeacher =
    async (
      teacherId: string,
    ) => {
      const draft =
        drafts[teacherId];

      if (!draft) {
        return;
      }

      try {
        setBusyId(
          teacherId,
        );

        setMessage(null);

        const response =
          await fetch(
            apiPath,
            {
              method: "PATCH",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  teacherId,
                  ...draft,
                }),
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
            data?.error ||
              "تعذر حفظ المعلم.",
          );
        }

        const teacher =
          data.teacher as TeacherRow;

        setTeachers(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                teacher.id
                  ? teacher
                  : item,
            ),
        );

        setDrafts(
          (current) => ({
            ...current,
            [teacher.id]:
              toEditable(
                teacher,
              ),
          }),
        );

        setMessage({
          tone: "success",
          text: `تم حفظ بيانات ${teacher.name}.`,
        });

        router.refresh();
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof
            Error
              ? error.message
              : "تعذر حفظ المعلم.",
        });
      } finally {
        setBusyId(null);
      }
    };

  const addTeacher =
    async () => {
      try {
        setBusyId("new");
        setMessage(null);

        const response =
          await fetch(
            apiPath,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  newTeacher,
                ),
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
            data?.error ||
              "تعذر إضافة المعلم.",
          );
        }

        const teacher =
          data.teacher as TeacherRow;

        setTeachers(
          (current) => [
            ...current,
            teacher,
          ],
        );

        setDrafts(
          (current) => ({
            ...current,
            [teacher.id]:
              toEditable(
                teacher,
              ),
          }),
        );

        setNewTeacher({
          name: "",
          specialty: "",
          maxWeeklyLoad: 24,
          isActive: true,
        });

        setMessage({
          tone: "success",
          text: `تمت إضافة ${teacher.name}.`,
        });

        router.refresh();
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof
            Error
              ? error.message
              : "تعذر إضافة المعلم.",
        });
      } finally {
        setBusyId(null);
      }
    };

  const deleteTeacher =
    async (
      teacher: TeacherRow,
    ) => {
      try {
        setBusyId(
          `delete:${teacher.id}`,
        );

        setMessage(null);

        const response =
          await fetch(
            apiPath,
            {
              method: "DELETE",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  teacherId:
                    teacher.id,
                }),
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
            data?.error ||
              "تعذر حذف المعلم.",
          );
        }

        setTeachers(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                teacher.id,
            ),
        );

        setDrafts(
          (current) => {
            const next = {
              ...current,
            };

            delete next[
              teacher.id
            ];

            return next;
          },
        );

        setMessage({
          tone: "success",
          text: `تم حذف ${teacher.name}.`,
        });

        router.refresh();
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof
            Error
              ? error.message
              : "تعذر حذف المعلم.",
        });
      } finally {
        setBusyId(null);
      }
    };

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl space-y-6 pb-16"
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
              الخطوة 2
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              المعلمون
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {project.name}
              {" • "}
              {project.academicYear}
              {" • "}
              {project.semester}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/timetable-v2/${project.id}`,
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            العودة للمشروع
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-500">
              إجمالي المعلمين
            </div>

            <div className="mt-1 text-2xl font-black text-slate-950">
              {teachers.length}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-bold text-emerald-700">
              النشطون
            </div>

            <div className="mt-1 text-2xl font-black text-slate-950">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <div className="text-xs font-bold text-teal-700">
              الطاقة الأسبوعية
            </div>

            <div className="mt-1 text-2xl font-black text-slate-950">
              {totalCapacity}
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-5 py-4 text-sm font-bold",
            message.tone ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">
            إضافة معلم
          </h2>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            يمكنك إضافة المعلمين الآن أو تعديل الصفوف الافتراضية التي أُنشئت مع المشروع.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr_1.2fr_180px_120px]">
          <input
            value={
              newTeacher.name
            }
            onChange={(
              event,
            ) =>
              setNewTeacher(
                (current) => ({
                  ...current,
                  name:
                    event.target
                      .value,
                }),
              )
            }
            placeholder="اسم المعلم"
            className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-teal-500"
          />

          <input
            value={
              newTeacher.specialty
            }
            onChange={(
              event,
            ) =>
              setNewTeacher(
                (current) => ({
                  ...current,
                  specialty:
                    event.target
                      .value,
                }),
              )
            }
            placeholder="التخصص"
            className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-teal-500"
          />

          <input
            type="number"
            min={1}
            max={60}
            value={
              newTeacher.maxWeeklyLoad
            }
            onChange={(
              event,
            ) =>
              setNewTeacher(
                (current) => ({
                  ...current,
                  maxWeeklyLoad:
                    Number(
                      event.target
                        .value,
                    ) || 0,
                }),
              )
            }
            aria-label="الحد الأعلى للحصص"
            className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-teal-500"
          />

          <button
            type="button"
            disabled={
              busyId === "new"
            }
            onClick={
              addTeacher
            }
            className="h-11 rounded-xl bg-teal-700 px-5 font-black text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {busyId === "new"
              ? "جاري..."
              : "إضافة"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 lg:px-7">
          <h2 className="font-black text-slate-950">
            قائمة المعلمين
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            عدّل البيانات ثم اضغط حفظ في نفس الصف.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right">
                  #
                </th>

                <th className="px-4 py-3 text-right">
                  اسم المعلم
                </th>

                <th className="px-4 py-3 text-right">
                  التخصص
                </th>

                <th className="px-4 py-3 text-center">
                  الحد الأسبوعي
                </th>

                <th className="px-4 py-3 text-center">
                  الحالة
                </th>

                <th className="px-4 py-3 text-center">
                  الإسنادات
                </th>

                <th className="px-4 py-3 text-center">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody>
              {teachers.map(
                (
                  teacher,
                  index,
                ) => {
                  const draft =
                    drafts[
                      teacher.id
                    ] ??
                    toEditable(
                      teacher,
                    );

                  const deleteBusy =
                    busyId ===
                    `delete:${teacher.id}`;

                  const saveBusy =
                    busyId ===
                    teacher.id;

                  return (
                    <tr
                      key={
                        teacher.id
                      }
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={
                            draft.name
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDraft(
                              teacher.id,
                              {
                                name:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 font-bold outline-none focus:border-teal-500"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={
                            draft.specialty
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDraft(
                              teacher.id,
                              {
                                specialty:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="مثال: رياضيات"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-teal-500"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={
                            draft.maxWeeklyLoad
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDraft(
                              teacher.id,
                              {
                                maxWeeklyLoad:
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ) ||
                                  0,
                              },
                            )
                          }
                          className="mx-auto block h-10 w-24 rounded-xl border border-slate-200 px-3 text-center font-black outline-none focus:border-teal-500"
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(
                              teacher.id,
                              {
                                isActive:
                                  !draft.isActive,
                              },
                            )
                          }
                          className={[
                            "rounded-full px-3 py-1.5 text-xs font-black transition",
                            draft.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {draft.isActive
                            ? "نشط"
                            : "موقوف"}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-center font-black text-slate-700">
                        {
                          teacher
                            ._count
                            .assignments
                        }
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            disabled={
                              saveBusy
                            }
                            onClick={() =>
                              saveTeacher(
                                teacher.id,
                              )
                            }
                            className="h-9 rounded-xl bg-teal-700 px-4 text-xs font-black text-white transition hover:bg-teal-800 disabled:opacity-50"
                          >
                            {saveBusy
                              ? "..."
                              : "حفظ"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/timetable-v2/${project.id}/assignments?teacherId=${teacher.id}`,
                              )
                            }
                            className="h-9 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-700 transition hover:bg-violet-100"
                          >
                            مشاركة الإسناد
                          </button>

                          <button
                            type="button"
                            disabled={
                              deleteBusy
                            }
                            onClick={() =>
                              deleteTeacher(
                                teacher,
                              )
                            }
                            className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            {deleteBusy
                              ? "..."
                              : "حذف"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-black text-slate-950">
              بعد اكتمال بيانات المعلمين
            </div>

            <div className="mt-1 text-xs leading-6 text-slate-600">
              الخطوة التالية ستكون الإسناد: ربط كل مادة في كل فصل بالمعلم وعدد الحصص.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/timetable-v2/${project.id}`,
              )
            }
            className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-black text-white"
          >
            العودة لمساحة المشروع
          </button>
        </div>
      </section>
    </div>
  );
}