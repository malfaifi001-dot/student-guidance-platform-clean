"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { timetableV3StatusLabel } from "@/lib/timetable-v3/display-labels";

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
  status?: string;
  publishedSchedule: {
    id: string;
    version: number;
    status: string;
    sessions: number;
  } | null;
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
            الجدول الدراسي
          </h1>
        </div>

        <Link
          href="/dashboard/timetable-v3/new"
          className="rounded-xl bg-[#3478B8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2D6BA5]"
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
            className="mt-5 inline-flex rounded-xl bg-[#3478B8] px-5 py-3 text-sm font-bold text-white hover:bg-[#2D6BA5]"
          >
            إنشاء أول مشروع
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className={`group rounded-[1.75rem] border bg-white p-5 shadow-sm transition hover:shadow-md ${project.publishedSchedule ? "border-[#B9DDEE]" : "border-slate-200 hover:border-slate-300"}`}
            >
              <Link href={`/dashboard/timetable-v3/${project.id}/setup`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-950">{project.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    {timetableV3StatusLabel(project.status ?? "DRAFT")}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500">{project.academicYear} · {project.semester}</div>
              </Link>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric label="فصول" value={project.counts.classes} />
                <Metric label="مواد" value={project.counts.subjects} />
                <Metric label="معلمون" value={project.counts.teachers} />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600">
                {project.publishedSchedule ? (
                  <>
                    <div className="font-bold text-emerald-700">النسخة المنشورة: {project.publishedSchedule.version}</div>
                    <div className="mt-1">{project.publishedSchedule.sessions} حصة</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/dashboard/timetable-v3/${project.id}/setup`} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-[#8FC4E3]">فتح المشروع</Link>
                      <Link href={`/dashboard/timetable-v3/${project.id}/operations`} className="inline-flex rounded-lg bg-[#3478B8] px-3 py-2 font-bold text-white hover:bg-[#2D6BA5]">حصص الانتظار</Link>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="font-semibold text-amber-700">لا توجد نسخة منشورة لهذا المشروع.</div>
                    <Link href={`/dashboard/timetable-v3/${project.id}/setup`} className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-[#8FC4E3]">فتح المشروع</Link>
                  </div>
                )}
              </div>
            </article>
          ))}
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
