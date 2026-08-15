"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type Project = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;

  counts: {
    teachers: number;
    classes: number;
    subjects: number;
    assignments: number;
  };
};

export function TimetableV3ProjectsHome() {
  const [
    projects,
    setProjects,
  ] = useState<Project[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(
    () => {
      void fetch(
        "/api/dashboard/principal/timetable-v3/projects",
      )
        .then(
          async (response) => {
            const data =
              await response.json();

            if (
              response.ok &&
              data?.success
            ) {
              setProjects(
                data.projects ??
                [],
              );
            }
          },
        )
        .finally(
          () =>
            setLoading(
              false,
            ),
        );
    },
    [],
  );

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            الجدول الدراسي
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Timetable V3
          </p>
        </div>

        <Link
          href="/dashboard/timetable-v3/new"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          مشروع جديد
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          جاري التحميل...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            لا توجد مشاريع بعد
          </h2>

          <Link
            href="/dashboard/timetable-v3/new"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            إنشاء أول مشروع
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map(
            (project) => (
              <Link
                key={
                  project.id
                }
                href={`/dashboard/timetable-v3/${project.id}/setup`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <h2 className="font-semibold text-slate-950">
                  {
                    project.name
                  }
                </h2>

                <div className="mt-1 text-sm text-slate-500">
                  {
                    project.academicYear
                  }
                  {" · "}
                  {
                    project.semester
                  }
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <Metric
                    label="فصول"
                    value={
                      project
                        .counts
                        .classes
                    }
                  />

                  <Metric
                    label="مواد"
                    value={
                      project
                        .counts
                        .subjects
                    }
                  />

                  <Metric
                    label="معلمون"
                    value={
                      project
                        .counts
                        .teachers
                    }
                  />
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Metric(
  props: {
    label: string;
    value: number;
  },
) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-3">
      <div className="text-lg font-bold text-slate-900">
        {props.value}
      </div>

      <div className="text-xs text-slate-500">
        {props.label}
      </div>
    </div>
  );
}