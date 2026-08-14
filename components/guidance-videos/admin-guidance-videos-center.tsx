"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Film,
  Link2,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { GuidanceVideoPlayerDialog } from "@/components/guidance-videos/guidance-video-player-dialog";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import {
  GUIDANCE_VIDEO_ROLE_LABELS,
  GUIDANCE_VIDEO_TARGET_ROLES,
  type GuidanceVideoDto,
  type GuidanceVideoSourceType,
  type GuidanceVideoTargetRole,
} from "@/lib/guidance-videos/guidance-video-config";
import { buildYouTubeWatchUrl } from "@/lib/guidance-videos/youtube";

type Feedback = { type: "success" | "error"; message: string } | null;

type FormState = {
  title: string;
  description: string;
  targetRoles: GuidanceVideoTargetRole[];
  isPublished: boolean;
  sortOrder: string;
  sourceType: GuidanceVideoSourceType;
  youtubeUrl: string;
  file: File | null;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  targetRoles: [],
  isPublished: false,
  sortOrder: "0",
  sourceType: "UPLOAD",
  youtubeUrl: "",
  file: null,
};

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    videos?: GuidanceVideoDto[];
    video?: GuidanceVideoDto;
    message?: string;
    error?: string;
  };
}

function formatBytes(value: number | null) {
  if (value === null) return "—";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} كيلوبايت`;
  return `${(value / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminGuidanceVideosCenter() {
  const [videos, setVideos] = useState<GuidanceVideoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [previewVideo, setPreviewVideo] = useState<GuidanceVideoDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuidanceVideoDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt)),
    [videos],
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/admin/guidance-videos", { cache: "no-store" });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الفيديوهات.");
      setVideos(data.videos ?? []);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "تعذر تحميل الفيديوهات." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadVideos(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadVideos]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setFeedback(null);
  }

  function startEdit(video: GuidanceVideoDto) {
    setEditingId(video.id);
    setForm({
      title: video.title,
      description: video.description ?? "",
      targetRoles: video.targetRoles,
      isPublished: video.isPublished,
      sortOrder: String(video.sortOrder),
      sourceType: video.sourceType,
      youtubeUrl: video.youtubeVideoId
        ? (buildYouTubeWatchUrl(video.youtubeVideoId) ?? "")
        : "",
      file: null,
    });
    setFormOpen(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildFormData(state: FormState) {
    const data = new FormData();
    data.set("title", state.title);
    data.set("description", state.description);
    data.set("targetRoles", JSON.stringify(state.targetRoles));
    data.set("isPublished", String(state.isPublished));
    data.set("sortOrder", state.sortOrder);
    data.set("sourceType", state.sourceType);
    if (state.sourceType === "YOUTUBE") data.set("youtubeUrl", state.youtubeUrl);
    if (state.file) data.set("video", state.file);
    return data;
  }

  async function saveVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/dashboard/admin/guidance-videos/${encodeURIComponent(editingId)}`
          : "/api/dashboard/admin/guidance-videos",
        { method: editingId ? "PATCH" : "POST", body: buildFormData(form) },
      );
      const data = await readResponse(response);
      if (!response.ok || !data.video) throw new Error(data.error || "تعذر حفظ الفيديو.");
      setVideos((current) => {
        const exists = current.some((item) => item.id === data.video?.id);
        return exists
          ? current.map((item) => (item.id === data.video?.id ? data.video! : item))
          : [...current, data.video!];
      });
      setFeedback({ type: "success", message: data.message || "تم حفظ الفيديو بنجاح." });
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "تعذر حفظ الفيديو." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(video: GuidanceVideoDto) {
    const next = { ...video, isPublished: !video.isPublished };
    setSaving(true);
    try {
      const formData = buildFormData({
        title: next.title,
        description: next.description ?? "",
        targetRoles: next.targetRoles,
        isPublished: next.isPublished,
        sortOrder: String(next.sortOrder),
        sourceType: next.sourceType,
        youtubeUrl: next.youtubeVideoId
          ? (buildYouTubeWatchUrl(next.youtubeVideoId) ?? "")
          : "",
        file: null,
      });
      const response = await fetch(`/api/dashboard/admin/guidance-videos/${encodeURIComponent(video.id)}`, { method: "PATCH", body: formData });
      const data = await readResponse(response);
      if (!response.ok || !data.video) throw new Error(data.error || "تعذر تحديث حالة النشر.");
      setVideos((current) => current.map((item) => (item.id === video.id ? data.video! : item)));
      setFeedback({ type: "success", message: data.message || "تم تحديث حالة النشر." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "تعذر تحديث حالة النشر." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteVideo() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/dashboard/admin/guidance-videos/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "تعذر حذف الفيديو.");
      setVideos((current) => current.filter((item) => item.id !== deleteTarget.id));
      setFeedback({ type: "success", message: data.message || "تم حذف الفيديو." });
      setDeleteTarget(null);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "تعذر حذف الفيديو." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" dir="rtl">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><Film className="h-6 w-6" /></span>
            <div>
              <h1 className="text-2xl font-black text-slate-950 sm:text-3xl dark:text-white">الفيديوهات الإرشادية</h1>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">إدارة الفيديوهات التعليمية التي تظهر للمستخدمين داخل المنصة.</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700">
          <Plus className="h-5 w-5" /> إضافة فيديو إرشادي
        </button>
      </header>

      {feedback ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"}`} role="status">
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="إغلاق الرسالة"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {formOpen ? (
        <form onSubmit={saveVideo} className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6 dark:border-sky-500/20 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-slate-950 dark:text-white">{editingId ? "تعديل الفيديو الإرشادي" : "إضافة فيديو إرشادي"}</h2><p className="mt-1 text-xs font-bold text-slate-400">اختر رفع ملف MP4 أو إضافة رابط YouTube.</p></div>
            <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300" aria-label="إغلاق"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-black text-slate-700 dark:text-slate-200">عنوان الفيديو</span><input required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label className="space-y-2"><span className="text-sm font-black text-slate-700 dark:text-slate-200">ترتيب الظهور</span><input type="number" min={0} max={100000} value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <label className="space-y-2 lg:col-span-2"><span className="text-sm font-black text-slate-700 dark:text-slate-200">الوصف</span><textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <fieldset className="lg:col-span-2">
              <legend className="text-sm font-black text-slate-700 dark:text-slate-200">مصدر الفيديو</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900">
                {([
                  { value: "UPLOAD", label: "رفع فيديو", icon: UploadCloud },
                  { value: "YOUTUBE", label: "رابط YouTube", icon: Link2 },
                ] as const).map((option) => {
                  const Icon = option.icon;
                  const active = form.sourceType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          sourceType: option.value,
                          file: option.value === "YOUTUBE" ? null : current.file,
                        }))
                      }
                      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${active ? "bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {form.sourceType === "UPLOAD" ? (
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">الفيديو</span>
                <span className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4 text-sm font-black text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                  <UploadCloud className="h-6 w-6" />
                  {form.file?.name || (editingId && form.sourceType === "UPLOAD" ? "اختيار فيديو بديل (اختياري)" : "اختيار ملف MP4")}
                  <input
                    type="file"
                    accept="video/mp4,.mp4"
                    required={!editingId || videos.find((video) => video.id === editingId)?.sourceType === "YOUTUBE"}
                    onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                    className="sr-only"
                  />
                </span>
              </label>
            ) : (
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">رابط فيديو YouTube</span>
                <input
                  type="url"
                  required
                  value={form.youtubeUrl}
                  onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-bold outline-none focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  dir="ltr"
                />
                <span className="block text-xs font-bold text-slate-400">أدخل رابط فيديو YouTube صالحًا.</span>
              </label>
            )}
            <fieldset className="lg:col-span-2"><legend className="text-sm font-black text-slate-700 dark:text-slate-200">الفئة المستهدفة</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{GUIDANCE_VIDEO_TARGET_ROLES.map((role) => <label key={role} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.targetRoles.includes(role)} onChange={(event) => setForm((current) => ({ ...current, targetRoles: event.target.checked ? [...current.targetRoles, role] : current.targetRoles.filter((item) => item !== role) }))} className="h-4 w-4 accent-sky-600" />{GUIDANCE_VIDEO_ROLE_LABELS[role]}</label>)}</div></fieldset>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} className="h-5 w-5 accent-sky-600" />نشر الفيديو للمستخدمين المستهدفين</label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 dark:border-slate-700 dark:text-slate-300">إلغاء</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? <BrandLoader variant="button" size="xs" label={null} /> : <Save className="h-4 w-4" />}{editingId ? "حفظ التعديلات" : "حفظ الفيديو"}</button></div>
        </form>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-5"><h2 className="text-xl font-black text-slate-950 dark:text-white">الفيديوهات المضافة</h2><p className="mt-1 text-sm font-bold text-slate-400">{videos.length} فيديو</p></div>
        {loading ? <BrandLoader variant="section" label="جاري تحميل الفيديوهات..." /> : null}
        {!loading && sortedVideos.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-700"><Film className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-600 dark:text-slate-300">لم تتم إضافة فيديوهات إرشادية بعد.</p></div> : null}
        {!loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sortedVideos.map((video) => <article key={video.id} className="flex flex-col rounded-3xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><PlayCircle className="h-5 w-5" /></span><div className="flex flex-wrap justify-end gap-1.5"><span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{video.sourceType === "YOUTUBE" ? "YouTube" : "مرفوع"}</span><span className={`rounded-full px-3 py-1 text-[11px] font-black ${video.isPublished ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"}`}>{video.isPublished ? "منشور" : "مخفي"}</span></div></div><h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{video.title}</h3>{video.description ? <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{video.description}</p> : null}<div className="mt-4 flex flex-wrap gap-1.5">{video.targetRoles.map((role) => <span key={role} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{GUIDANCE_VIDEO_ROLE_LABELS[role]}</span>)}</div><p className="mt-4 truncate text-xs font-bold text-slate-400" title={video.originalFileName ?? undefined}>{video.sourceType === "YOUTUBE" ? "رابط YouTube" : video.originalFileName}</p><dl className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-slate-400"><div><dt>الحجم</dt><dd className="mt-1 text-slate-600 dark:text-slate-300">{formatBytes(video.sizeBytes)}</dd></div><div><dt>الترتيب</dt><dd className="mt-1 text-slate-600 dark:text-slate-300">{video.sortOrder}</dd></div><div><dt>تاريخ الإضافة</dt><dd className="mt-1 text-slate-600 dark:text-slate-300">{formatDate(video.createdAt)}</dd></div></dl><div className="mt-auto grid grid-cols-2 gap-2 pt-5"><button type="button" onClick={() => setPreviewVideo(video)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><Eye className="h-4 w-4" />معاينة</button><button type="button" onClick={() => startEdit(video)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-300"><Pencil className="h-4 w-4" />تعديل</button><button type="button" disabled={saving} onClick={() => void togglePublish(video)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{video.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{video.isPublished ? "إخفاء" : "نشر"}</button><button type="button" onClick={() => setDeleteTarget(video)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><Trash2 className="h-4 w-4" />حذف</button></div></article>)}</div> : null}
      </section>

      <GuidanceVideoPlayerDialog video={previewVideo} onClose={() => setPreviewVideo(null)} />
      <SmartActionModal open={Boolean(deleteTarget)} title="حذف الفيديو الإرشادي؟" description={deleteTarget?.sourceType === "UPLOAD" ? "سيُحذف الفيديو وملفه المخزن نهائيًا، ولا يمكن التراجع عن هذا الإجراء." : "سيُحذف رابط الفيديو من المنصة نهائيًا، ولا يمكن التراجع عن هذا الإجراء."} variant="danger" confirmLabel="حذف الفيديو" loading={deleting} onConfirm={() => void deleteVideo()} onClose={() => setDeleteTarget(null)} />
    </main>
  );
}
