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
      className="mx-auto flex min-h-[72vh] w-full max-w-xl items-center px-4 py-8"
    >
      <form
        onSubmit={
          submit
        }
        className="w-full"
      >
        <div className="mb-8">
          <div className="mb-2 text-sm font-medium text-slate-500">
            Timetable V3
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
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
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-slate-900"
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
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-slate-900"
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
          className="mt-8 h-12 w-full rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
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