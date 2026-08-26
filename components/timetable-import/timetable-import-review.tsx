"use client";

import type { TimetableImportResult } from "@/lib/timetable-import/timetable-import-types";

export function TimetableImportReview({
  result,
  onConfirm,
  saving = false,
  feedback,
}: {
  result: TimetableImportResult;
  onConfirm?: () => void | Promise<void>;
  saving?: boolean;
  feedback?: string;
}) {
  const errors = result.issues.filter((issue) => issue.severity === "ERROR");
  const classroomSlotCounts = new Map<string, number>();
  for (const entry of result.entries) {
    const classroomName = entry.classroomName?.trim();
    if (!classroomName) continue;
    const key = `${classroomName.toLocaleLowerCase("ar")}\u0000${entry.day.trim().toLocaleLowerCase("ar")}\u0000${entry.period}`;
    classroomSlotCounts.set(key, (classroomSlotCounts.get(key) ?? 0) + 1);
  }

  return (
    <section dir="rtl" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">مراجعة الجدول المستورد</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">لن يصبح الجدول تشغيليًا قبل المراجعة والتأكيد.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{result.entries.length} حصة</span>
      </div>
      {result.warnings.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {errors.length ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{errors.length} مشكلة تحتاج إلى مراجعة قبل التأكيد.</div> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[900px] w-full text-right text-sm">
          <thead><tr>
            <th className="px-3 py-2">المعلم</th><th className="px-3 py-2">اليوم</th><th className="px-3 py-2">الحصة</th><th className="px-3 py-2">المادة</th><th className="px-3 py-2">الصف</th><th className="px-3 py-2">الفصل</th><th className="px-3 py-2">البيانات المكتشفة</th><th className="px-3 py-2">الثقة</th>
          </tr></thead>
          <tbody>{result.entries.map((entry, index) => {
            const classroomName = entry.classroomName?.trim();
            const classroomKey = classroomName ? `${classroomName.toLocaleLowerCase("ar")}\u0000${entry.day.trim().toLocaleLowerCase("ar")}\u0000${entry.period}` : "";
            const hasClassroomCollision = Boolean(classroomName && classroomSlotCounts.get(classroomKey)! > 1);
            return <tr key={`${entry.teacherName}-${entry.day}-${entry.period}-${index}`} className={`border-t border-slate-100 ${hasClassroomCollision ? "bg-amber-50/60" : ""}`}>
              <td className="px-3 py-2 font-bold">{entry.teacherName || "—"}</td><td className="px-3 py-2">{entry.day || "—"}</td><td className="px-3 py-2">{Number.isFinite(entry.period) ? entry.period : "—"}</td><td className="px-3 py-2">{entry.subjectName || "—"}</td><td className="px-3 py-2">{entry.gradeName || "—"}</td><td className="px-3 py-2">{entry.classroomName || "—"}{hasClassroomCollision ? <span className="mr-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">تعارض فصل</span> : null}</td><td className="max-w-[280px] px-3 py-2 text-xs text-slate-600">{entry.rawCell || "—"}</td><td className="px-3 py-2">{entry.confidence !== null && entry.confidence !== undefined ? `${Math.round(entry.confidence * 100)}%${entry.confidence < 0.55 ? " · مراجعة" : ""}` : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <button type="button" disabled={errors.length > 0 || !onConfirm || saving} onClick={() => void onConfirm?.()} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        {saving ? "جاري إنشاء المشروع..." : "اعتماد وإنشاء مشروع"}
      </button>
      {feedback ? <p className="text-sm font-bold text-rose-700">{feedback}</p> : null}
    </section>
  );
}
