"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  UserRound,
  X,
} from "lucide-react";

type StudentSearchItem = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  stage?: string | null;
  grade?: string | null;
  classroom?: string | null;
  isActive: boolean;
  guardian?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  _count: {
    cases: number;
  };
};

type Props = {
  students: StudentSearchItem[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function formatStudentMeta(student: StudentSearchItem) {
  return [
    student.stage,
    student.grade,
    student.classroom ? `فصل ${student.classroom}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildSearchText(student: StudentSearchItem) {
  return normalizeText(
    [
      student.fullName,
      student.nationalId,
      student.stage,
      student.grade,
      student.classroom,
      student.guardian?.name,
      student.guardian?.phone,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function StudentRecordSearchClient({ students }: Props) {
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const keyword = normalizeText(query);

    if (!keyword) {
      return students;
    }

    return students.filter((student) => {
      return buildSearchText(student).includes(keyword);
    });
  }, [query, students]);

  return (
    <>
      <section className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">
              المرجع الشامل للموجه الطلابي
            </p>

            <h1 className="mt-3 text-4xl font-black">
              ملف الطالب في مكان واحد
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              اكتب اسم الطالب أو الصف أو ولي الأمر، وستظهر النتائج مباشرة.
            </p>

            <Link
              href="/dashboard/comprehensive-reference/demo"
              className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              عرض نموذج تخيلي
            </Link>
          </div>

          <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-xs font-black text-sky-100">النتائج الظاهرة</p>
            <p className="mt-2 text-4xl font-black">
              {formatCount(filteredStudents.length)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب للبحث: اسم الطالب، رقم الهوية، الصف، الفصل، أو ولي الأمر..."
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-14 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            autoComplete="off"
          />

          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200 transition hover:text-slate-700"
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-400">
          <span>
            إجمالي الطلاب: {formatCount(students.length)}
          </span>

          <span>·</span>

          <span>
            نتائج البحث: {formatCount(filteredStudents.length)}
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredStudents.map((student) => (
          <article
            key={student.id}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <UserRound className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {student.isActive ? "نشط" : "غير نشط"}
                  </span>

                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    {formatCount(student._count.cases)} حالات
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-black leading-8 text-slate-950">
                  {student.fullName}
                </h2>

                <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                  {formatStudentMeta(student) || "لا توجد بيانات صفية"}
                </p>

                {student.guardian ? (
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-400">
                    ولي الأمر: {student.guardian.name || "غير محدد"}
                    {student.guardian.phone ? ` · ${student.guardian.phone}` : ""}
                  </p>
                ) : null}

                <Link
                  href={`/dashboard/comprehensive-reference/${student.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  فتح المرجع الشامل للموجه الطلابي
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}

        {filteredStudents.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center xl:col-span-2">
            <Search className="mx-auto h-12 w-12 text-slate-300" />

            <h2 className="mt-4 text-xl font-black text-slate-800">
              لا توجد نتائج مطابقة
            </h2>

            <p className="mt-2 text-sm font-bold text-slate-500">
              جرّب كتابة جزء من الاسم أو الصف أو رقم ولي الأمر.
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
