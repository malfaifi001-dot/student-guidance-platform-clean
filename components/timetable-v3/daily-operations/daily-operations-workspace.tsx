"use client";

import { useEffect, useMemo, useState } from "react";

type Teacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
  weeklyLoad: number;
};
type Day = { id: string; label: string; order: number };
type Period = { id: string; label: string; order: number; isBreak?: boolean };
type Session = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  dayId: string;
  dayLabel?: string;
  periodId: string;
  periodLabel?: string;
  periodOrder: number;
};
type Candidate = {
  teacherId: string;
  teacherName: string;
  specialty?: string | null;
  rank?: number;
  reasonLabels?: string[];
};
type Substitution = {
  id: string;
  status: string;
  dayId?: string;
  periodId: string;
  periodLabel?: string | null;
  className: string;
  subjectName: string;
  originalTeacherId: string;
  originalSessionId: string;
  substituteTeacher?: { id: string; name: string } | null;
  candidatesJson?: unknown;
};
type Absence = {
  id: string;
  teacherId: string;
  absenceDate: string;
  absenceType: string;
  teacher: { id: string; name: string };
  substitutions: Substitution[];
};
type Policy = {
  candidateCount: number;
  maxDailySubstitutions: number;
  maxWeeklySubstitutions: number;
  allowBeforeFirstLesson: boolean;
  allowAfterLastLesson: boolean;
  allowInsideGap: boolean;
  preferInsideGap: boolean;
  allowOnGoldenDay: boolean;
  goldenDayEmergency: boolean;
  allowAfterLateArrival: boolean;
  excludeLateArrivalDay: boolean;
  allowBeforeEarlyDeparture: boolean;
  preventConsecutiveSubstitutions: boolean;
  preventFirstPeriod: boolean;
  preventLastPeriod: boolean;
  requireMatchingSpecialty: boolean;
  preferMatchingSpecialty: boolean;
  weeklyLoadWeight: number;
  weeklyWaitingWeight: number;
  dailyWaitingWeight: number;
  gapPreferenceWeight: number;
  specialtyWeight: number;
  firstLastFairnessWeight: number;
  settingsJson: Record<string, unknown>;
};
type Dashboard = {
  project: { id: string; name: string; academicYear: string; semester: string; status: string };
  teachers: Teacher[];
  days: Day[];
  periods: Period[];
  schedule: Session[];
  policy: Policy;
  absences: Absence[];
  supervisionDuties: Array<{ id: string; title: string; dutyType: string; dayId: string; periodId?: string | null; location?: string | null; assignments: Array<{ teacher: { id: string; name: string } }> }>;
};
type PublishCandidate = {
  id: string;
  version: number;
  status: string;
  sessions: number;
  completeness: number;
  hardViolations: number;
  valid: boolean;
  isFresh: boolean;
};
type PublishedSchedule = {
  id: string;
  version: number;
  status: string;
  sessions: number;
} | null;

const absenceLabels: Record<string, string> = {
  FULL_DAY: "يوم كامل",
  SELECTED_PERIODS: "حصص محددة",
  LATE_ARRIVAL: "تأخر",
  EARLY_DEPARTURE: "انصراف مبكر",
};

function candidatesOf(value: unknown): Candidate[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidates = (value as { candidates?: unknown }).candidates;
  return Array.isArray(candidates) ? candidates.filter((item): item is Candidate => !!item && typeof item === "object" && typeof (item as Candidate).teacherId === "string") : [];
}

export function TimetableV3DailyOperationsWorkspace({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dayId, setDayId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceType, setAbsenceType] = useState("FULL_DAY");
  const [periodIds, setPeriodIds] = useState<string[]>([]);
  const [arrivalPeriodId, setArrivalPeriodId] = useState("");
  const [departurePeriodId, setDeparturePeriodId] = useState("");
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [supervision, setSupervision] = useState({ title: "", dutyType: "BREAK", dayId: "", periodId: "", location: "", teacherId: "" });
  const [publishCandidate, setPublishCandidate] = useState<PublishCandidate | null>(null);
  const [publishedSchedule, setPublishedSchedule] = useState<PublishedSchedule>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supervisionOpen, setSupervisionOpen] = useState(false);
  const [historyTeacherId, setHistoryTeacherId] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyDate, setHistoryDate] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/principal/timetable-v3/projects/${projectId}/operations`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "تعذر تحميل التشغيل اليومي.");
      const next = payload.dashboard as Dashboard;
      setDashboard(next);
      setPolicy(next.policy);
      setPublishedSchedule((payload.publishedSchedule as PublishedSchedule | null) ?? null);
      setPublishCandidate((payload.publishCandidate as PublishCandidate | null) ?? null);
      setDayId((current) => current || next.days[0]?.id || "");
      setTeacherId((current) => current || next.teachers[0]?.id || "");
      setSupervision((current) => ({ ...current, dayId: current.dayId || next.days[0]?.id || "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل التشغيل اليومي.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  async function post(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/dashboard/principal/timetable-v3/projects/${projectId}/operations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "تعذر تنفيذ العملية.");
      setMessage("تم تنفيذ العملية بنجاح.");
      await load();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تنفيذ العملية.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentSchedule() {
    if (!publishCandidate) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/principal/timetable-v3/projects/${projectId}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId: publishCandidate.id }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "تعذر اعتماد الجدول ونشره.");
      setPublishConfirm(false);
      setMessage("تم اعتماد الجدول ونشره بنجاح.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر اعتماد الجدول ونشره.");
    } finally {
      setSaving(false);
    }
  }

  const activePeriods = useMemo(() => (dashboard?.periods ?? []).filter((period) => !period.isBreak), [dashboard?.periods]);
  const daySessions = useMemo(() => (dashboard?.schedule ?? []).filter((session) => !dayId || session.dayId === dayId), [dashboard?.schedule, dayId]);
  const classes = useMemo(() => [...new Set(daySessions.map((session) => session.className))], [daySessions]);
  const subjects = useMemo(() => [...new Set(daySessions.map((session) => session.subjectName))], [daySessions]);
  const historyRows = useMemo(() => {
    const rows = (dashboard?.absences ?? []).flatMap((absence) => absence.substitutions.map((substitution) => ({ absence, substitution })));
    return rows.filter(({ absence, substitution }) =>
      (!historyTeacherId || absence.teacherId === historyTeacherId) &&
      (!historyDate || String(absence.absenceDate).slice(0, 10) === historyDate) &&
      (!historyStatus || substitution.status === historyStatus),
    );
  }, [dashboard?.absences, historyDate, historyStatus, historyTeacherId]);
  const excludedTeacherIds = Array.isArray(policy?.settingsJson.excludedTeacherIds) ? policy.settingsJson.excludedTeacherIds.filter((value): value is string => typeof value === "string") : [];

  if (loading && !dashboard) return <div dir="rtl" className="p-8 text-sm text-slate-500">جارٍ تحميل التشغيل اليومي...</div>;
  if (error && !dashboard) return <div dir="rtl" className="rounded-2xl bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>;
  if (!dashboard) return null;

  const noPublished = publishedSchedule === null;
  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
      <header className="rounded-[2rem] border border-[#CFE5F3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-[#DCEFFA] px-3 py-1 text-xs font-bold text-[#3478B8]">التشغيل اليومي</span>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">حصص الانتظار</h1>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-500">إدارة الغياب والبدلاء على الجدول المنشور.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-xl bg-white px-3 py-2 shadow-sm">المشروع: {dashboard.project.name}</span>
              <span className="rounded-xl bg-white px-3 py-2 shadow-sm">النسخة المنشورة: {publishedSchedule?.version ?? "—"}</span>
              <span className="rounded-xl bg-white px-3 py-2 shadow-sm">{dashboard.project.academicYear} · {dashboard.project.semester}</span>
              <a href="/dashboard/timetable-v3/operations" className="rounded-xl border border-[#3478B8] px-3 py-2 font-bold text-[#3478B8] hover:bg-[#EEF7FC]">تغيير المشروع</a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-500 sm:grid-cols-4">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-lg text-slate-900">{dashboard.teachers.length}</b>المعلمون</div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-lg text-slate-900">{classes.length}</b>الفصول</div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-lg text-slate-900">{subjects.length}</b>المواد</div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-lg text-slate-900">{dashboard.schedule.length}</b>حصص الجدول</div>
          </div>
        </div>
      </header>

      {!noPublished ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAbsenceOpen(true)} className="rounded-xl bg-[#3478B8] px-4 py-2.5 text-sm font-bold text-white">تسجيل غياب</button><button type="button" onClick={() => setSettingsOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">ضوابط الانتظار</button><button type="button" onClick={() => setSupervisionOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">المناوبات</button><button type="button" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">السجل</button></div> : null}

      {error ? <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="whitespace-pre-line rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{message}</div> : null}
      {noPublished ? (publishCandidate ? <section className="rounded-3xl border border-[#CFE5F3] bg-[#F6FBFE] p-8 text-center shadow-sm"><h2 className="text-2xl font-black text-slate-950">الجدول جاهز للاعتماد</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600">اعتمد النسخة الحالية وانشرها لتفعيل التشغيل اليومي والغياب وحصص الانتظار.</p><button type="button" onClick={() => setPublishConfirm(true)} disabled={saving || !publishCandidate.valid || !publishCandidate.isFresh} className="mt-5 rounded-xl bg-[#3478B8] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">اعتماد الجدول ونشره</button>{!publishCandidate.valid || !publishCandidate.isFresh ? <p className="mt-3 text-xs font-semibold text-amber-700">لا يمكن النشر قبل اكتمال التحقق من النسخة الحالية.</p> : null}</section> : <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center font-bold text-amber-800">يجب نشر الجدول أولًا قبل استخدام التشغيل اليومي.</div>) : null}

      {!noPublished ? <>
        <section id="absence-form" className={absenceOpen ? "fixed inset-0 z-50 m-4 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl sm:m-auto sm:max-h-[85vh] sm:w-full sm:max-w-3xl" : "hidden"}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">تسجيل الغياب</h2><button type="button" onClick={() => setAbsenceOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">إغلاق</button></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-slate-600">التاريخ<input type="date" value={absenceDate} onChange={(event) => setAbsenceDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-600">اليوم<select value={dayId} onChange={(event) => setDayId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{dashboard.days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-600">المعلم الغائب<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{dashboard.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-600">نوع الغياب<select value={absenceType} onChange={(event) => setAbsenceType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{Object.entries(absenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          {absenceType === "SELECTED_PERIODS" ? <div className="mt-4 flex flex-wrap gap-2">{activePeriods.map((period) => <label key={period.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={periodIds.includes(period.id)} onChange={() => setPeriodIds((current) => current.includes(period.id) ? current.filter((id) => id !== period.id) : [...current, period.id])} className="ml-2" />{period.label}</label>)}</div> : null}
          {absenceType === "LATE_ARRIVAL" ? <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-600">يبدأ الحضور من<select value={arrivalPeriodId} onChange={(event) => setArrivalPeriodId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{activePeriods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label> : null}
          {absenceType === "EARLY_DEPARTURE" ? <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-600">الانصراف بعد<select value={departurePeriodId} onChange={(event) => setDeparturePeriodId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{activePeriods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label> : null}
          <button type="button" disabled={saving || !teacherId || !dayId} onClick={async () => { const result = await post({ action: "CREATE_ABSENCE", data: { teacherId, absenceDate, dayId, absenceType, periodIds, arrivalPeriodId: arrivalPeriodId || undefined, departurePeriodId: departurePeriodId || undefined } }); if (result) setAbsenceOpen(false); }} className="mt-5 rounded-xl bg-[#3478B8] px-5 py-3 text-sm font-bold text-white hover:bg-[#2D6BA5] disabled:opacity-50">تسجيل الغياب وإظهار البدلاء</button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">حصص الانتظار والبدلاء</h2>
          <div className="mt-4 space-y-4">
            {dashboard.absences.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد حالات غياب مسجلة.</p> : dashboard.absences.map((absence) => <div key={absence.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-bold text-slate-900">{absence.teacher.name} · {absenceLabels[absence.absenceType] ?? absence.absenceType}</div><div className="text-xs text-slate-500">{String(absence.absenceDate).slice(0, 10)}</div><button type="button" onClick={() => void post({ action: "DELETE_ABSENCE", absenceId: absence.id })} className="text-xs font-bold text-rose-600">حذف</button></div><div className="mt-3 grid gap-3 md:grid-cols-2">{absence.substitutions.map((substitution) => <SubstitutionCard key={substitution.id} substitution={substitution} teachers={dashboard.teachers} saving={saving} onAssign={(substituteTeacherId) => void post({ action: "ASSIGN_SUBSTITUTE", data: { substitutionId: substitution.id, substituteTeacherId } })} onStatus={(status) => void post({ action: "UPDATE_SUBSTITUTION", data: { substitutionId: substitution.id, status } })} />)}</div></div>)}
          </div>
        </section>

        <section className={settingsOpen ? "fixed inset-0 z-50 m-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:m-auto sm:max-h-[85vh] sm:w-full sm:max-w-3xl" : "hidden"}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">ضوابط الانتظار</h2><button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">إغلاق</button></div>
          {policy ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><NumberSetting label="عدد البدلاء المقترحين" value={policy.candidateCount} onChange={(value) => setPolicy({ ...policy, candidateCount: value })} /><NumberSetting label="الحد اليومي" value={policy.maxDailySubstitutions} onChange={(value) => setPolicy({ ...policy, maxDailySubstitutions: value })} /><NumberSetting label="الحد الأسبوعي" value={policy.maxWeeklySubstitutions} onChange={(value) => setPolicy({ ...policy, maxWeeklySubstitutions: value })} /><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"><input type="checkbox" checked={policy.preferMatchingSpecialty} onChange={(event) => setPolicy({ ...policy, preferMatchingSpecialty: event.target.checked })} />تفضيل التخصص المطابق</label><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold"><input type="checkbox" checked={policy.allowInsideGap} onChange={(event) => setPolicy({ ...policy, allowInsideGap: event.target.checked })} />السماح داخل الفراغ</label></div> : null}
          <div className="mt-5 rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-black text-slate-800">معلمون غير مشمولين بحصص الانتظار</h3><p className="mt-1 text-xs text-slate-500">لن يظهر المعلم المحدد ضمن البدلاء المقترحين.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{dashboard.teachers.map((teacher) => <label key={teacher.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={excludedTeacherIds.includes(teacher.id)} onChange={(event) => policy && setPolicy({ ...policy, settingsJson: { ...policy.settingsJson, excludedTeacherIds: event.target.checked ? [...excludedTeacherIds, teacher.id] : excludedTeacherIds.filter((id) => id !== teacher.id) } })} />{teacher.name}</label>)}</div></div><button type="button" disabled={saving || !policy} onClick={() => policy && void post({ action: "SAVE_POLICY", data: policy })} className="mt-5 rounded-xl border border-[#3478B8] px-5 py-3 text-sm font-bold text-[#3478B8] hover:bg-[#EEF7FC] disabled:opacity-50">حفظ الضوابط وإعادة التقييم</button>
        </section>

        <section className={supervisionOpen ? "fixed inset-0 z-50 m-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:m-auto sm:max-h-[85vh] sm:w-full sm:max-w-3xl" : "hidden"}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">المناوبات</h2><button type="button" onClick={() => setSupervisionOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">إغلاق</button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={supervision.title} onChange={(event) => setSupervision({ ...supervision, title: event.target.value })} placeholder="عنوان المناوبة" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><select value={supervision.dutyType} onChange={(event) => setSupervision({ ...supervision, dutyType: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="BREAK">فسحة</option><option value="MORNING">صباح</option><option value="GATE">بوابة</option><option value="CUSTOM">مخصص</option></select><select value={supervision.dayId} onChange={(event) => setSupervision({ ...supervision, dayId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{dashboard.days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select><select value={supervision.teacherId} onChange={(event) => setSupervision({ ...supervision, teacherId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">اختر المعلم</option>{dashboard.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div><button type="button" disabled={saving || !supervision.title.trim() || !supervision.dayId || !supervision.teacherId} onClick={() => void post({ action: "CREATE_SUPERVISION", data: { title: supervision.title, dutyType: supervision.dutyType, dayId: supervision.dayId, periodId: supervision.periodId || undefined, location: supervision.location || undefined, requiredTeachers: 1, teacherIds: [supervision.teacherId] } })} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">إضافة مناوبة</button>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{dashboard.supervisionDuties.map((duty) => <div key={duty.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm"><div><b>{duty.title}</b><div className="mt-1 text-xs text-slate-500">{duty.assignments.map((assignment) => assignment.teacher.name).join("، ")}</div></div><button type="button" onClick={() => void post({ action: "DELETE_SUPERVISION", dutyId: duty.id })} className="text-xs font-bold text-rose-600">حذف</button></div>)}</div>
        </section>

        <section id="history" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">سجل الغياب والانتظار</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><select value={historyTeacherId} onChange={(event) => setHistoryTeacherId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">كل المعلمين</option>{dashboard.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">كل الحالات</option><option value="SUGGESTED">مقترحة</option><option value="ASSIGNED">مكلف</option><option value="NOTIFIED">تم الإشعار</option><option value="COMPLETED">مكتملة</option><option value="DECLINED">مرفوضة</option><option value="CANCELED">ملغاة</option></select></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead className="border-b border-slate-100 text-xs text-slate-500"><tr><th className="p-3">التاريخ</th><th className="p-3">اليوم</th><th className="p-3">المعلم الغائب</th><th className="p-3">الفصل</th><th className="p-3">المادة</th><th className="p-3">الحصة</th><th className="p-3">المعلم البديل</th><th className="p-3">الحالة</th></tr></thead><tbody>{historyRows.map(({ absence, substitution }) => <tr key={substitution.id} className="border-b border-slate-50"><td className="p-3">{String(absence.absenceDate).slice(0, 10)}</td><td className="p-3">{dashboard.days.find((day) => day.id === substitution.dayId)?.label ?? "—"}</td><td className="p-3">{absence.teacher.name}</td><td className="p-3">{substitution.className}</td><td className="p-3">{substitution.subjectName}</td><td className="p-3">{substitution.periodLabel ?? substitution.periodId}</td><td className="p-3">{substitution.substituteTeacher?.name ?? "—"}</td><td className="p-3">{statusLabel(substitution.status)}</td></tr>)}</tbody></table>{historyRows.length === 0 ? <p className="p-5 text-sm text-slate-500">لا توجد سجلات مطابقة.</p> : null}</div>
        </section>
      </> : null}
      {publishConfirm ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm"><div dir="rtl" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black text-slate-950">اعتماد الجدول ونشره</h2><p className="mt-3 text-sm leading-7 text-slate-600">سيتم اعتماد هذه النسخة كجدول المدرسة المنشور، وسيبدأ التشغيل اليومي بالاعتماد عليها.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPublishConfirm(false)} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">إلغاء</button><button type="button" onClick={() => void publishCurrentSchedule()} disabled={saving} className="h-11 flex-1 rounded-xl bg-[#3478B8] px-4 text-sm font-bold text-white disabled:opacity-50">اعتماد ونشر</button></div></div></div> : null}
    </div>
  );
}

function NumberSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-sm font-semibold text-slate-600">{label}<input type="number" min={1} max={10} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>;
}

function statusLabel(status: string) {
  return ({ SUGGESTED: "مقترحة", ASSIGNED: "مكلف", NOTIFIED: "تم الإشعار", COMPLETED: "مكتملة", DECLINED: "مرفوضة", CANCELED: "ملغاة" } as Record<string, string>)[status] ?? status;
}

function SubstitutionCard({ substitution, teachers, saving, onAssign, onStatus }: { substitution: Substitution; teachers: Teacher[]; saving: boolean; onAssign: (teacherId: string) => void; onStatus: (status: string) => void }) {
  const candidates = candidatesOf(substitution.candidatesJson);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-slate-900">{substitution.className} · {substitution.subjectName}</b><span className="rounded-full bg-[#EEF7FC] px-2 py-1 text-xs font-bold text-[#3478B8]">{substitution.periodLabel ?? substitution.periodId}</span></div><p className="mt-2 text-xs text-slate-500">المعلم الغائب: {teachers.find((teacher) => teacher.id === substitution.originalTeacherId)?.name ?? substitution.originalTeacherId}</p><select disabled={saving} defaultValue={substitution.substituteTeacher?.id ?? ""} onChange={(event) => event.target.value && onAssign(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">اختر البديل المقترح أو يدويًا</option>{candidates.map((candidate) => <option key={candidate.teacherId} value={candidate.teacherId}>{candidate.teacherName}{candidate.reasonLabels?.length ? ` — ${candidate.reasonLabels.join("، ")}` : ""}</option>)}{candidates.length === 0 ? teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>) : null}</select><div className="mt-3 flex items-center gap-2"><select value={substitution.status} onChange={(event) => onStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="ASSIGNED">مكلف</option><option value="NOTIFIED">تم الإشعار</option><option value="COMPLETED">مكتملة</option><option value="DECLINED">مرفوضة</option><option value="CANCELED">ملغاة</option></select><span className="text-xs text-slate-500">البدلاء المقترحون وفق ضوابط التشغيل.</span></div></div>;
}
