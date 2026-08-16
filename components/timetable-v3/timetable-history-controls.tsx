"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  TIMETABLE_HISTORY_UPDATED_EVENT,
} from "@/lib/timetable-v3/history/history-client";

type HistoryEntry = {
  id: string;
  actionType: string;
  state: string;
  actorName: string | null;
  createdAt: string;
  metadata?: unknown;
  detail?: string;
};

const labels: Record<string, string> = {
  STAGES_UPDATED: "تعديل المراحل",
  STAGE_WEEKLY_TARGET_UPDATED: "تعديل عدد الحصص الأسبوعية",
  STUDY_DAYS_UPDATED: "تعديل أيام الدراسة",
  PERIODS_UPDATED: "تعديل الحصص",
  CLASSES_UPDATED: "تعديل الفصول",
  CLASS_MAPPING_UPDATED: "تعديل ربط الفصول",
  SUBJECTS_UPDATED: "تعديل المواد",
  TEACHERS_UPDATED: "تعديل المعلمين",
  ASSIGNMENT_CREATED: "إضافة إسناد",
  ASSIGNMENT_UPDATED: "تعديل إسناد",
  ASSIGNMENT_REMOVED: "حذف إسناد",
  CONSTRAINT_CREATED: "إضافة قيد",
  CONSTRAINT_UPDATED: "تعديل قيد",
  CONSTRAINT_REMOVED: "حذف قيد",
  UNDO_APPLIED: "تراجع",
  REDO_APPLIED: "تقدم",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function summary(entry: HistoryEntry) {
  if (entry.actionType === "STAGE_WEEKLY_TARGET_UPDATED") {
    return entry.detail
      ? `تم تغيير عدد الحصص: ${entry.detail}`
      : "تم تحديث عدد الحصص الأسبوعية.";
  }
  if (entry.actionType === "ASSIGNMENT_CREATED") return "تم حفظ إسناد جديد.";
  if (entry.actionType === "ASSIGNMENT_REMOVED") return "تم حذف الإسناد.";
  return "تم حفظ التعديل على المشروع.";
}

export function TimetableV3HistoryControls({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/dashboard/principal/timetable-v3/projects/${projectId}/history`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) return;
    setHistory(data.entries ?? []);
    setCanUndo(Boolean(data.canUndo));
    setCanRedo(Boolean(data.canRedo));
  }, [projectId]);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener(TIMETABLE_HISTORY_UPDATED_EVENT, handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener(TIMETABLE_HISTORY_UPDATED_EVENT, handler);
      window.removeEventListener("focus", handler);
    };
  }, [load]);

  async function mutate(action: "UNDO" | "REDO") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/dashboard/principal/timetable-v3/projects/${projectId}/history`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "تعذر تنفيذ التعديل.");
      }
      setHistory(data.entries ?? []);
      setCanUndo(Boolean(data.canUndo));
      setCanRedo(Boolean(data.canRedo));
      setMessage(action === "UNDO" ? "تم التراجع." : "تم التقدم.");
      window.dispatchEvent(new CustomEvent(TIMETABLE_HISTORY_UPDATED_EVENT));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تنفيذ التعديل.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="relative flex flex-wrap items-center gap-2">
      <button type="button" disabled={!canUndo || busy} onClick={() => void mutate("UNDO")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="تراجع">
        تراجع
      </button>
      <button type="button" disabled={!canRedo || busy} onClick={() => void mutate("REDO")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="تقدم">
        تقدم
      </button>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-[#CFE5F3] bg-[#EEF7FC] px-3 py-1.5 text-xs font-bold text-[#3478B8]" aria-expanded={open}>
        سجل التعديلات
      </button>
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 text-sm font-bold text-slate-800">سجل التعديلات</div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {history.length ? history.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2 font-bold text-slate-700">
                  <span>{labels[entry.actionType] ?? "تعديل على المشروع"}</span>
                  {entry.state === "UNDONE" ? <span className="text-amber-600">تم التراجع</span> : null}
                </div>
                <div className="mt-1 text-slate-500">{summary(entry)}</div>
                <div className="mt-1 text-[10px] text-slate-400">{entry.actorName ? `${entry.actorName} · ` : ""}{formatDate(entry.createdAt)}</div>
              </div>
            )) : <div className="py-5 text-center text-xs text-slate-400">لا توجد تعديلات محفوظة.</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
