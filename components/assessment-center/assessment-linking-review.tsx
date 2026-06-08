"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  Search,
  ShieldAlert,
  UserCheck,
  UsersRound,
} from "lucide-react";
import type { AssessmentResultRow } from "@/lib/assessment-center/assessment-center-types";
import {
  SmartActionFeedbackModal,
  useSmartActionFeedback,
} from "@/components/ui/smart-action-feedback";

type StudentCandidate = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

type ReviewGroup = {
  key: string;
  rowIds: string[];
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  subjects: string[];
  rowsCount: number;
  linkStatus?: string | null;
  linkReason?: string | null;
};

function normalizeArabicDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);

    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);

    return digit;
  });
}

function normalizeText(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNationalId(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[^\d]/g, "")
    .trim();
}

function buildGroupKey(row: AssessmentResultRow) {
  return [
    normalizeText(row.studentName),
    normalizeNationalId(row.nationalId),
    normalizeText(row.grade),
    normalizeText(row.classroom),
  ].join("|");
}

function buildReviewGroups(rows: AssessmentResultRow[]) {
  const map = new Map<string, ReviewGroup>();

  for (const row of rows) {
    const needsReview =
      !row.studentId ||
      row.linkStatus === "AMBIGUOUS" ||
      row.linkStatus === "UNMATCHED";

    if (!needsReview) continue;

    const key = buildGroupKey(row) || row.id;

    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        rowIds: [row.id],
        studentName: row.studentName,
        nationalId: row.nationalId,
        grade: row.grade,
        classroom: row.classroom,
        subjects: row.subject ? [row.subject] : [],
        rowsCount: 1,
        linkStatus: row.linkStatus,
        linkReason: row.linkReason,
      });

      continue;
    }

    current.rowIds.push(row.id);
    current.rowsCount += 1;

    if (row.subject && !current.subjects.includes(row.subject)) {
      current.subjects.push(row.subject);
    }

    if (row.linkStatus === "AMBIGUOUS") {
      current.linkStatus = "AMBIGUOUS";
      current.linkReason = row.linkReason;
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "ar")
  );
}

function scoreCandidate(group: ReviewGroup, student: StudentCandidate) {
  let score = 0;

  const groupName = normalizeText(group.studentName);
  const studentName = normalizeText(student.fullName);

  const groupNationalId = normalizeNationalId(group.nationalId);
  const studentNationalId = normalizeNationalId(student.nationalId);

  if (groupNationalId && studentNationalId && groupNationalId === studentNationalId) {
    score += 100;
  }

  if (groupName && studentName && groupName === studentName) {
    score += 50;
  } else if (
    groupName &&
    studentName &&
    (groupName.includes(studentName) || studentName.includes(groupName))
  ) {
    score += 25;
  }

  if (group.grade && normalizeText(group.grade) === normalizeText(student.grade)) {
    score += 10;
  }

  if (
    group.classroom &&
    normalizeText(group.classroom) === normalizeText(student.classroom)
  ) {
    score += 10;
  }

  return score;
}

function getCandidateLabel(student: StudentCandidate) {
  const parts = [
    student.fullName,
    student.nationalId ? `هوية: ${student.nationalId}` : null,
    student.grade ? `صف: ${student.grade}` : null,
    student.classroom ? `فصل: ${student.classroom}` : null,
  ].filter(Boolean);

  return parts.join(" — ");
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: text || "تعذر قراءة استجابة الخادم.",
    };
  }
}

export function AssessmentLinkingReview({
  analysis,
  rows,
  students,
}: {
  analysis: {
    id: string;
    title: string;
  };
  rows: AssessmentResultRow[];
  students: StudentCandidate[];
}) {
  const router = useRouter();

  const [queries, setQueries] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>(
    {}
  );

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  const reviewGroups = useMemo(() => buildReviewGroups(rows), [rows]);

  const linkedRowsCount = rows.filter((row) => row.studentId).length;
  const ambiguousRowsCount = rows.filter(
    (row) => row.linkStatus === "AMBIGUOUS"
  ).length;
  const unmatchedRowsCount = rows.filter(
    (row) => !row.studentId && row.linkStatus !== "AMBIGUOUS"
  ).length;

  function getCandidates(group: ReviewGroup) {
    const query = normalizeText(queries[group.key]);

    const scored = students
      .map((student) => ({
        student,
        score: scoreCandidate(group, student),
      }))
      .filter(({ student, score }) => {
        if (query) {
          const searchable = normalizeText(
            `${student.fullName} ${student.nationalId || ""} ${
              student.grade || ""
            } ${student.classroom || ""}`
          );

          return searchable.includes(query);
        }

        return score > 0;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.student.fullName.localeCompare(b.student.fullName, "ar");
      });

    const result = scored.length
      ? scored.map((item) => item.student)
      : students.slice(0, 20);

    return result.slice(0, 20);
  }

  function handleLink(group: ReviewGroup) {
    const studentId = selectedStudents[group.key];
    const student = students.find((item) => item.id === studentId);

    if (!student) return;

    confirmAction({
      title: "تأكيد ربط الطالب",
      description: `سيتم ربط ${group.rowsCount} نتيجة للطالب "${group.studentName}" بالطالب "${student.fullName}" من مركز البيانات.`,
      variant: "info",
      confirmLabel: "تأكيد الربط",
      errorTitle: "تعذر ربط الطالب",
      run: async () => {
        const response = await fetch(
          `/api/dashboard/assessment-center/${analysis.id}/student-linking`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "LINK",
              rowIds: group.rowIds,
              studentId,
            }),
          }
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر حفظ الربط.");
        }

        return {
          title: "تم حفظ الربط",
          description: `تم ربط ${data.updatedCount || group.rowsCount} نتيجة بالطالب المحدد.`,
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={processing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <main className="space-y-8">
        <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
          <Link
            href={`/dashboard/assessment-center/${analysis.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-cyan-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لتفاصيل التحليل
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
            <Link2 className="h-4 w-4" />
            Student Linking Review
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            مراجعة ربط الطلاب
          </h1>

          <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
            {analysis.title}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">إجمالي النتائج</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{rows.length}</p>
          </article>

          <article className="rounded-[1.7rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-black text-emerald-500">نتائج مربوطة</p>
            <p className="mt-3 text-4xl font-black text-emerald-700">
              {linkedRowsCount}
            </p>
          </article>

          <article className="rounded-[1.7rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-black text-amber-500">تحتاج مراجعة</p>
            <p className="mt-3 text-4xl font-black text-amber-700">
              {ambiguousRowsCount}
            </p>
          </article>

          <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">غير مربوطة</p>
            <p className="mt-3 text-4xl font-black text-slate-950">
              {unmatchedRowsCount}
            </p>
          </article>
        </section>

        {reviewGroups.length === 0 ? (
          <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-10 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-emerald-900">
              كل النتائج مربوطة
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-8 text-emerald-800">
              لا توجد نتائج تحتاج مراجعة الآن. يمكن الاعتماد على هذا التحليل
              لاحقًا عند إنشاء حالة متابعة أو برنامج علاجي.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {reviewGroups.map((group) => {
              const candidates = getCandidates(group);
              const selectedStudentId = selectedStudents[group.key] || "";

              return (
                <article
                  key={group.key}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            group.linkStatus === "AMBIGUOUS"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {group.linkStatus === "AMBIGUOUS"
                            ? "يحتاج مراجعة"
                            : "غير مربوط"}
                        </span>

                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                          {group.rowsCount} نتيجة
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black text-slate-950">
                        {group.studentName}
                      </h2>

                      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-500 md:grid-cols-2">
                        <p>رقم الهوية: {group.nationalId || "غير موجود"}</p>
                        <p>الصف: {group.grade || "غير محدد"}</p>
                        <p>الفصل: {group.classroom || "غير محدد"}</p>
                        <p>
                          المواد:{" "}
                          {group.subjects.length
                            ? group.subjects.join("، ")
                            : "غير محدد"}
                        </p>
                      </div>

                      {group.linkReason ? (
                        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
                          <ShieldAlert className="ml-2 inline h-4 w-4" />
                          {group.linkReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 xl:w-[440px]">
                      <label className="text-xs font-black text-slate-500">
                        ابحث في طلاب مركز البيانات
                      </label>

                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                          value={queries[group.key] || ""}
                          onChange={(event) =>
                            setQueries((current) => ({
                              ...current,
                              [group.key]: event.target.value,
                            }))
                          }
                          placeholder="اكتب الاسم أو الهوية أو الصف..."
                          className="h-11 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                        />
                      </div>

                      <select
                        value={selectedStudentId}
                        onChange={(event) =>
                          setSelectedStudents((current) => ({
                            ...current,
                            [group.key]: event.target.value,
                          }))
                        }
                        className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                      >
                        <option value="">اختر الطالب الصحيح</option>
                        {candidates.map((student) => (
                          <option key={student.id} value={student.id}>
                            {getCandidateLabel(student)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!selectedStudentId || processing}
                        onClick={() => handleLink(group)}
                        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <UserCheck className="h-4 w-4" />
                        ربط بالطالب المحدد
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <UsersRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                لماذا هذه الصفحة مهمة؟
              </h2>

              <p className="mt-2 text-sm font-bold leading-8 text-slate-500">
                إنشاء حالة متابعة أو برنامج علاجي لاحقًا يحتاج ربطًا صحيحًا مع
                Student ID من مركز البيانات. هذه الصفحة تمنع إنشاء تدخلات على
                أسماء غير مؤكدة أو مكررة.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}