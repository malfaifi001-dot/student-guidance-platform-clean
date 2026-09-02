"use client";

import { useState } from "react";
import { getAssessmentGenderCopy } from "@/lib/assessments-center/gender-copy";

type Student = { id: string; name: string; completed: boolean };
type Question = { id: string; label: string; options: string[] };

export function LearningStylePublicForm({
  token,
  students,
  questions,
  gender,
}: {
  token: string;
  students: Student[];
  questions: Question[];
  gender?: string | null;
}) {
  const copy = getAssessmentGenderCopy(gender);
  const [student, setStudent] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"name" | "quiz" | "done">("name");
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  function start() {
    if (!student) {
      setError(copy.chooseStudent);
      return;
    }
    const selected = students.find((item) => item.id === student);
    if (!selected || selected.completed) return;
    setAnswers({});
    setError("");
    setIndex(0);
    setStep("quiz");
  }

  function backToStudentSelection() {
    setStudent("");
    setAnswers({});
    setIndex(0);
    setError("");
    setStep("name");
  }

  async function submit() {
    if (Object.keys(answers).length !== 10) {
      setError("أجب عن الأسئلة العشرة أولًا.");
      return;
    }
    const response = await fetch(`/api/assessments-center/learning-style/${token}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentKey: student, answers }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "تعذر إرسال الإجابة.");
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h2 className="text-2xl font-black text-emerald-800">تم إرسال الإجابات بنجاح</h2>
        <p className="mt-3 font-bold text-emerald-700">{copy.completionThanks}</p>
      </section>
    );
  }

  if (step === "name") {
    return (
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <label htmlFor="learning-style-student" className="text-xl font-black">{copy.chooseStudent}</label>
        <p className="mt-2 text-sm font-bold text-slate-500">{copy.female ? "اختاري اسمكِ" : "اختر اسمك"} من القائمة، ولا يمكن اختيار من ظهرت بجانبه «تمت الإجابة» مرة أخرى.</p>
        <select
          id="learning-style-student"
          value={student}
          onChange={(event) => { setStudent(event.target.value); setError(""); }}
          className="mt-5 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base font-bold outline-none focus:border-teal-600"
        >
          <option value="">{copy.chooseStudent}</option>
          {students.map((item) => (
            <option key={item.id} value={item.id} disabled={item.completed}>
              {item.name}{item.completed ? " — تمت الإجابة" : ""}
            </option>
          ))}
        </select>
        <p className="mt-4 min-h-6 font-bold text-rose-700">{error}</p>
        <button type="button" onClick={start} className="mt-2 min-h-12 w-full rounded-xl bg-teal-700 px-5 py-3 font-black text-white">
          {copy.start}
        </button>
      </section>
    );
  }

  const question = questions[index];
  if (!question) return <section className="rounded-3xl border bg-white p-6 font-bold">لا توجد أسئلة متاحة.</section>;

  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex justify-between gap-3 text-sm font-black text-teal-700">
        <span>السؤال {index + 1} من 10</span>
        <button type="button" onClick={backToStudentSelection} className="text-slate-500">{copy.change}</button>
      </div>
      <h2 className="mt-5 text-xl font-black leading-9">{question.label}</h2>
      <div className="mt-5 grid gap-3">
        {question.options.map((option) => (
          <button key={option} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))} className={`min-h-12 rounded-xl border px-4 text-right font-bold ${answers[question.id] === option ? "border-teal-600 bg-teal-50" : "border-slate-200"}`}>
            {option}
          </button>
        ))}
      </div>
      <p className="mt-4 min-h-6 font-bold text-rose-700">{error}</p>
      <div className="mt-5 flex justify-between gap-3">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded-xl bg-slate-100 px-5 py-3 font-bold disabled:opacity-40">السابق</button>
        {index < 9 ? (
          <button type="button" onClick={() => { if (!answers[question.id]) { setError("اختر إجابة أولًا."); return; } setError(""); setIndex(index + 1); }} className="rounded-xl bg-teal-700 px-6 py-3 font-black text-white">التالي</button>
        ) : (
          <button type="button" onClick={() => void submit()} className="rounded-xl bg-teal-700 px-6 py-3 font-black text-white">إرسال الإجابات</button>
        )}
      </div>
    </section>
  );
}
