"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, User2 } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/analytics-events";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";

type Student = {
  id: string;
  fullName: string;
  nationalId: string | null;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  guardian: {
    name: string;
    phone: string | null;
  } | null;
};

type SmartStudentPickerProps = {
  value?: string;
  onChange?: (student: Student | null) => void;
  placeholder?: string;
};

export function SmartStudentPicker({
  value,
  onChange,
  placeholder = "ابحث باسم الطالب أو رقم الهوية...",
}: SmartStudentPickerProps) {
  const [query, setQuery] = useState(value || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function searchStudents() {
      if (query.trim().length < 1) {
        setStudents([]);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/dashboard/students/search?query=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();
        setStudents(data.students || []);
      } catch {
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(searchStudents, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const emptyState = useMemo(() => {
    if (loading) return "جاري البحث...";
    if (query.length < 1) return "ابدأ بكتابة اسم الطالب";
    if (students.length === 0) return "لا توجد نتائج";
    return null;
  }, [loading, query, students]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpened(true);
          }}
          onFocus={() => setOpened(true)}
          placeholder={placeholder}
          className="w-full rounded-[1.5rem] border border-slate-200 bg-white py-4 pr-12 pl-4 text-sm shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />

        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-sky-600" />
        ) : null}
      </div>

      {opened ? (
        <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
          {emptyState ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">
              {emptyState}
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student);
                    setQuery(student.fullName);
                    setOpened(false);
                    trackAnalyticsEvent(ANALYTICS_EVENTS.STUDENT_PICKER_USED, {
                      source: "smart_student_picker",
                      result: "selected",
                    });
                    onChange?.(student);
                  }}
                  className="flex w-full items-start gap-4 border-b border-slate-100 p-5 text-right transition hover:bg-sky-50"
                >
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <User2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">
                        {student.fullName}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                        {student.gender === "FEMALE"
                          ? "طالبة"
                          : student.gender === "MALE"
                            ? "طالب"
                            : "غير محدد"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {student.stage ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {student.stage}
                        </span>
                      ) : null}

                      {student.grade ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {student.grade}
                        </span>
                      ) : null}

                      {student.classroom ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {student.classroom}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                      <div>
                        <span className="font-bold text-slate-700">
                          ولي الأمر:
                        </span>{" "}
                        {student.guardian?.name || "غير متوفر"}
                      </div>

                      <div>
                        <span className="font-bold text-slate-700">
                          الجوال:
                        </span>{" "}
                        {student.guardian?.phone || "غير متوفر"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {selectedStudent ? (
        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">الطالب المحدد</p>

              <h3 className="mt-1 text-xl font-black text-slate-900">
                {selectedStudent.fullName}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {selectedStudent.stage ? (
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600">
                    {selectedStudent.stage}
                  </span>
                ) : null}

                {selectedStudent.grade ? (
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600">
                    {selectedStudent.grade}
                  </span>
                ) : null}

                {selectedStudent.classroom ? (
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600">
                    {selectedStudent.classroom}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl bg-white px-5 py-4 text-sm shadow-sm">
              <p className="font-bold text-slate-700">
                {selectedStudent.guardian?.name || "ولي أمر غير متوفر"}
              </p>

              <p className="mt-1 text-slate-500">
                {selectedStudent.guardian?.phone || "لا يوجد رقم"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
