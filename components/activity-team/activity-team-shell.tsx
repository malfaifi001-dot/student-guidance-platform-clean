"use client";

import { useEffect, useState } from "react";
import { Eye, Link2, Loader2, Save, Send, UsersRound } from "lucide-react";
import { CurriculumDistributionMobilePreview } from "@/components/curriculum-distribution/curriculum-distribution-mobile-preview";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { ActivityTeamTable, type ActivityTeamAssignments } from "@/components/activity-team/activity-team-table";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";
import { openExternalUrl } from "@/lib/native/external-url-handler";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { ServiceOutputLinkActions } from "@/components/performance-links/service-output-link-actions";

type Feedback = { variant: "success" | "error"; title: string; description: string };
type ServiceLink = { id: string; sourceKey: string; sourceReferenceJson: Record<string, unknown>; targetSectionKey?: string | null; performanceItemKey: string };

async function readJsonResponse(response: Response) {
  const body = await response.text();
  if (!body.trim()) throw new Error(response.ok ? "استجابة الخادم فارغة." : `تعذر تنفيذ الطلب (${response.status}).`);
  let payload: { ok?: boolean; assignments?: ActivityTeamAssignments; publicUrl?: string; error?: string };
  try { payload = JSON.parse(body) as typeof payload; } catch { throw new Error("استجابة الخادم غير صالحة."); }
  if (!response.ok || payload.ok !== true) throw new Error(payload.error || `تعذر تنفيذ الطلب (${response.status}).`);
  return payload;
}

export function ActivityTeamShell({ gender }: { gender: string }) {
  const [assignments, setAssignments] = useState<ActivityTeamAssignments>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [serviceLinks, setServiceLinks] = useState<ServiceLink[]>([]);
  const print = usePrintExportAction();
  const activityLeaderLabel = getArabicUserRoleLabel({ role: "ACTIVITY_LEADER", gender });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dashboard/activity-team", { cache: "no-store" })
      .then(async (response) => { const payload = await readJsonResponse(response); if (!cancelled) setAssignments(payload.assignments || {}); })
      .catch((cause) => { if (!cancelled) { const message = cause instanceof Error ? cause.message : "تعذر تحميل بيانات الفريق."; setError(message); setFeedback({ variant: "error", title: "تعذر تحميل البيانات", description: message }); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void fetch("/api/dashboard/performance-links?serviceSlug=school-activity-team&roleContext=ACTIVITY_LEADER", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setServiceLinks(payload.links || []));
  }, []);

  const existingLink = serviceLinks.find((link) => link.sourceKey === "school-account") || null;

  function changeAssignment(key: string, value: string) { setAssignments((current) => ({ ...current, [key]: value })); }

  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/dashboard/activity-team", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments }) });
      const payload = await readJsonResponse(response);
      setAssignments(payload.assignments || assignments);
      setFeedback({ variant: "success", title: "تم الحفظ بنجاح", description: "تم حفظ أسماء المشرفين ويمكن تعديلها لاحقًا." });
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر حفظ البيانات.";
      setError(message); setFeedback({ variant: "error", title: "تعذر حفظ البيانات", description: message }); return false;
    } finally { setSaving(false); }
  }

  async function openPrintPreview() { if (await save()) setPreviewOpen(true); }

  async function printDocument() {
    if (!(await save())) return false;
    const result = await print.runPrintExport({ exportUrl: "/api/dashboard/activity-team/export/pdf", method: "POST", body: { fileName: "school-activity-team.pdf" }, printUrl: "/print/activity-team?print=1", fileName: "school-activity-team.pdf", blockedTitle: "معاينة فريق النشاط الطلابي", blockedMessage: "تم حظر فتح نافذة المعاينة. استخدم زر فتح المعاينة أدناه." });
    return result !== "error";
  }

  async function sendForSignature() {
    if (!(await save())) return;
    try {
      setSaving(true);
      const response = await fetch("/api/dashboard/activity-team/signature-request", { method: "POST" });
      const payload = await readJsonResponse(response);
      if (!payload.publicUrl) throw new Error("تعذر إنشاء رابط التوقيع.");
      const message = `السلام عليكم ورحمة الله وبركاته،

نأمل منكم الدخول عبر *الرابط التالي* لاستكمال توقيع نموذج *فريق النشاط الطلابي بالمدرسة* عبر منصة *Teachix*.

يرجى فتح الرابط، اختيار الاسم من القائمة، ثم إضافة التوقيع في المكان المخصص:

${payload.publicUrl}

بعد إتمام التوقيع سيتم حفظه تلقائيًا داخل النموذج الرسمي.

*Teachix | الأسهل، الأشمل*`;
      await openExternalUrl(`https://wa.me/?text=${encodeURIComponent(message)}`);
      setFeedback({ variant: "success", title: "تم تجهيز رابط التوقيع", description: "تم فتح واتساب برسالة عامة تحتوي على رابط التوقيع الآمن." });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر إنشاء رابط التوقيع.";
      setError(message); setFeedback({ variant: "error", title: "تعذر إرسال النموذج للتوقيع", description: message });
    } finally { setSaving(false); }
  }

  return (
    <main dir="rtl" className="space-y-6">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-700 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><span className="text-sm font-black text-cyan-200">{activityLeaderLabel}</span><h1 className="mt-2 text-3xl font-black md:text-4xl">فريق النشاط الطلابي بالمدرسة</h1></div><div className="flex items-center gap-3">{existingLink ? <ServiceOutputLinkActions link={existingLink} onDeleted={() => setServiceLinks((current) => current.filter((item) => item.id !== existingLink.id))} /> : null}<button type="button" onClick={() => setLinkOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20"><Link2 className="h-4 w-4" />{existingLink ? "تعديل الربط" : "ربط بملف الإنجاز"}</button><UsersRound className="h-12 w-12 text-cyan-200" aria-hidden="true" /></div></div>
      </section>
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300" role="alert">{error}</p> : null}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950 dark:text-white">بيانات فريق النشاط</h2>{loading ? <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">جارٍ التحميل</span> : null}</div>
        <ActivityTeamTable assignments={assignments} gender={gender} editable onChange={changeAssignment} />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => void save()} disabled={saving || loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60 dark:shadow-sky-950/30">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "جاري الحفظ" : "حفظ البيانات"}</button>
          <button type="button" onClick={() => void openPrintPreview()} disabled={saving || loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500/60 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"><Eye className="h-4 w-4" />معاينة وطباعة</button>
          <button type="button" onClick={() => void sendForSignature()} disabled={saving || loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-800/80 dark:bg-emerald-950/35 dark:text-emerald-300 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/10"><Send className="h-4 w-4" />إرسال للتوقيع</button>
        </div>
      </section>
      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
      <CurriculumDistributionMobilePreview open={previewOpen} previewUrl="/print/activity-team?preview=1" onDownload={printDocument} onClose={() => setPreviewOpen(false)} title="معاينة فريق النشاط الطلابي" subtitle="راجع النموذج الرسمي قبل الطباعة." documentLabel="فريق النشاط الطلابي بالمدرسة" documentSelector=".pdf-report-page" documentOrientation="portrait" allowDocumentScroll />
      <SmartActionModal open={Boolean(feedback)} title={feedback?.title || ""} description={feedback?.description} variant={feedback?.variant || "info"} onClose={() => setFeedback(null)} />
      <PerformanceItemLinkPopCard open={linkOpen} serviceSlug="school-activity-team" roleContext="ACTIVITY_LEADER" resourceType="ACTIVITY_TEAM" sourceReference={{ scope: "school-account" }} displayTitle="فريق النشاط الطلابي بالمدرسة" targetType="portfolio-section" defaultTargetKey="student_activity" existingLink={existingLink} onClose={() => setLinkOpen(false)} onSaved={(link) => { setServiceLinks((current) => [...current.filter((item) => item.id !== link.id), link as ServiceLink]); }} />
    </main>
  );
}
