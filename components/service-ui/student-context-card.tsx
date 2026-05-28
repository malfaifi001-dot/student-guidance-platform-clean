"use client";

import { SmartStudentPicker } from "@/components/students/smart-student-picker";

type StudentContextCardProps = {
  title?: string;
  description?: string;
  onStudentChange?: (student: unknown) => void;
};

export function StudentContextCard({
  title = "بيانات الطالب/الطالبة",
  description = "اختر الطالب من بيانات نور ليتم ربط السجل والتقارير بشكل صحيح.",
  onStudentChange,
}: StudentContextCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
      <div className="mb-6">
        <p className="text-sm font-bold text-sky-700">Student Context</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </div>

      <SmartStudentPicker onChange={onStudentChange} />
    </section>
  );
}