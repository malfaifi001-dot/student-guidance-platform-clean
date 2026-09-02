"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LEARNING_STYLE_LABELS, type LearningStyle } from "@/lib/assessments-center/learning-style";
import { getAssessmentGenderCopy } from "@/lib/assessments-center/gender-copy";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

type StudentRow = Record<string, unknown>;

const arabic = {
  loading: "\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644",
  center: "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u062d\u0627\u0644\u064a\u0644 \u0648\u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a",
  title: "\u062a\u062d\u0644\u064a\u0644 \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u062a\u0639\u0644\u0645",
  incomplete: "\u0644\u0645 \u064a\u0643\u0645\u0644",
  current: "\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
  retry: "\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
  send: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631",
  preview: "\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u062a\u062d\u0644\u064a\u0644",
  download: "\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
  participation: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629",
  complete: "\u0645\u0643\u062a\u0645\u0644",
  notStarted: "\u0644\u0645 \u064a\u0628\u062f\u0623",
  inProgress: "\u0642\u064a\u062f \u0627\u0644\u0625\u062c\u0627\u0628\u0629",
  grade: "\u0627\u0644\u0635\u0641",
  classroom: "\u0627\u0644\u0641\u0635\u0644",
  total: "\u0625\u062c\u0645\u0627\u0644\u064a",
  studentName: "\u0627\u0633\u0645",
  preferredStyle: "\u0627\u0644\u0646\u0645\u0637 \u0627\u0644\u0645\u0641\u0636\u0644",
  dash: "\u2014",
  analysisError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c.",
} as const;

export function LearningStyleManagementClient({ analysisId, gender }: { analysisId: string; gender?: string | null }) {
  const router = useRouter();
  const print = usePrintExportAction();
  const copy = getAssessmentGenderCopy(gender);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch("/api/dashboard/assessments-center/" + analysisId, { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/dashboard/assessments-center", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([detail, overview]) => {
      setSnapshot(detail.analysis?.summaryJson || null);
      setSchoolName(String(overview.profile?.schoolName || ""));
      setTeacherName(String(overview.teacherName || ""));
    }).catch(() => setMessage(arabic.analysisError));
  }, [analysisId]);

  if (!snapshot) return <main dir="rtl" className="p-6 font-bold">{arabic.loading}...</main>;

  const students = Array.isArray(snapshot.students) ? snapshot.students as StudentRow[] : [];
  const completed = students.filter((student) => student.completed === true);
  const analyzed = Number(snapshot.analyzedStudentCount || 0);
  const publicUrl = "/assessments-center/learning-style/" + String(snapshot.publicToken || "");

  async function analyze() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/dashboard/assessments-center/" + analysisId + "/learning-style/analyze", { method: "POST" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || arabic.analysisError);
    else { setSnapshot(result.summary); router.refresh(); }
    setBusy(false);
  }

  async function updatePreference(value: boolean) {
    await fetch("/api/dashboard/assessments-center/" + analysisId, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ learningStylePreference: value }) });
    setSnapshot({ ...snapshot, showStudentNames: value });
  }

  function sendWhatsApp() {
    const absoluteUrl = window.location.origin + publicUrl;
    const text = [
      "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c",
      "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u062e\u062a\u0628\u0627\u0631 \u062a\u062d\u0644\u064a\u0644 \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u062a\u0639\u0644\u0645 " + (copy.female ? "\u0644\u0644\u0637\u0627\u0644\u0628\u0627\u062a" : "\u0644\u0644\u0637\u0644\u0627\u0628") + ".",
      "",
      "\u0627\u0644\u0645\u062f\u0631\u0633\u0629: " + (schoolName || "\u0627\u0644\u0645\u062f\u0631\u0633\u0629"),
      copy.teacher + ": " + (teacherName || arabic.dash),
      "",
      copy.pleaseChoose,
      "",
      "\u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631:",
      absoluteUrl,
    ].join("\n");
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  }

  const exportUrl = "/api/dashboard/assessments-center/" + analysisId + "/export/pdf";
  const printUrl = "/dashboard/assessments-center/" + analysisId + "/print?print=1";
  const previewUrl = "/dashboard/assessments-center/" + analysisId + "/print";

  return <main dir="rtl" className="space-y-5">
    <header className="rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700 px-5 py-5 text-white shadow-md">
      <p className="font-bold text-cyan-100">{arabic.center}</p>
      <h1 className="mt-2 text-3xl font-black">{String(snapshot.title || arabic.title)}</h1>
      <p className="mt-2 font-bold">{arabic.grade}: {String(snapshot.grade || arabic.dash)} · {arabic.classroom}: {String(snapshot.classroom || arabic.dash)}</p>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4 font-bold">{arabic.total} {copy.students}<strong className="mt-1 block text-2xl">{students.length}</strong></div>
        <div className="rounded-xl bg-emerald-50 p-4 font-bold">{copy.completed}<strong className="mt-1 block text-2xl text-emerald-700">{completed.length}</strong></div>
        <div className="rounded-xl bg-amber-50 p-4 font-bold">{arabic.incomplete}<strong className="mt-1 block text-2xl text-amber-700">{students.length - completed.length}</strong></div>
      </div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 font-bold">{"\u0633\u064a\u062a\u0645 \u062a\u062d\u0644\u064a\u0644"} {completed.length} {"\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0645\u0643\u062a\u0645\u0644\u0629 \u0645\u0646 \u0623\u0635\u0644"} {students.length} {copy.students}.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={sendWhatsApp} className="min-h-11 rounded-xl bg-sky-50 px-4 py-3 font-bold text-sky-700">{arabic.send}</button>
        <button disabled={busy || !completed.length} onClick={() => void analyze()} className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white disabled:opacity-50">{busy ? arabic.loading : analyzed ? arabic.retry : arabic.current}</button>
        {analyzed ? <><Link href={previewUrl} className="min-h-11 rounded-xl bg-cyan-50 px-4 py-3 font-bold text-cyan-700">{arabic.preview}</Link><button type="button" onClick={() => void print.runPrintExport({ exportUrl, printUrl, fileName: String(snapshot.title || arabic.title) + ".pdf", blockedTitle: arabic.preview })} disabled={print.status === "loading"} className="min-h-11 rounded-xl bg-slate-100 px-4 py-3 font-bold disabled:opacity-60">{arabic.download}</button></> : null}
      </div>
      <label className="mt-5 flex items-center gap-2 font-bold"><input type="checkbox" checked={snapshot.showStudentNames === true} onChange={(event) => void updatePreference(event.target.checked)} />{copy.showStudentNames}</label>
      <p className="mt-3 font-bold text-rose-700">{message}</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">{arabic.participation}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3 font-bold">{arabic.total} {copy.students}: {students.length}</div><div className="rounded-xl bg-emerald-50 p-3 font-bold">{copy.completed}: {completed.length}</div><div className="rounded-xl bg-amber-50 p-3 font-bold">{arabic.incomplete}: {students.length - completed.length}</div></div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[520px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">{arabic.studentName} {copy.student}</th><th className="p-3">{arabic.participation}</th><th className="p-3">{arabic.preferredStyle}</th></tr></thead><tbody>{students.map((student) => <tr key={String(student.studentKey)} className="border-t"><td className="p-3 font-bold">{String(student.studentName)}</td><td className="p-3"><span className="font-bold text-slate-600">{student.completed ? arabic.complete : student.answers ? arabic.inProgress : arabic.notStarted}</span></td><td className="p-3 font-bold text-teal-700">{analyzed && student.learningStyle ? LEARNING_STYLE_LABELS[student.learningStyle as LearningStyle] || arabic.dash : arabic.dash}</td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
