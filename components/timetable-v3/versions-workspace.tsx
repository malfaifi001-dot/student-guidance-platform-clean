"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { timetableV3StatusLabel } from "@/lib/timetable-v3/display-labels";

type Version = {
  id: string;
  version: number;
  status: string;
  isCurrent: boolean;
  score: number;
  completeness: number;
  hardViolations: number;
  softPenalty: number;
  durationMs: number;
  engine: string;
  generatedAt: string;
  createdAt: string;
  sessions: number;
  fingerprint: string;
  isFresh: boolean;
};

type Workspace = {
  project: { id: string; name: string; academicYear: string; semester: string; schoolName: string };
  current: Version | null;
  versions: Version[];
  teachers: Array<{ id: string; name: string; specialty: string | null }>;
  printScopes: {
    stage: { available: boolean; reason: string; options: Array<{ id: string; label: string }> };
    grade: { available: boolean; reason: string; options: Array<{ id: string; label: string }> };
  };
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });

export function TimetableV3VersionsWorkspace({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(workspace.current?.id ?? workspace.versions[0]?.id ?? "");
  const [printMode, setPrintMode] = useState<"full" | "stage" | "grade" | "teacher">("full");
  const [teacherId, setTeacherId] = useState(workspace.teachers[0]?.id ?? "");
  const [publishConfirm, setPublishConfirm] = useState<Version | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Version | null>(null);
  const [deleting, setDeleting] = useState(false);
  const printAction = usePrintExportAction();
  const selected = useMemo(() => workspace.versions.find((item) => item.id === selectedId) ?? null, [selectedId, workspace.versions]);

  async function publishVersion(version: Version) {
    setPublishing(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/dashboard/principal/timetable-v3/projects/${workspace.project.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: version.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "تعذر اعتماد الجدول ونشره.");
      setPublishConfirm(null);
      setFeedback("تم اعتماد الجدول ونشره بنجاح.");
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر اعتماد الجدول ونشره.");
    } finally {
      setPublishing(false);
    }
  }

  async function deleteVersion(version: Version) {
    setDeleting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/dashboard/principal/timetable-v3/projects/${workspace.project.id}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: version.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "تعذر حذف النسخة.");
      setDeleteConfirm(null);
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر حذف النسخة.");
    } finally {
      setDeleting(false);
    }
  }

  function printSelected() {
    if (!selected) return;
    const query = new URLSearchParams({ scheduleId: selected.id, mode: printMode, print: "1" });
    if (printMode === "teacher" && teacherId) query.set("teacherId", teacherId);
    void printAction.runPrintExport({
      printUrl: `/print/timetable-v3/${workspace.project.id}?${query.toString()}`,
      blockedTitle: "طباعة الجدول",
      blockedMessage: "افتح معاينة الطباعة ثم اختر الطابعة أو الحفظ كملف.",
    });
  }

  const modeUnavailable =
    (printMode === "stage" && !workspace.printScopes.stage.available) ||
    (printMode === "grade" && !workspace.printScopes.grade.available);

  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8">
        <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">نسخ الجدول</h1>
      </header>

      <section className="rounded-[2rem] border border-[#CFE5F3] bg-white p-5 shadow-sm">
        <div className="text-xs font-bold text-[#3478B8]">النسخة الحالية</div>
        {workspace.current ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950">النسخة {workspace.current.version}</h2>
              <p className="mt-1 text-sm text-slate-500">{timetableV3StatusLabel(workspace.current.status)} · {workspace.current.sessions} حصة</p>
              <p className="mt-1 text-xs text-slate-400">{dateFormatter.format(new Date(workspace.current.generatedAt))}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="rounded-xl bg-white px-3 py-2 font-bold text-slate-700">النتيجة {workspace.current.score}</span>
              <span className="rounded-xl bg-white px-3 py-2 font-bold text-slate-700">{workspace.current.hardViolations} مخالفة صارمة</span>
              <span className={`rounded-xl px-3 py-2 font-bold ${workspace.current.isFresh ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{workspace.current.isFresh ? "محدثة" : "قديمة"}</span>
            </div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">لا توجد نسخة محفوظة بعد.</p>}
      </section>

      {workspace.current?.status === "PUBLISHED" ? <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">النسخة المنشورة</div> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">السجل</h2>
          <div className="mt-4 space-y-2">
            {workspace.versions.map((version) => (
              <button key={version.id} type="button" onClick={() => setSelectedId(version.id)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-right transition ${selectedId === version.id ? "border-[#8FC4E3] bg-[#F4FAFD]" : "border-slate-100 hover:border-slate-200"}`}>
                <div>
                  <div className="font-bold text-slate-900">النسخة {version.version} {version.isCurrent ? <span className="mr-2 text-xs text-[#3478B8]">الحالية</span> : null}</div>
                  <div className="mt-1 text-xs text-slate-500">{dateFormatter.format(new Date(version.generatedAt))} · {timetableV3StatusLabel(version.status)}</div>
                </div>
                <div className="text-left text-xs text-slate-500"><div>{version.sessions} حصة</div><div className="mt-1">النتيجة {version.score}</div></div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">تصدير ومشاركة</h2>
          <p className="mt-1 text-xs text-slate-500">النسخة المحددة: {selected ? selected.version : "—"}</p>

          {selected ? (
            <button type="button" onClick={() => router.push(`/dashboard/timetable-v3/${workspace.project.id}/preview?${new URLSearchParams({ scheduleId: selected.id }).toString()}`)} className="mt-4 h-11 w-full rounded-xl border border-[#C9DFEC] bg-white px-5 text-sm font-bold text-[#3478B8] transition hover:bg-[#F4FAFD]">
              معاينة النسخة المحددة
            </button>
          ) : null}

          {selected && selected.status !== "PUBLISHED" ? (
            <button type="button" onClick={() => setPublishConfirm(selected)} disabled={!selected.isFresh || selected.completeness < 100 || selected.hardViolations > 0} className="mt-3 h-11 w-full rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
              اعتماد ونشر النسخة المحددة
            </button>
          ) : null}
          {selected && selected.status !== "PUBLISHED" ? <button type="button" onClick={() => setDeleteConfirm(selected)} className="mt-3 h-11 w-full rounded-xl border border-rose-200 px-5 text-sm font-bold text-rose-700 hover:bg-rose-50">حذف النسخة</button> : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {([
              ["full", "الجدول كامل"],
              ["stage", "حسب المرحلة"],
              ["grade", "حسب الصف"],
              ["teacher", "حسب المعلم"],
            ] as const).map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setPrintMode(mode)} className={`h-10 rounded-xl border text-xs font-bold ${printMode === mode ? "border-[#3478B8] bg-[#EEF7FC] text-[#3478B8]" : "border-slate-200 text-slate-600"}`}>{label}</button>
            ))}
          </div>

          {printMode === "teacher" ? (
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
              {workspace.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.specialty ? ` — ${teacher.specialty}` : ""}</option>)}
            </select>
          ) : null}

          {modeUnavailable ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
              {printMode === "stage" ? workspace.printScopes.stage.reason : workspace.printScopes.grade.reason}
            </div>
          ) : null}

          <button type="button" onClick={printSelected} disabled={!selected || modeUnavailable || (printMode === "teacher" && !teacherId)} className="mt-4 h-11 w-full rounded-xl bg-[#3478B8] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">طباعة الجدول A3</button>

          {selected ? (
            <a href={`/api/dashboard/principal/timetable-v3/projects/${workspace.project.id}/versions/export?${new URLSearchParams({ scheduleId: selected.id }).toString()}`} className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-[#C9DFEC] bg-white px-5 text-sm font-bold text-[#3478B8] transition hover:bg-[#F4FAFD]">تصدير Excel</a>
          ) : null}
        </section>
      </div>

      {feedback ? <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feedback}</div> : null}
      {publishConfirm ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm"><div dir="rtl" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black text-slate-950">اعتماد الجدول ونشره</h2><p className="mt-3 text-sm leading-7 text-slate-600">سيتم اعتماد هذه النسخة كجدول المدرسة المنشور، وسيبدأ التشغيل اليومي بالاعتماد عليها.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPublishConfirm(null)} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">إلغاء</button><button type="button" onClick={() => void publishVersion(publishConfirm)} disabled={publishing} className="h-11 flex-1 rounded-xl bg-[#3478B8] px-4 text-sm font-bold text-white disabled:opacity-50">اعتماد ونشر</button></div></div></div> : null}
      {deleteConfirm ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm"><div dir="rtl" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black text-slate-950">حذف النسخة</h2><p className="mt-3 text-sm leading-7 text-slate-600">سيتم حذف النسخة غير المنشورة وبياناتها. لا يمكن التراجع عن هذا الإجراء.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setDeleteConfirm(null)} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">إلغاء</button><button type="button" onClick={() => void deleteVersion(deleteConfirm)} disabled={deleting} className="h-11 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-50">حذف النسخة</button></div></div></div> : null}
      <PrintExportPopCard modal={printAction.modal} onClose={printAction.closeModal} onOpenFallback={printAction.openFallbackPrintUrl} />
    </main>
  );
}
