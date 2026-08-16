"use client";

import {
  useRouter,
} from "next/navigation";

import {
  FormEvent,
  useState,
} from "react";

export function TimetableV3NewProjectForm() {
  const router =
    useRouter();

  const [
    name,
    setName,
  ] = useState(
    "الجدول الدراسي",
  );

  const [
    academicYear,
    setAcademicYear,
  ] = useState(
    "1448",
  );

  const [
    semester,
    setSemester,
  ] = useState<
    "FIRST" |
    "SECOND"
  >(
    "FIRST",
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

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/dashboard/principal/timetable-v3/projects",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,
                academicYear,
                semester,
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
          "تعذر إنشاء المشروع.",
        );
      }

      router.push(
        `/dashboard/timetable-v3/${data.project.id}/setup`,
      );
    }
    catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر إنشاء المشروع.",
      );
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto flex min-h-[68vh] w-full max-w-xl items-center px-4 py-8"
    >
      <form
        onSubmit={
          submit
        }
        className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-8">
          <p className="text-xs font-black text-[#3478B8]">الجدول الدراسي</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            مشروع جديد
          </h1>
        </div>

        <div className="space-y-5">
          <Field
            label="اسم المشروع"
          >
            <input
              value={
                name
              }
              onChange={
                (event) =>
                  setName(
                    event.target.value,
                  )
              }
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </Field>

          <Field
            label="العام الدراسي"
          >
            <input
              value={
                academicYear
              }
              onChange={
                (event) =>
                  setAcademicYear(
                    event.target.value,
                  )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </Field>

          <Field
            label="الفصل الدراسي"
          >
            <div className="grid grid-cols-2 gap-3">
              <Choice
                active={
                  semester ===
                  "FIRST"
                }
                onClick={
                  () =>
                    setSemester(
                      "FIRST",
                    )
                }
              >
                الأول
              </Choice>

              <Choice
                active={
                  semester ===
                  "SECOND"
                }
                onClick={
                  () =>
                    setSemester(
                      "SECOND",
                    )
                }
              >
                الثاني
              </Choice>
            </div>
          </Field>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            saving
          }
          className="mt-8 h-11 w-full rounded-xl bg-[#3478B8] font-bold text-white transition hover:bg-[#2D6BA5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "جاري الإنشاء..."
            : "ابدأ الإعداد"}
        </button>
      </form>
    </div>
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
      <span className="mb-2 block text-sm font-medium text-slate-700">
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

function Choice(
  props: {
    active: boolean;
    onClick: () => void;
    children:
      React.ReactNode;
  },
) {
  return (
    <button
      type="button"
      onClick={
        props.onClick
      }
      className={[
        "h-12 rounded-xl border text-sm font-semibold transition",
        props.active
          ? "border-[#3478B8] bg-[#3478B8] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#8FC4E3]",
      ].join(
        " ",
      )}
    >
      {
        props.children
      }
    </button>
  );
}
