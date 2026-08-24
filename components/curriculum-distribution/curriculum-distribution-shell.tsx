"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, Loader2, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { CurriculumDistributionMobilePreview } from "@/components/curriculum-distribution/curriculum-distribution-mobile-preview";
import { CurriculumWeekCard } from "@/components/curriculum-distribution/curriculum-week-card";
import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import type { CurriculumDistribution, CurriculumOption } from "@/lib/curriculum-distribution/types";
import { MyCurriculumCard, type SavedCurriculumItem } from "@/components/curriculum-distribution/my-curriculum-card";
import { CurriculumSendPopCard, type CurriculumSendStatus } from "@/components/curriculum-distribution/curriculum-send-pop-card";
import { downloadBlobAsFile } from "@/lib/print-export/print-export-download";

type Choice = CurriculumOption & { isExtra?: boolean };
type Options = { stages: Choice[]; childStages: Choice[]; tracks: Choice[]; grades: Choice[]; semesters: Choice[]; subjects: Choice[] };
type SelectionField = { key: string; label: string; value: Choice | null; choices: Choice[]; onChange: (value: Choice | null) => void | Promise<void> };
type CurriculumDistributionShellProps = {
  apiPath?: string;
  printPath?: string;
  exportPath?: string;
  downloadFileName?: string;
  previewPath?: string;
  publicPreview?: boolean;
  campaignRef?: string;
  onPublicEvent?: (event: "VIEW" | "PREVIEW" | "DOWNLOAD") => void;
  onDownloadComplete?: () => void;
};
const emptyOptions: Options = { stages: [], childStages: [], tracks: [], grades: [], semesters: [], subjects: [] };

function buildApiUrl(apiPath: string, query: URLSearchParams) {
  const url = new URL(apiPath, window.location.origin);
  url.search = query.toString();
  return url.toString();
}

async function loadOptions(apiPath: string, kind: string, params: Record<string, string>) {
  const query = new URLSearchParams({ kind, ...params });
  const url = buildApiUrl(apiPath, query);
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  } catch {
    try {
      response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    } catch {
      throw new Error("تعذر تحميل خيارات توزيع المنهج. حاول مرة أخرى.");
    }
  }
  let json: { data?: Choice[]; error?: string };
  try {
    json = await response.json() as { data?: Choice[]; error?: string };
  } catch {
    throw new Error("تعذر تحميل خيارات توزيع المنهج. حاول مرة أخرى.");
  }
  if (!response.ok) throw new Error(json.error || "تعذر تحميل البيانات");
  return json.data as Choice[];
}

export function CurriculumDistributionShell({
  apiPath = "/api/dashboard/curriculum-distribution",
  printPath = "/print/curriculum-distribution",
  exportPath,
  downloadFileName = "curriculum-distribution.pdf",
  previewPath,
  publicPreview = false,
  campaignRef,
  onPublicEvent,
  onDownloadComplete,
}: CurriculumDistributionShellProps = {}) {
  const [stage, setStage] = useState<Choice | null>(null);
  const [childStage, setChildStage] = useState<Choice | null>(null);
  const [track, setTrack] = useState<Choice | null>(null);
  const [grade, setGrade] = useState<Choice | null>(null);
  const [semester, setSemester] = useState<Choice | null>(null);
  const [subject, setSubject] = useState<Choice | null>(null);
  const [options, setOptions] = useState<Options>(emptyOptions);
  const [distribution, setDistribution] = useState<CurriculumDistribution | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [myCurriculum, setMyCurriculum] = useState<SavedCurriculumItem[]>([]);
  const [myCurriculumLoading, setMyCurriculumLoading] = useState(false);
  const [sendItem, setSendItem] = useState<SavedCurriculumItem | null>(null);
  const [sendStatus, setSendStatus] = useState<CurriculumSendStatus>("idle");
  const [sendBlob, setSendBlob] = useState<Blob | null>(null);
  const [sendFileName, setSendFileName] = useState("weekly-curriculum.pdf");
  const searchParams = useSearchParams();
  const requestVersion = useRef(0);
  const print = usePrintExportAction();

  async function loadMyCurriculum() {
    if (publicPreview) return;
    setMyCurriculumLoading(true);
    try {
      const response = await fetch("/api/dashboard/curriculum-distribution/my-curriculum", { cache: "no-store", credentials: "same-origin" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "تعذر تحميل منهجي.");
      setMyCurriculum(json.items || []);
    } catch {
      setMyCurriculum([]);
    } finally { setMyCurriculumLoading(false); }
  }

  useEffect(() => { void loadMyCurriculum(); }, [publicPreview]);

  useEffect(() => {
    const subjectId = searchParams.get("subjectId");
    const semesterId = searchParams.get("semesterId");
    if (!subjectId || !semesterId) return;
    const query = new URLSearchParams({ kind: "distribution", subjectId, semesterId });
    fetch(buildApiUrl(apiPath, query), { cache: "no-store", credentials: "same-origin" }).then((response) => response.json()).then((json) => { if (json.distribution) setDistribution(json.distribution); }).catch(() => undefined);
  }, [apiPath, searchParams]);

  async function addCurrentToMyCurriculum() {
    if (!distribution) return;
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/curriculum-distribution/my-curriculum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId: distribution.subject.id, semesterId: distribution.semester.id }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "تعذر الإضافة إلى منهجي.");
      setError(json.duplicate ? "هذه المادة موجودة في منهجي بالفعل." : "تمت إضافة المادة إلى منهجي.");
      await loadMyCurriculum();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر الإضافة إلى منهجي."); }
    finally { setLoading(false); }
  }

  function getPrintUrl() {
    if (!distribution) return "";
    const query = new URLSearchParams({
      stageId: distribution.stage.id,
      gradeId: distribution.grade.id,
      semesterId: distribution.semester.id,
      subjectId: distribution.subject.id,
      ...(campaignRef ? { ref: campaignRef } : {}),
    });
    if (printPath === "/print/curriculum-distribution") return `${printPath}?${query}`;
    query.set("variant", "curriculum-distribution");
    query.set("mode", "print");
    query.set("print", "1");
    return `${printPath}?${query}`;
  }

  function getPreviewUrl() {
    if (!distribution) return "";
    const query = new URLSearchParams({
      stageId: distribution.stage.id,
      gradeId: distribution.grade.id,
      semesterId: distribution.semester.id,
      subjectId: distribution.subject.id,
      ...(campaignRef ? { ref: campaignRef } : {}),
    });
    if (!previewPath) {
      const printUrl = getPrintUrl();
      return printUrl ? `${printUrl}&preview=1` : "";
    }
    query.set("variant", "curriculum-distribution");
    query.set("mode", "preview");
    if (publicPreview) query.set("public", "1");
    return `${previewPath}?${query}`;
  }

  async function runDistributionPreview(reference: { subjectId: string; semesterId: string; stageId: string; gradeId: string }) {
    const query = new URLSearchParams({ stageId: reference.stageId, gradeId: reference.gradeId, semesterId: reference.semesterId, subjectId: reference.subjectId, ...(campaignRef ? { ref: campaignRef } : {}) });
    const printUrl = printPath === "/print/curriculum-distribution" ? `${printPath}?${query}` : (() => { query.set("variant", "curriculum-distribution"); query.set("mode", "print"); query.set("print", "1"); return `${printPath}?${query}`; })();
    const result = await print.runPrintExport({ exportUrl: exportPath, method: exportPath ? "POST" : undefined, body: exportPath ? { subjectId: reference.subjectId, semesterId: reference.semesterId, fileName: downloadFileName } : undefined, printUrl, fileName: downloadFileName, blockedTitle: "معاينة الطباعة", blockedMessage: "تم حظر فتح نافذة المعاينة تلقائيًا. استخدم الزر أدناه لفتح مستند الطباعة." });
    if (result !== "error") { onPublicEvent?.("DOWNLOAD"); onDownloadComplete?.(); }
    return result !== "error";
  }

  async function printDistribution() {
    if (!distribution) return false;
    return runDistributionPreview({ subjectId: distribution.subject.id, semesterId: distribution.semester.id, stageId: distribution.stage.id, gradeId: distribution.grade.id });
  }

  function openDistributionPreview() {
    if (!distribution) return;
    onPublicEvent?.("PREVIEW");
    setMobilePreviewOpen(true);
  }

  async function sendWeekly(item: SavedCurriculumItem | null, all: boolean) {
    if (!item && !all) return;
    const subjectName = item?.subject.name && !/[\u00d9\u00d8]/.test(item.subject.name) ? item.subject.name : "المادة";
    const fileName = all ? "منهج-الأسبوع-موادي.pdf" : `منهج-الأسبوع-${subjectName}.pdf`;
    setSendFileName(fileName);
    setSendBlob(null);
    setSendStatus("preparing");
    try {
      const response = await fetch("/api/dashboard/curriculum-distribution/week/export/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all, subjectId: item?.subjectId, semesterId: item?.semesterId, fileName }), credentials: "same-origin" });
      if (!response.ok || !(response.headers.get("content-type") || "").includes("application/pdf")) throw new Error("WEEKLY_PDF_UNAVAILABLE");
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      setSendBlob(blob);
      if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function" || !navigator.canShare({ files: [file] })) {
        setSendStatus("unsupported");
        return;
      }
      setSendStatus("sharing");
      try {
        await navigator.share({ files: [file], title: all ? "منهج الأسبوع" : `منهج الأسبوع - ${item?.subject.name || "المادة"}`, text: all ? "منهج الأسبوع لمواد منهجي" : `منهج الأسبوع لمادة ${item?.subject.name || "المادة"}` });
        setSendItem(null);
        setSendBlob(null);
        setSendStatus("idle");
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          setSendItem(null);
          setSendBlob(null);
          setSendStatus("idle");
          return;
        }
        setSendStatus("error");
      }
    } catch {
      setSendStatus("error");
    }
  }

  async function downloadWeeklyFile() {
    if (!sendBlob) return;
    await downloadBlobAsFile(sendBlob, sendFileName);
    setSendItem(null);
    setSendBlob(null);
    setSendStatus("idle");
  }

  function closeSendCard() {
    if (sendStatus === "preparing" || sendStatus === "sharing") return;
    setSendItem(null);
    setSendBlob(null);
    setSendStatus("idle");
  }

  useEffect(() => {
    const version = ++requestVersion.current;
    loadOptions(apiPath, "stages", {}).then((data) => {
      if (version === requestVersion.current) setOptions((old) => ({ ...old, stages: data }));
    }).catch((reason: unknown) => {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المراحل");
    });
  }, [apiPath]);

  function resetBelowStage() {
    setChildStage(null); setTrack(null); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, childStages: [], tracks: [], grades: [], semesters: [], subjects: [] }));
  }

  async function handleStage(nextStage: Choice | null) {
    const version = ++requestVersion.current;
    setStage(nextStage); resetBelowStage(); setError("");
    if (!nextStage) return;
    setLoading(true);
    try {
      const tracks = await loadOptions(apiPath, "tracks", { stageId: nextStage.id });
      if (version !== requestVersion.current) return;
      setOptions((old) => ({ ...old, tracks }));
      if (tracks.length) return;
      const childStages = await loadOptions(apiPath, "child-stages", { parentId: nextStage.id });
      if (version !== requestVersion.current) return;
      setOptions((old) => ({ ...old, childStages }));
      if (childStages.length) return;
      const grades = await loadOptions(apiPath, "grades", { stageId: nextStage.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المرحلة");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleTrack(nextTrack: Choice | null) {
    const version = ++requestVersion.current;
    setTrack(nextTrack); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, grades: [], semesters: [], subjects: [] })); setError("");
    if (!nextTrack || !stage) return;
    setLoading(true);
    try {
      const grades = await loadOptions(apiPath, "grades", { stageId: stage.id, trackId: nextTrack.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الصفوف");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleChildStage(nextChildStage: Choice | null) {
    const version = ++requestVersion.current;
    setChildStage(nextChildStage); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, grades: [], semesters: [], subjects: [] })); setError("");
    if (!nextChildStage) return;
    setLoading(true);
    try {
      const grades = await loadOptions(apiPath, "grades", { stageId: nextChildStage.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الصفوف");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleGrade(nextGrade: Choice | null) {
    const version = ++requestVersion.current;
    setGrade(nextGrade); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, semesters: [], subjects: [] })); setError("");
    if (!nextGrade) return;
    setLoading(true);
    try {
      const semesters = await loadOptions(apiPath, "semesters", { gradeId: nextGrade.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, semesters }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الفصول");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleSemester(nextSemester: Choice | null) {
    const version = ++requestVersion.current;
    setSemester(nextSemester); setSubject(null); setDistribution(null); setOptions((old) => ({ ...old, subjects: [] })); setError("");
    if (!nextSemester) return;
    setLoading(true);
    try {
      const subjects = await loadOptions(apiPath, "subjects", { semesterId: nextSemester.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, subjects }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المواد");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function showDistribution() {
    if (!subject || !semester) return;
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({
        kind: "distribution",
        subjectId: subject.id,
        semesterId: semester.id,
      });
      let response: Response;
      try {
        response = await fetch(buildApiUrl(apiPath, query), { cache: "no-store", credentials: "same-origin" });
      } catch {
        try {
          response = await fetch(buildApiUrl(apiPath, query), { cache: "no-store", credentials: "same-origin" });
        } catch {
          throw new Error("تعذر تحميل توزيع المنهج. حاول مرة أخرى.");
        }
      }
      let json: { distribution?: CurriculumDistribution; error?: string };
      try {
        json = await response.json() as { distribution?: CurriculumDistribution; error?: string };
      } catch {
        throw new Error("تعذر تحميل توزيع المنهج. حاول مرة أخرى.");
      }
      if (!response.ok) throw new Error(json.error || "تعذر تحميل التوزيع");
      if (version === requestVersion.current) setDistribution(json.distribution as CurriculumDistribution);
    } catch (reason: unknown) {
      if (version === requestVersion.current && reason instanceof Error && reason.message === "Failed to fetch") {
        setError("تعذر تحميل توزيع المنهج. حاول مرة أخرى.");
        return;
      }
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل التوزيع");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  const hasTracks = Boolean(stage && options.tracks.length);
  const hasChildStages = Boolean(stage && options.childStages.length);
  const gradeReady = Boolean(stage && (!hasTracks || track) && (!hasChildStages || childStage) && options.grades.length);
  const semesterReady = Boolean(grade && options.semesters.length);
  const subjectReady = Boolean(semester && options.subjects.length);
  const fields: SelectionField[] = [
    { key: "stage", label: "المرحلة", value: stage, choices: options.stages, onChange: handleStage },
    ...(hasChildStages ? [{ key: "childStage", label: "المرحلة الفرعية", value: childStage, choices: options.childStages, onChange: handleChildStage }] : []),
    ...(hasTracks ? [{ key: "track", label: "المسار", value: track, choices: options.tracks, onChange: handleTrack }] : []),
    ...(gradeReady ? [{ key: "grade", label: "الصف / السنة", value: grade, choices: options.grades, onChange: handleGrade }] : []),
    ...(semesterReady ? [{ key: "semester", label: "الفصل الدراسي", value: semester, choices: options.semesters, onChange: handleSemester }] : []),
    ...(subjectReady ? [{ key: "subject", label: "المادة", value: subject, choices: options.subjects, onChange: (value: Choice | null) => { ++requestVersion.current; setSubject(value); setDistribution(null); } }] : []),
  ];

  return (
    <div dir="rtl" className="curriculum-distribution-shell space-y-5">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          {loading ? <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />جارٍ تحميل الخيارات</span> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => <label key={field.key} className="min-w-0 space-y-2"><span className="block text-xs font-black text-slate-600">{field.label}</span><span className="relative block"><select disabled={loading} value={field.value?.id || ""} onChange={(event) => { const value = field.choices.find((item) => item.id === event.target.value) || null; void field.onChange(value); }} className="min-h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pe-10 text-sm font-black text-slate-800 outline-none transition hover:border-sky-300 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-wait disabled:opacity-60"><option value="">اختر {field.label}</option>{field.choices.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isExtra ? " (إضافية)" : ""}</option>)}</select><ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></span></label>)}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <p className="text-sm font-bold text-slate-500">{subject ? "أصبحت الخطة جاهزة للعرض." : "أكمل الاختيارات لعرض التوزيع."}</p>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
             {!distribution ? <button disabled={!subject || loading} onClick={showDistribution} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-45">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "جارٍ التحميل" : "عرض التوزيع"}
             </button> : <button type="button" disabled={loading} onClick={addCurrentToMyCurriculum} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-wait disabled:opacity-60"><Plus className="h-4 w-4" />إضافة إلى منهجي</button>}
            {distribution ? <button disabled={print.status === "loading"} onClick={openDistributionPreview} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-wait disabled:opacity-60"><Eye className="h-4 w-4" />معاينة وتحميل</button> : null}

          </div>
        </div>
      </section>
       {distribution ? <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 px-5 py-4 text-sm font-bold text-sky-800">تم تحميل التوزيع. استخدم «معاينة وتحميل» للاطلاع الكامل.</div> : null}
       {!publicPreview ? <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-labelledby="my-curriculum-title">
         <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
           <div><h2 id="my-curriculum-title" className="text-base font-black text-slate-950">منهجي</h2><p className="mt-1 text-xs font-bold text-slate-500">المواد التي حفظتها للمتابعة.</p></div>
           {myCurriculumLoading ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" aria-label="جار تحميل منهجي" /> : null}
         </div>
         {myCurriculum.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{myCurriculum.map((item) => <MyCurriculumCard key={item.id} item={item} onRefresh={() => void loadMyCurriculum()} onSend={setSendItem} onPreview={(saved) => void runDistributionPreview({ subjectId: saved.subjectId, semesterId: saved.semesterId, stageId: saved.stage.id, gradeId: saved.grade.id })} />)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm font-black text-slate-500">لا توجد مواد محفوظة في منهجي حتى الآن.</p>}
      </section> : null}
      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
      <CurriculumDistributionMobilePreview
        open={mobilePreviewOpen}
        previewUrl={getPreviewUrl()}
        onDownload={printDistribution}
        onClose={() => setMobilePreviewOpen(false)}
      />
       <CurriculumSendPopCard open={Boolean(sendItem)} status={sendStatus} onClose={closeSendCard} onDownload={() => void downloadWeeklyFile()} onSingle={() => { if (sendItem) void sendWeekly(sendItem, false); }} onAll={() => { if (sendItem) void sendWeekly(sendItem, true); }} />
    </div>
  );
}

export function DistributionView({ distribution }: { distribution: CurriculumDistribution }) {
  const calendarItems = getCurriculumCalendarItems(distribution.weeks);
  const summary = [["المرحلة", distribution.stage.name], distribution.track ? ["المسار", distribution.track.name] : null, ["الصف / السنة", distribution.grade.name], ["الفصل", distribution.semester.name], ["المادة", distribution.subject.name]].filter((item): item is [string, string] => Boolean(item));
  return <section className="space-y-4" dir="rtl"><div className="rounded-[1.75rem] bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-700 p-4 text-white shadow-lg shadow-sky-900/10 md:p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{summary.map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><span className="block text-[11px] font-bold text-white/65">{label}</span><strong className="mt-1 block truncate text-sm font-black text-white" title={value}>{value}</strong></div>)}</div></div><div className="grid gap-4 md:grid-cols-2">{calendarItems.map((item) => <CurriculumWeekCard key={item.id} item={item} />)}</div></section>;
}
