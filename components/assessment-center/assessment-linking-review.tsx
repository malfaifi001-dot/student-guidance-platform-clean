"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  RefreshCw,
  Search,
  ShieldAlert,
  Unlink,
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

type TabKey = "linked" | "review" | "unlinked";

type LinkingGroup = {
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
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNationalId(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[^\d]/g, "")
    .trim();
}

function buildGroupKey(row: AssessmentResultRow, mode: TabKey) {
  if (mode === "linked" && row.studentId) return `linked:${row.studentId}`;

  return [
    mode,
    normalizeText(row.studentName),
    normalizeNationalId(row.nationalId),
    normalizeText(row.grade),
    normalizeText(row.classroom),
  ].join("|");
}

function createGroups(rows: AssessmentResultRow[], mode: TabKey) {
  const map = new Map<string, LinkingGroup>();

  for (const row of rows) {
    const isLinked = Boolean(row.studentId);
    const isReview = !row.studentId && row.linkStatus === "AMBIGUOUS";
    const isUnlinked = !row.studentId && row.linkStatus !== "AMBIGUOUS";

    if (mode === "linked" && !isLinked) continue;
    if (mode === "review" && !isReview) continue;
    if (mode === "unlinked" && !isUnlinked) continue;

    const key = buildGroupKey(row, mode);
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        rowIds: [row.id],
        studentName:
          mode === "linked" ? row.matchedStudentName || row.studentName : row.studentName,
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
  }

  return Array.from(map.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "ar")
  );
}

function scoreCandidate(group: LinkingGroup, student: StudentCandidate) {
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
  return [
    student.fullName,
    student.nationalId ? `هوية: ${student.nationalId}` : null,
    student.grade ? `صف: ${student.grade}` : null,
    student.classroom ? `فصل: ${student.classroom}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
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

  const [activeTab, setActiveTab] = useState<TabKey>("review");
  const [globalSearch, setGlobalSearch] = useState("");
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>({});

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  const linkedGroups = useMemo(() => createGroups(rows, "linked"), [rows]);
  const reviewGroups = useMemo(() => createGroups(rows, "review"), [rows]);
  const unlinkedGroups = useMemo(() => createGroups(rows, "unlinked"), [rows]);

  const linkedRowsCount = rows.filter((row) => row.studentId).length;
  const reviewRowsCount = rows.filter(
    (row) => !row.studentId && row.linkStatus === "AMBIGUOUS"
  ).length;
  const unlinkedRowsCount = rows.filter(
    (row) => !row.studentId && row.linkStatus !== "AMBIGUOUS"
  ).length;

  const currentGroups =
    activeTab === "linked"
      ? linkedGroups
      : activeTab === "review"
        ? reviewGroups
        : unlinkedGroups;

  const filteredGroups = currentGroups.filter((group) => {
    const query = normalizeText(globalSearch);
    if (!query) return true;

    const searchable = normalizeText(
      `${group.studentName} ${group.nationalId || ""} ${group.grade || ""} ${
        group.classroom || ""
      } ${group.subjects.join(" ")}`
    );

    return searchable.includes(query);
  });

  function getCandidates(group: LinkingGroup) {
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

    return (scored.length ? scored.map((item) => item.student) : students).slice(0, 20);
  }

  function handleAutoLink() {
    confirmAction({
      title: "إعادة محاولة الربط التلقائي؟",
      description:
        "سيحاول النظام ربط النتائج غير المربوطة أو التي تحتاج مراجعة مع طلاب مركز البيانات.",
      variant: "info",
      confirmLabel: "إعادة الربط",
      errorTitle: "تعذر إعادة الربط",
      run: async () => {
        const response = await fetch(
          `/api/dashboard/assessment-center/${analysis.id}/student-linking/auto`,
          { method: "PATCH" }
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر إعادة محاولة الربط.");
        }

        return {
          title: "اكتملت محاولة الربط",
          description: `تم ربط ${data.linkedCount || 0} نتيجة إضافية تلقائيًا.`,
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  function handleLink(group: LinkingGroup) {
    const studentId = selectedStudents[group.key];
    const student = students.find((item) => item.id === studentId);

    if (!student) return;

    confirmAction({
      title: "تأكيد ربط الطالب",
      description: `سيتم ربط ${group.rowsCount} نتيجة للطالب "${group.studentName}" بالطالب "${student.fullName}".`,
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
          description: `تم ربط ${data.updatedCount || group.rowsCount} نتيجة.`,
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  function handleUnlink(group: LinkingGroup) {
    confirmAction({
      title: "إلغاء ربط الطالب؟",
      description: `سيتم إلغاء ربط ${group.rowsCount} نتيجة للطالب "${group.studentName}".`,
      variant: "warning",
      confirmLabel: "إلغاء الربط",
      errorTitle: "تعذر إلغاء الربط",
      run: async () => {
        const response = await fetch(
          `/api/dashboard/assessment-center/${analysis.id}/student-linking`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "UNLINK",
              rowIds: group.rowIds,
            }),
          }
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر إلغاء الربط.");
        }

        return {
          title: "تم إلغاء الربط",
          description: `تم إلغاء ربط ${data.updatedCount || group.rowsCount} نتيجة.`,
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  const tabs = [
    {
      key: "linked" as const,
      label: "نتائج مربوطة",
      value: linkedRowsCount,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      key: "review" as const,
      label: "تحتاج مراجعة",
      value: reviewRowsCount,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    },
    {
      key: "unlinked" as const,
      label: "غير مربوطة",
      value: unlinkedRowsCount,
      className: "border-slate-200 bg-white text-slate-700",
    },
  ];

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

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            مراجعة ربط الطلاب
          </h1>

          <p className="mt-4 text-base font-bold text-cyan-50/90">
            {analysis.title}
          </p>
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-cyan-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-cyan-950">
                إعادة محاولة الربط التلقائي
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-cyan-900">
                يحاول النظام ربط النتائج غير المربوطة أو التي تحتاج مراجعة فقط.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutoLink}
              disabled={processing || reviewRowsCount + unlinkedRowsCount === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة الربط
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">إجمالي النتائج</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{rows.length}</p>
          </article>

          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-[1.7rem] border p-5 text-right shadow-sm transition hover:shadow-md",
                tab.className,
                activeTab === tab.key ? "ring-2 ring-cyan-400" : "",
              ].join(" ")}
            >
              <p className="text-sm font-black">{tab.label}</p>
              <p className="mt-3 text-4xl font-black">{tab.value}</p>
            </button>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="ابحث بالاسم أو الهوية أو الصف أو الفصل أو المادة..."
              className="h-12 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
            />
          </div>
        </section>

        <section className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                لا توجد نتائج في هذا التصنيف
              </h2>
            </div>
          ) : null}

          {filteredGroups.map((group) => (
            <article
              key={group.key}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === "linked" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        مربوط
                      </span>
                    ) : activeTab === "review" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        يحتاج مراجعة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        <Link2 className="h-3.5 w-3.5" />
                        غير مربوط
                      </span>
                    )}

                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                      {group.rowsCount} نتيجة
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-black text-slate-950">
                    {group.studentName}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm font-bold text-slate-500 md:grid-cols-2">
                    <p>الهوية: {group.nationalId || "غير موجودة"}</p>
                    <p>الصف: {group.grade || "غير محدد"}</p>
                    <p>الفصل: {group.classroom || "غير محدد"}</p>
                    <p>
                      المواد:{" "}
                      {group.subjects.length ? group.subjects.join("، ") : "غير محدد"}
                    </p>
                  </div>

                  {group.linkReason ? (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-600">
                      {group.linkReason}
                    </p>
                  ) : null}
                </div>

                {activeTab === "linked" ? (
                  <button
                    type="button"
                    onClick={() => handleUnlink(group)}
                    disabled={processing}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 xl:w-[190px]"
                  >
                    <Unlink className="h-4 w-4" />
                    إلغاء الربط
                  </button>
                ) : (
                  <div className="w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 xl:w-[430px]">
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
                      value={selectedStudents[group.key] || ""}
                      onChange={(event) =>
                        setSelectedStudents((current) => ({
                          ...current,
                          [group.key]: event.target.value,
                        }))
                      }
                      className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                    >
                      <option value="">اختر الطالب الصحيح</option>
                      {getCandidates(group).map((student) => (
                        <option key={student.id} value={student.id}>
                          {getCandidateLabel(student)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedStudents[group.key] || processing}
                      onClick={() => handleLink(group)}
                      className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <UserCheck className="h-4 w-4" />
                      ربط بالطالب المحدد
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}