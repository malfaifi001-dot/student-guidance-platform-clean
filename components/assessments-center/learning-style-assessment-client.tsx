"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssessmentGenderCopy } from "@/lib/assessments-center/gender-copy";
import { type LearningStage } from "@/lib/assessments-center/learning-style";

type Student = {
  id: string;
  fullName: string;
  grade: string | null;
  classroom: string | null;
};

type Row = {
  participantKey: string;
  studentId: string | null;
  studentName: string;
  grade: string;
  classroom: string;
  source: "DATA_CENTER" | "MANUAL";
  participation?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  learningStyle?: string | null;
};

const UI = {
  title: "\u062a\u062d\u0644\u064a\u0644 \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u062a\u0639\u0644\u0645",
  stage: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629",
  grade: "\u0627\u0644\u0635\u0641",
  classroom: "\u0627\u0644\u0641\u0635\u0644",
  analysisTitle: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u062d\u0644\u064a\u0644",
  chooseStage: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0631\u062d\u0644\u0629",
  chooseGrade: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0635\u0641",
  dataMethod: "\u0637\u0631\u064a\u0642\u0629 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
  manualAdd: "\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0644\u0628 \u064a\u062f\u0648\u064a\u064b\u0627",
  add: "\u0625\u0636\u0627\u0641\u0629",
  studentName: "\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628",
  studentsResults: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0648\u0627\u0644\u0646\u062a\u0627\u0626\u062c",
  number: "\u0645",
  source: "\u0627\u0644\u0645\u0635\u062f\u0631",
  participation: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629",
  preferredStyle: "\u0627\u0644\u0646\u0645\u0637 \u0627\u0644\u0645\u0641\u0636\u0644",
  dataCenter: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0644\u0627\u0628",
  manual: "\u0625\u062f\u062e\u0627\u0644 \u064a\u062f\u0648\u064a",
  completed: "\u0645\u0643\u062a\u0645\u0644",
  inProgress: "\u0642\u064a\u062f \u0627\u0644\u0625\u062c\u0627\u0628\u0629",
  notStarted: "\u0644\u0645 \u064a\u0628\u062f\u0623",
  noStudents: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u0645\u0633\u062c\u0644\u0648\u0646 \u0644\u0647\u0630\u0627 \u0627\u0644\u0635\u0641 \u0648\u0627\u0644\u0641\u0635\u0644",
  atLeastOne: "\u0623\u0636\u0641 \u0637\u0627\u0644\u0628\u064b\u0627 \u0648\u0627\u062d\u062f\u064b\u0627 \u0648\u0623\u0643\u0645\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
  duplicate: "\u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0648\u062c\u0648\u062f \u0628\u0627\u0644\u0641\u0639\u0644 \u0636\u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.",
  loadFailed: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0644\u0627\u0628.",
  analysisLoadFailed: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644.",
  saveFailed: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u062a\u0642\u064a\u064a\u0645.",
  back: "\u0631\u062c\u0648\u0639",
  create: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631",
  saving: "\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0641\u0638...",
  other: "\u0623\u062e\u0631\u0649",
  customGrade: "\u0627\u0643\u062a\u0628 \u0627\u0644\u0635\u0641",
} as const;

const stages = [
  { key: "PRIMARY" as LearningStage, label: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629" },
  { key: "MIDDLE" as LearningStage, label: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u0645\u062a\u0648\u0633\u0637\u0629" },
  { key: "SECONDARY" as LearningStage, label: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0629" },
];

const gradesByStage: Record<LearningStage, string[]> = {
  PRIMARY: [
    "\u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    "\u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    "\u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    "\u0627\u0644\u0631\u0627\u0628\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    "\u0627\u0644\u062e\u0627\u0645\u0633 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    "\u0627\u0644\u0633\u0627\u062f\u0633 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
    UI.other,
  ],
  MIDDLE: ["\u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u062a\u0648\u0633\u0637", "\u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u0645\u062a\u0648\u0633\u0637", "\u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0645\u062a\u0648\u0633\u0637", UI.other],
  SECONDARY: ["\u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u062b\u0627\u0646\u0648\u064a", "\u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u062b\u0627\u0646\u0648\u064a", "\u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u062b\u0627\u0646\u0648\u064a", UI.other],
};

const newKey = () => "manual-" + Date.now() + "-" + Math.random().toString(36).slice(2);
const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function LearningStyleAssessmentClient({ onBack, editAnalysisId, gender }: { onBack: () => void; editAnalysisId?: string; gender?: string | null }) {
  const router = useRouter();
  const copy = getAssessmentGenderCopy(gender);
  const [title, setTitle] = useState<string>(UI.title);
  const [stage, setStage] = useState<LearningStage | "">("");
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");
  const [grades, setGrades] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [name, setName] = useState("");
  const [customGrade, setCustomGrade] = useState("");
  const [showNames, setShowNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editAnalysisId) return;
    void fetch("/api/dashboard/assessments-center/" + encodeURIComponent(editAnalysisId), { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        const saved = result.analysis.summaryJson as Record<string, unknown>;
        setTitle(String(saved.title || UI.title));
        setStage((saved.stage || "") as LearningStage);
        setGrade(String(saved.grade || ""));
        setClassroom(String(saved.classroom || ""));
        setShowNames(Boolean(saved.showStudentNames));
        setRows((Array.isArray(saved.students) ? saved.students : []).map((value) => {
          const item = value as Record<string, unknown>;
          return {
            participantKey: String(item.studentKey || item.participantKey || newKey()),
            studentId: typeof item.studentId === "string" ? item.studentId : null,
            studentName: String(item.studentName || ""),
            grade: String(item.grade || saved.grade || ""),
            classroom: String(item.classroom || saved.classroom || ""),
            source: item.source === "MANUAL" ? "MANUAL" : "DATA_CENTER",
            participation: item.completed ? "COMPLETED" : item.answers ? "IN_PROGRESS" : "NOT_STARTED",
            learningStyle: typeof item.learningStyle === "string" ? item.learningStyle : null,
          };
        }));
      })
      .catch(() => setMessage(UI.analysisLoadFailed));
  }, [editAnalysisId]);

  useEffect(() => {
    if (editAnalysisId || !grade || !classroom) return;
    void fetch("/api/dashboard/assessments-center?grade=" + encodeURIComponent(grade) + "&classroom=" + encodeURIComponent(classroom), { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        setGrades(Array.isArray(result.grades) ? result.grades : []);
        setClassrooms(Array.isArray(result.classrooms) ? result.classrooms : []);
        const found = Array.isArray(result.students) ? result.students as Student[] : [];
        setRows((current) => {
          const manual = current.filter((row) => row.source === "MANUAL");
          const existing = found.map((student) => ({
            participantKey: student.id,
            studentId: student.id,
            studentName: student.fullName,
            grade: student.grade || grade,
            classroom: student.classroom || classroom,
            source: "DATA_CENTER" as const,
            participation: "NOT_STARTED" as const,
          }));
          const seen = new Set(existing.map((row) => row.studentId));
          return [...existing, ...manual.filter((row) => !row.studentId || !seen.has(row.studentId))];
        });
      })
      .catch(() => setMessage(UI.loadFailed));
  }, [classroom, editAnalysisId, grade]);

  const options = useMemo(() => stage ? Array.from(new Set([...(grades.filter((item) => item === grade)), ...gradesByStage[stage]])) : [], [grade, grades, stage]);

  function addManual() {
    const normalizedName = clean(name);
    const isOther = grade === UI.other;
    const selectedGrade = isOther ? clean(customGrade) : clean(grade);
    const storedGrade = isOther ? UI.other + ": " + selectedGrade : selectedGrade;
    if (!normalizedName || !selectedGrade) {
      setMessage(UI.studentName + " " + UI.grade);
      return;
    }
    const normalized = normalizedName.toLocaleLowerCase();
    if (rows.some((row) => row.studentName.trim().toLocaleLowerCase() === normalized && row.grade === storedGrade)) {
      setMessage(UI.duplicate);
      return;
    }
    if (rows.some((row) => row.source === "DATA_CENTER" && row.studentName.trim().toLocaleLowerCase() === normalized && row.grade === storedGrade)) {
      setMessage("\u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0648\u062c\u0648\u062f \u0628\u0627\u0644\u0641\u0639\u0644 \u0636\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0644\u0627\u0628.");
      return;
    }
    setRows((current) => [...current, { participantKey: newKey(), studentId: null, studentName: normalizedName, grade: storedGrade, classroom, source: "MANUAL", participation: "NOT_STARTED" }]);
    setName("");
    setCustomGrade("");
    setMessage("");
  }

  async function save() {
    if (!title.trim() || !stage || !grade || !classroom || !rows.length || (grade === UI.other && !customGrade.trim())) {
      setMessage(UI.atLeastOne);
      return;
    }
    setBusy(true);
    const payload = { learningStyle: true, teacherGender: gender, stage, title, grade: grade === UI.other ? UI.other + ": " + clean(customGrade) : grade, classroom, showStudentNames: showNames, students: rows };
    try {
      const response = await fetch(editAnalysisId ? "/api/dashboard/assessments-center/" + encodeURIComponent(editAnalysisId) : "/api/dashboard/assessments-center", {
        method: editAnalysisId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editAnalysisId ? { learningStyleRoster: payload } : payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error();
      router.push("/dashboard/assessments-center/" + (result.analysisId || editAnalysisId));
    } catch {
      setMessage(UI.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700 px-5 py-5 text-white shadow-md">
        <p className="font-bold text-cyan-100">{"\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u062d\u0627\u0644\u064a\u0644 \u0648\u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a"}</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 font-bold">{"\u0625\u0646\u0634\u0627\u0621 \u0627\u062e\u062a\u0628\u0627\u0631 \u0648\u062a\u062d\u062f\u064a\u062f \u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u062a\u0639\u0644\u0645 \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0644\u062f\u0649 " + copy.students}</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">{"\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629"}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="font-bold">{UI.stage}<select value={stage} onChange={(event) => { setStage(event.target.value as LearningStage); setGrade(""); setCustomGrade(""); }} className="mt-2 h-11 w-full rounded-xl border px-3"><option value="">{UI.chooseStage}</option>{stages.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="font-bold">{UI.grade}<select value={grade} onChange={(event) => { setGrade(event.target.value); setCustomGrade(""); }} disabled={!stage} className="mt-2 h-11 w-full rounded-xl border px-3"><option value="">{UI.chooseGrade}</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="font-bold">{UI.classroom}<input value={classroom} onChange={(event) => setClassroom(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label>
          <label className="font-bold">{UI.analysisTitle}<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label>
        </div>
        {grade === UI.other ? <input value={customGrade} onChange={(event) => setCustomGrade(event.target.value)} placeholder={UI.customGrade} className="mt-4 h-11 w-full rounded-xl border px-3 md:w-1/4" /> : null}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">{UI.dataMethod}</h2><button type="button" onClick={() => setManualOpen((value) => !value)} className="min-h-11 rounded-xl bg-blue-50 px-4 font-black text-blue-800">{copy.addStudent}</button></div>
        {manualOpen ? <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={UI.studentName + " " + copy.student} className="h-11 flex-1 rounded-xl border px-3" /><button type="button" onClick={addManual} className="min-h-11 rounded-xl bg-teal-700 px-5 font-black text-white">{UI.add}</button></div> : null}
        {!rows.some((row) => row.source === "DATA_CENTER") && grade && classroom ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{UI.noStudents}</p> : null}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">{UI.studentsResults}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-teal-700 text-white"><tr><th className="p-3">{UI.number}</th><th className="p-3">{UI.studentName}</th><th className="p-3">{UI.grade}</th><th className="p-3">{UI.classroom}</th><th className="p-3">{UI.source}</th><th className="p-3">{UI.participation}</th><th className="p-3">{UI.preferredStyle}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.participantKey} className="border-t"><td className="p-3">{index + 1}</td><td className="p-3 font-bold">{row.studentName}</td><td className="p-3">{row.grade}</td><td className="p-3">{row.classroom}</td><td className="p-3">{row.source === "MANUAL" ? UI.manual : UI.dataCenter}</td><td className="p-3">{row.participation === "COMPLETED" ? UI.completed : row.participation === "IN_PROGRESS" ? UI.inProgress : UI.notStarted}</td><td className="p-3">{"\u2014"}</td></tr>)}</tbody></table></div>
        <p className="mt-3 min-h-6 font-bold text-rose-700">{message}</p>
      </section>
      <div className="flex justify-end gap-3 rounded-3xl border border-teal-100 bg-teal-50/50 p-5"><button type="button" onClick={onBack} className="rounded-xl bg-slate-100 px-5 py-3 font-bold">{UI.back}</button><button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-teal-700 px-7 py-3 font-black text-white">{busy ? UI.saving : UI.create}</button></div>
    </main>
  );
}
