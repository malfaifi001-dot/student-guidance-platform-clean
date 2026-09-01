"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ANALYSIS_TYPE_CONFIG,
  type AssessmentAnalysisType,
  type AssessmentPeriod,
  type MultiPeriodInput,
  type PeriodScoreRow,
} from "@/lib/assessments-center/assessment-types";
import { calculateMultiPeriod } from "@/lib/assessments-center/multi-period-calculations";
import { OperationProgressPopCard } from "@/components/feedback/operation-progress-pop-card";
import { getAssessmentAudienceLabels } from "@/lib/students/student-audience-labels";

type Student = { id: string; fullName: string; grade: string | null; classroom: string | null };
type Row = PeriodScoreRow & { source: "linked" | "manual" };
type ImportRow = {
  name: string;
  values: Record<string, unknown>;
  match: {
    studentId: string | null;
    studentName: string;
    grade?: string | null;
    classroom?: string | null;
    status: string;
    candidates?: Array<{ id: string; name: string }>;
  };
};
type StudentLoadState = "idle" | "loading" | "found" | "empty" | "error";

function emptyScores(periods: AssessmentPeriod[]) {
  return Object.fromEntries(periods.map((period) => [period.id, null]));
}

export function AssessmentNewClient({ editAnalysisId, gender }: { editAnalysisId?: string; gender?: string | null } = {}) {
  const audience = getAssessmentAudienceLabels(gender);
  const router = useRouter();
  const [dataCenterAvailable, setDataCenterAvailable] = useState<boolean | null>(null);
  const [type, setType] = useState<AssessmentAnalysisType>("NAFS");
  const [periods, setPeriods] = useState<AssessmentPeriod[]>(
    ANALYSIS_TYPE_CONFIG.NAFS.defaultPeriods.map((period, order) => ({ ...period, order })),
  );
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState(`تحليل نتائج نافس لـ${audience.students}`);
  const [maximumScore, setMaximumScore] = useState("100");
  const [rows, setRows] = useState<Row[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [mode, setMode] = useState<"manual" | "excel">("manual");
  const [message, setMessage] = useState("");
  const [generationState, setGenerationState] = useState<"idle" | "validating" | "saving" | "ai" | "error">("idle");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [nameHeader, setNameHeader] = useState("");
  const [periodMap, setPeriodMap] = useState<Record<string, string>>({});
  const [studentLoadState, setStudentLoadState] = useState<StudentLoadState>("idle");
  const [studentLoadError, setStudentLoadError] = useState("");
  const [studentLoadVersion, setStudentLoadVersion] = useState(0);
  const [editLoading, setEditLoading] = useState(Boolean(editAnalysisId));
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!editAnalysisId) return;
    let active = true;
    void fetch(`/api/dashboard/assessments-center/${encodeURIComponent(editAnalysisId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("تعذر تحميل بيانات التحليل للتعديل.");
        return result.analysis.summaryJson as Record<string, unknown>;
      })
      .then((saved) => {
        if (!active) return;
        const savedType = saved.type === "MAHIROON" || saved.type === "SUBJECT_PERIODIC" ? saved.type : "NAFS";
        const savedPeriods = Array.isArray(saved.periods) && saved.periods.length
          ? saved.periods.map((period, index) => { const item = period as Record<string, unknown>; return { id: String(item.id || `P${index + 1}`), label: String(item.label || `الفترة ${index + 1}`), order: Number(item.order ?? index), date: typeof item.date === "string" ? item.date : null }; })
          : ANALYSIS_TYPE_CONFIG[savedType].defaultPeriods.map((period, order) => ({ ...period, order }));
        const savedStudents = Array.isArray(saved.students) ? saved.students as Array<Record<string, unknown>> : [];
        const savedRows: Row[] = savedStudents.map((student) => {
          const scores = savedType === "NAFS"
            ? { [savedPeriods[0]?.id || "PRE"]: student.preScore == null ? null : Number(student.preScore), [savedPeriods[1]?.id || "POST"]: student.postScore == null ? null : Number(student.postScore) }
            : (student.scores && typeof student.scores === "object" ? student.scores as Record<string, number | null> : {});
          return { studentId: typeof student.studentId === "string" && student.studentId ? student.studentId : null, studentName: String(student.studentName || ""), grade: typeof student.grade === "string" ? student.grade : String(saved.grade || ""), classroom: typeof student.classroom === "string" ? student.classroom : String(saved.classroom || ""), scores, source: typeof student.studentId === "string" && student.studentId ? "linked" : "manual" };
        });
        setType(savedType);
        setPeriods(savedPeriods);
        setTitle(String(saved.title || ""));
        setSubject(String(saved.subject || ""));
        setGrade(String(saved.grade || ""));
        setClassroom(String(saved.classroom || ""));
        setMaximumScore(String(saved.maximumScore ?? saved.totalScore ?? "100"));
        setMode(saved.inputMode === "excel" ? "excel" : "manual");
        setRows(savedRows);
        setMessage("تم تحميل بيانات التحليل المحفوظ. يمكنك تعديلها ثم حفظ التعديلات.");
        setEditLoading(false);
      })
      .catch((error) => { if (active) { setEditError(error instanceof Error ? error.message : "تعذر تحميل التحليل."); setEditLoading(false); } });
    return () => { active = false; };
  }, [editAnalysisId]);

  useEffect(() => {
    if (editAnalysisId) return;
    let active = true;
    setStudentLoadError("");
    if (grade && classroom) setStudentLoadState("loading");

    void fetch(`/api/dashboard/assessments-center?grade=${encodeURIComponent(grade)}&classroom=${encodeURIComponent(classroom)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || `تعذر تحميل ${audience.studentData}.`);
        return result;
      })
      .then((result) => {
        if (!active) return;
        setDataCenterAvailable(result.hasStudentData === true);
        setGrades(result.grades || []);
        setClassrooms(result.classrooms || []);
        if (!grade || !classroom) {
          setStudentLoadState("idle");
          return;
        }

        const students = Array.isArray(result.students) ? result.students as Student[] : [];
        if (students.length) {
          setRows(students.map((student) => ({
            studentId: student.id,
            studentName: student.fullName,
            grade: student.grade,
            classroom: student.classroom,
            scores: emptyScores(periods),
            source: "linked" as const,
          })));
          setStudentLoadState("found");
          setMessage("تم تحميل طلاب مركز البيانات. أدخل الدرجات فقط.");
        } else {
          setRows([{ studentId: null, studentName: "", grade, classroom, scores: emptyScores(periods), source: "manual" }]);
          setStudentLoadState("empty");
          setMessage(`لا توجد ${audience.studentData} لهذا الصف والفصل. يمكنك إضافة ${audience.students} يدويًا أو رفع ملف Excel.`);
        }
      })
      .catch((error) => {
        if (!active) return;
        const errorMessage = error instanceof Error ? error.message : `تعذر تحميل ${audience.studentData}.`;
        setStudentLoadState("error");
        setStudentLoadError(errorMessage);
        setMessage(errorMessage);
      });

    return () => { active = false; };
  }, [editAnalysisId, grade, classroom, studentLoadVersion, periods]);

  function changeType(next: AssessmentAnalysisType) {
    setType(next);
    setPeriods(ANALYSIS_TYPE_CONFIG[next].defaultPeriods.map((period, order) => ({ ...period, order })));
    setRows([]);
    setTitle(next === "NAFS" ? "تحليل نتائج نافس" : next === "MAHIROON" ? "تحليل نتائج ماهرون" : "تحليل فصلي");
  }

  function addPeriod() {
    setPeriods((current) => [...current, { id: `P${Date.now()}`, label: `الفترة ${current.length + 1}`, order: current.length }]);
  }

  function addManualRow() {
    setRows((current) => [...current, { studentId: null, studentName: "", grade, classroom, scores: emptyScores(periods), source: "manual" }]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_row, rowIndex) => rowIndex !== index));
  }

  function updateRow(index: number, update: Partial<Row>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));
  }

  function updateScore(index: number, periodId: string, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index
      ? { ...row, scores: { ...row.scores, [periodId]: value === "" ? null : Number(value) } }
      : row));
  }

  async function parseExcel(file: File) {
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/dashboard/assessments-center/import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setImportRows(result.rows);
      setImportHeaders(result.headers);
      setNameHeader(result.nameHeader);
      setPeriodMap(Object.fromEntries(periods.map((period) => [
        period.id,
        result.headers.find((header: string) => header === period.label || header.toLowerCase().includes(period.id.toLowerCase())) || "",
      ])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    } finally {
      setUploading(false);
    }
  }

  function applyImport() {
    const imported: Row[] = importRows.map((item) => ({
      studentId: item.match.studentId,
      studentName: item.match.studentName || item.name,
      grade: item.match.grade || grade,
      classroom: item.match.classroom || classroom,
      source: item.match.studentId ? "linked" : "manual",
      scores: Object.fromEntries(periods.map((period) => {
        const value = periodMap[period.id] ? Number(item.values[periodMap[period.id]]) : NaN;
        return [period.id, Number.isFinite(value) ? value : null];
      })),
    }));
    setRows(imported);
    setMode("manual");
    setUploadOpen(false);
    setMessage("تمت تعبئة شبكة الدرجات. راجع الصفوف غير المرتبطة قبل الحفظ.");
  }

  const normalized: PeriodScoreRow[] = rows.map(({ source: _source, ...row }) => row);
  const input = useMemo<MultiPeriodInput>(() => ({
    type,
    title,
    subject,
    grade,
    classroom,
    maximumScore: Number(maximumScore),
    inputMode: mode,
    periods,
    students: normalized,
  }), [type, title, subject, grade, classroom, maximumScore, mode, periods, normalized]);
  const snapshot = useMemo(() => {
    try { return calculateMultiPeriod(input); } catch { return null; }
  }, [input]);

  async function save() {
    if (generationState === "saving" || generationState === "ai") return;
    setGenerationState("validating");
    const max = Number(maximumScore);
    if (!subject.trim() || !grade.trim() || !classroom.trim() || !periods.length || !rows.length || !Number.isFinite(max) || max <= 0) {
      setMessage(`أكمل المادة والصف والفصل والدرجة الكلية وأضف ${audience.student} واحدًا على الأقل.`);
      setGenerationState("idle");
      return;
    }
    if (rows.some((row) => !row.studentName.trim())) {
      setMessage(`أدخل اسم كل ${audience.student} قبل الحفظ.`);
      setGenerationState("idle");
      return;
    }
    if (rows.some((row) => Object.values(row.scores).some((score) => score !== null && (!Number.isFinite(score) || score < 0 || score > max)))) {
      setMessage("كل درجة يجب أن تكون بين صفر والدرجة الكلية.");
      setGenerationState("idle");
      return;
    }
    setGenerationState("saving");
    let response: Response;
    try {
      response = await fetch(editAnalysisId ? `/api/dashboard/assessments-center/${encodeURIComponent(editAnalysisId)}` : "/api/dashboard/assessments-center", {
        method: editAnalysisId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editAnalysisId ? { input: { type, title, subject, grade, classroom, maximumScore: max, inputMode: mode, periods, students: normalized } } : { type, title, subject, grade, classroom, maximumScore: max, inputMode: mode, periods, students: normalized }),
      });
    } catch {
      setGenerationState("error");
      setMessage("تعذر الاتصال بالخدمة. تحقق من الاتصال ثم أعد المحاولة.");
      return;
    }
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "تعذر حفظ التحليل.");
      setGenerationState("error");
      return;
    }
    if (editAnalysisId) {
      setGenerationState("idle");
      setMessage("تم حفظ التعديلات وإعادة حساب المؤشرات. أصبحت القراءة التربوية بحاجة إلى إعادة توليد.");
      router.push(`/dashboard/assessments-center/${editAnalysisId}`);
      return;
    }
    setGenerationState("ai");
    setMessage("تم حساب المؤشرات، وجارٍ إعداد القراءة التربوية والخطط...");
    try {
      const aiResponse = await fetch("/api/dashboard/assessments-center/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisId: result.analysisId }),
      });
      if (!aiResponse.ok) throw new Error("تعذر إعداد التحليل الذكي الآن. يمكنك إعادة التوليد من صفحة التحليل.");
      router.push(`/dashboard/assessments-center/${result.analysisId}`);
    } catch (error) {
      setGenerationState("error");
      setMessage(error instanceof Error ? error.message : "تعذر إعداد التحليل الذكي الآن.");
      router.push(`/dashboard/assessments-center/${result.analysisId}`);
    }
  }

  const statusNotice = studentLoadState === "loading"
    ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600">جارٍ التحقق من بيانات الطلاب...</div>
    : studentLoadState === "error"
      ? <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"><span>{studentLoadError}</span><button type="button" onClick={() => setStudentLoadVersion((value) => value + 1)} className="rounded-lg bg-white px-3 py-2 font-black text-rose-700">إعادة المحاولة</button></div>
      : studentLoadState === "empty"
        ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">لا توجد بيانات طلاب لهذا الصف والفصل. يمكنك إضافة الطلاب يدويًا أو رفع ملف Excel.</div>
        : null;

  if (editLoading) return <main dir="rtl" className="mx-auto max-w-7xl p-6"><p className="rounded-3xl bg-white p-6 font-bold shadow-sm">جاري تحميل بيانات التحليل للتعديل...</p></main>;
  if (editError) return <main dir="rtl" className="mx-auto max-w-7xl p-6"><p className="rounded-3xl border border-rose-200 bg-rose-50 p-6 font-bold text-rose-800">{editError}</p></main>;
  return <main dir="rtl" className="space-y-5 sm:space-y-6">
    <header className="rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700 px-4 py-4 text-white shadow-md"><p className="text-xs font-bold text-cyan-100">مركز التحاليل والاختبارات</p><h1 className="mt-1 text-2xl font-black">{editAnalysisId ? "تعديل التحليل" : "تحليل جديد"}</h1></header>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <label className="block text-sm font-black">نوع التحليل<select value={type} onChange={(event) => changeType(event.target.value as AssessmentAnalysisType)} className="mt-2 h-12 w-full rounded-xl border px-3"><option value="NAFS">اختبار نافس</option><option value="MAHIROON">اختبار ماهرون</option><option value="SUBJECT_PERIODIC">تحليل فصلي لمادة</option></select></label>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان التحليل" className="h-11 rounded-xl border px-3" />
        <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="المادة" className="h-11 rounded-xl border px-3" />
        {dataCenterAvailable === false ? <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="الصف" className="h-11 rounded-xl border px-3" /> : <select value={grade} onChange={(event) => { setGrade(event.target.value); setClassroom(""); }} className="h-11 rounded-xl border px-3"><option value="">اختر الصف</option>{grades.map((value) => <option key={value}>{value}</option>)}</select>}
        {dataCenterAvailable === false ? <input value={classroom} onChange={(event) => setClassroom(event.target.value)} placeholder="الفصل" className="h-11 rounded-xl border px-3" /> : <select value={classroom} onChange={(event) => setClassroom(event.target.value)} className="h-11 rounded-xl border px-3"><option value="">اختر الفصل</option>{classrooms.map((value) => <option key={value}>{value}</option>)}</select>}
        <label className="text-sm font-bold">الدرجة الكلية<input type="number" min="1" value={maximumScore} onChange={(event) => setMaximumScore(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label>
      </div>
    </section>
    <section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">طريقة إدخال البيانات</h2><div className="flex gap-2"><button type="button" onClick={() => setMode("manual")} className={`rounded-xl px-4 py-2 text-sm font-black ${mode === "manual" ? "bg-teal-700 text-white" : "bg-slate-100"}`}>إدخال يدوي</button><button type="button" onClick={() => { setMode("excel"); setUploadOpen(true); }} className={`rounded-xl px-4 py-2 text-sm font-black ${mode === "excel" ? "bg-teal-700 text-white" : "bg-slate-100"}`}>رفع ملف Excel</button></div></div></section>
<section className="results-entry-card rounded-3xl border bg-white p-3 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">الطلاب والنتائج</h2><p className="mt-1 text-sm font-bold text-slate-500">{rows.length} طالباً · {periods.length} فترة</p></div><div className="flex w-full gap-2 sm:w-auto"><button type="button" onClick={addManualRow} className="min-h-11 flex-1 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 sm:flex-none">إضافة طالب</button>{ANALYSIS_TYPE_CONFIG[type].allowPeriodEdit ? <button type="button" onClick={addPeriod} className="min-h-11 flex-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black sm:flex-none">إضافة فترة</button> : null}</div></div>{statusNotice}<div className="results-entry-scroll mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="results-entry-table w-full min-w-[760px] text-right text-sm"><thead className="bg-teal-700 text-white"><tr><th className="sticky right-0 z-10 w-12 p-3 text-center">م</th><th className="min-w-52 p-3">اسم الطالب</th>{periods.map((period) => <th key={period.id} className="min-w-28 p-3 text-center">{period.label}</th>)}<th className="min-w-24 p-3 text-center">التغير</th><th className="min-w-28 p-3 text-center">إجراء</th></tr></thead><tbody>{rows.map((row, index) => { const first = row.scores[periods[0]?.id]; const last = row.scores[periods.at(-1)?.id || ""]; const change = first !== null && first !== undefined && last !== null && last !== undefined ? Number(last) - Number(first) : null; return <tr key={`${row.studentId || "manual"}-${index}`} className="border-t odd:bg-white even:bg-slate-50"><td className={`sticky right-0 z-[1] p-2 text-center font-black ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>{index + 1}</td><td className="p-2"><input disabled={row.source === "linked"} value={row.studentName} onChange={(event) => updateRow(index, { studentName: event.target.value })} className="h-10 w-52 rounded-lg border border-slate-300 px-2 text-[13px] font-bold focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100" /></td>{periods.map((period) => <td key={period.id} className="p-2"><input inputMode="decimal" type="number" min="0" max={maximumScore} value={row.scores[period.id] ?? ""} onChange={(event) => updateScore(index, period.id, event.target.value)} className="h-10 w-24 rounded-lg border border-slate-300 px-2 text-center text-[13px] font-bold focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100" /></td>)}<td className={`p-2 text-center font-black ${change === null ? "text-slate-400" : change > 0 ? "text-emerald-700" : change < 0 ? "text-rose-700" : "text-slate-600"}`}>{change === null ? "—" : change > 0 ? `+${change}` : change}</td><td className="p-2 text-center"><button type="button" aria-label="حذف الطالب" onClick={() => removeRow(index)} className="min-h-10 min-w-16 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100">حذف</button></td></tr>; })}</tbody></table></div>{snapshot ? <div className="mt-5 flex flex-wrap gap-3 text-sm font-black"><span className="rounded-xl bg-blue-50 px-3 py-2">آخر متوسط: {snapshot.periodMetrics.at(-1)?.average ?? "-"}%</span><span className="rounded-xl bg-emerald-50 px-3 py-2">التغير الكلي: {snapshot.firstToLastAverageChange ?? "-"}%</span></div> : null}</section>
    <div className="flex flex-col gap-4 rounded-3xl border border-teal-100 bg-teal-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-teal-900">{editAnalysisId ? "جاهز لحفظ التعديلات؟" : "جاهز لإنشاء التحليل؟"}</p><p className="mt-1 text-sm font-bold text-teal-700">{editAnalysisId ? "سيتم تحديث نفس التحليل وإعادة حساب المؤشرات دون إعادة توليد الذكاء الاصطناعي." : "سيتم حساب المؤشرات وحفظ النتائج ثم إعداد القراءة التربوية والخطط."}</p><p className="mt-2 min-h-6 font-bold text-rose-700">{message}</p></div><button type="button" disabled={generationState === "saving" || generationState === "ai"} onClick={() => void save()} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal-700 px-8 py-3 font-black text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{generationState === "validating" ? "جارٍ التحقق..." : generationState === "saving" ? "جارٍ حفظ النتائج..." : generationState === "ai" ? "جاري تحليل النتائج وإعداد التقرير..." : editAnalysisId ? "حفظ التعديلات" : "توليد التحليل"}</button></div>
    {uploadOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><section className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">رفع ملف Excel</h2><button type="button" onClick={() => setUploadOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 font-black">إغلاق</button></div><p className="mt-3 text-sm font-bold text-slate-500">اختر ملف النتائج ليتم تحليل الأعمدة ومراجعة المطابقة قبل تعبئة الشبكة.</p><input type="file" accept=".xlsx,.xls,.csv" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseExcel(file); }} className="mt-5 block w-full rounded-xl border p-3" />{uploading ? <p className="mt-4 font-bold">جارٍ قراءة الملف...</p> : null}{importRows.length ? <div className="mt-5 space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-sm font-bold">تم العثور على {importRows.length} صفاً. راجع ربط أعمدة الفترات.</div><label className="block text-sm font-bold">عمود اسم الطالب<select value={nameHeader} onChange={(event) => setNameHeader(event.target.value)} className="mt-2 h-10 w-full rounded-lg border px-2">{importHeaders.map((header) => <option key={header}>{header}</option>)}</select></label>{periods.map((period) => <label key={period.id} className="block text-sm font-bold">{period.label}<select value={periodMap[period.id] || ""} onChange={(event) => setPeriodMap({ ...periodMap, [period.id]: event.target.value })} className="mt-2 h-10 w-full rounded-lg border px-2"><option value="">عدم الربط</option>{importHeaders.map((header) => <option key={header}>{header}</option>)}</select></label>)}<p className="text-sm font-bold text-amber-700">ستبقى الصفوف غير المطابقة غير مرتبطة حتى تراجعها.</p><button type="button" onClick={applyImport} className="rounded-xl bg-teal-700 px-5 py-3 font-black text-white">تعبئة شبكة الدرجات</button></div> : null}</section></div> : null}
    <OperationProgressPopCard
      open={generationState === "validating" || generationState === "saving" || generationState === "ai"}
      title="جاري تحليل النتائج"
      message="يتم الآن حساب المؤشرات وتجهيز التحليل، الرجاء الانتظار..."
    />
  </main>;
}
