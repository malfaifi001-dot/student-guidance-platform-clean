"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { PORTFOLIO_IMAGE_ACCEPT, validatePortfolioImageFile } from "@/lib/portfolio/portfolio-image-upload";
import type { PortfolioWorkspaceItem, PortfolioItemType } from "@/lib/portfolio/portfolio-types";

type UploadResult = {
  attachmentUrl: string;
  attachmentMimeType: "image/jpeg" | "image/png" | "image/webp";
  attachmentKind: "IMAGE";
};

type QualificationForm = Omit<PortfolioWorkspaceItem, "id" | "sortOrder">;

const emptyItem: QualificationForm = {
  type: "QUALIFICATION" as PortfolioItemType,
  title: "",
  issuer: "",
  date: "",
  hours: "",
  description: "",
  attachmentUrl: "",
  attachmentMimeType: "",
  attachmentKind: "",
  isVisible: true,
};
const typeLabels = { QUALIFICATION: "مؤهل", COURSE: "دورة", CERTIFICATE: "شهادة" } as const;

function hasImageAttachment(item: Pick<PortfolioWorkspaceItem, "attachmentUrl" | "attachmentMimeType" | "attachmentKind">) {
  return Boolean(item.attachmentUrl) && (item.attachmentKind === "IMAGE" || item.attachmentMimeType.startsWith("image/") || /\.(?:jpe?g|png|webp)(?:\?.*)?$/i.test(item.attachmentUrl));
}

export function PortfolioQualificationsPanel({ items, busy, onUpload, onCreate, onUpdate, onMove, onDelete }: {
  items: PortfolioWorkspaceItem[];
  busy: boolean;
  onUpload: (file: File) => Promise<UploadResult>;
  onCreate: (body: unknown) => Promise<void>;
  onUpdate: (id: string, body: unknown) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
  onDelete: (item: PortfolioWorkspaceItem) => void;
}) {
  const [editing, setEditing] = useState<PortfolioWorkspaceItem | null | "new">(null);
  const [form, setForm] = useState(emptyItem);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const objectUrlRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  function releaseObjectUrl() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }
  function close() {
    releaseObjectUrl();
    setEditing(null);
    setSelectedFile(null);
    setPreviewUrl("");
    setValidationError("");
    setPhase("idle");
  }
  function open(item?: PortfolioWorkspaceItem) {
    releaseObjectUrl();
    setEditing(item || "new");
    setSelectedFile(null);
    setValidationError("");
    setPreviewUrl(item && hasImageAttachment(item) ? item.attachmentUrl : "");
    setForm(item ? {
      type: item.type,
      title: item.title,
      issuer: item.issuer,
      date: item.date,
      hours: item.hours,
      description: item.description,
      attachmentUrl: item.attachmentUrl,
      attachmentMimeType: item.attachmentMimeType,
      attachmentKind: item.attachmentKind,
      isVisible: item.isVisible,
    } : emptyItem);
  }
  function set(key: keyof typeof form, value: string | boolean) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  function chooseImage(file?: File) {
    if (!file) return;
    const error = validatePortfolioImageFile(file);
    if (error) {
      setValidationError(error);
      return;
    }
    releaseObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setValidationError("");
  }
  function removeImage() {
    releaseObjectUrl();
    setSelectedFile(null);
    setPreviewUrl("");
    setValidationError("");
    setForm((old) => ({ ...old, attachmentUrl: "", attachmentMimeType: "", attachmentKind: "" }));
  }
  async function submit() {
    if (submittingRef.current || busy) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      let nextForm = form.attachmentUrl ? form : { ...form, attachmentMimeType: "" as const, attachmentKind: "" as const };
      if (selectedFile) {
        setPhase("uploading");
        const uploaded = await onUpload(selectedFile);
        nextForm = { ...form, ...uploaded };
        setForm(nextForm);
        setSelectedFile(null);
        releaseObjectUrl();
        setPreviewUrl(uploaded.attachmentUrl);
      }
      setPhase("saving");
      if (editing === "new") await onCreate(nextForm);
      else if (editing) await onUpdate(editing.id, { action: "update", ...nextForm });
      close();
    } catch {
      // The workspace request layer displays the Arabic feedback pop card.
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setPhase("idle");
    }
  }

  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">المؤهلات والدورات والشهادات</h2><p className="mt-1 text-sm font-bold text-slate-500">أضف العناصر وصورها ورتّب ظهورها في الملف.</p></div><button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة عنصر</button></div>
    <div className="mt-5 space-y-3">{items.length ? items.map((item, index) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4"><div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{hasImageAttachment(item) ? <img src={item.attachmentUrl} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}</div><div className="min-w-0"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{typeLabels[item.type]}</span><h3 className="mt-2 truncate font-black text-slate-900">{item.title}</h3><p className="mt-1 text-xs font-bold text-slate-500">{[item.issuer, item.date, item.hours ? `${item.hours} ساعة` : ""].filter(Boolean).join(" · ") || "دون تفاصيل إضافية"}</p><p className={`mt-1 text-xs font-black ${hasImageAttachment(item) ? "text-teal-700" : "text-slate-400"}`}>{hasImageAttachment(item) ? "صورة مرفقة" : "لا توجد صورة مرفقة"} · {item.isVisible ? "ظاهر" : "مخفي"}</p></div></div>
      <div className="flex flex-wrap gap-2"><button disabled={busy || index === 0} onClick={() => void onMove(item.id, "up")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك لأعلى"><ArrowUp className="h-4 w-4" /></button><button disabled={busy || index === items.length - 1} onClick={() => void onMove(item.id, "down")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك لأسفل"><ArrowDown className="h-4 w-4" /></button><button disabled={busy} onClick={() => void onUpdate(item.id, { action: "update", isVisible: !item.isVisible })} className="rounded-xl border p-2" aria-label="تغيير الظهور">{item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button onClick={() => open(item)} className="rounded-xl border p-2" aria-label="تعديل"><Pencil className="h-4 w-4" /></button><button onClick={() => onDelete(item)} className="rounded-xl border border-rose-200 p-2 text-rose-600" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>
    </article>) : <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-black text-slate-400">لم تضف مؤهلات أو دورات بعد.</div>}</div>
    {editing ? <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4" dir="rtl"><form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing === "new" ? "إضافة عنصر" : "تعديل العنصر"}</h2><button type="button" disabled={submitting} onClick={close}><X /></button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-black">النوع<select value={form.type} onChange={(event) => set("type", event.target.value)} className="mt-2 w-full rounded-2xl border p-3">{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-black">العنوان<input required minLength={2} value={form.title} onChange={(event) => set("title", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label><label className="text-sm font-black">الجهة<input value={form.issuer} onChange={(event) => set("issuer", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label><label className="text-sm font-black">التاريخ<input value={form.date} onChange={(event) => set("date", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label><label className="text-sm font-black">عدد الساعات<input value={form.hours} onChange={(event) => set("hours", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label><label className="text-sm font-black md:col-span-2">الوصف<textarea rows={3} value={form.description} onChange={(event) => set("description", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label></div>
      <div className="mt-5"><p className="text-sm font-black text-slate-800">رفع صورة المؤهل أو الشهادة</p><p className="mt-1 text-xs font-bold text-slate-500">JPG أو PNG أو WEBP، بحد أقصى 5MB.</p>{previewUrl ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3"><img src={previewUrl} alt="معاينة الصورة المرفقة" className="mx-auto max-h-64 w-full object-contain" /><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black"><Upload className="h-4 w-4" />استبدال الصورة<input type="file" accept={PORTFOLIO_IMAGE_ACCEPT} onChange={(event) => chooseImage(event.target.files?.[0])} className="sr-only" /></label><button type="button" onClick={removeImage} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-600">إزالة الصورة</button></div></div> : <label className="mt-3 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-teal-500"><Upload className="h-7 w-7 text-teal-700" /><strong className="mt-3 text-sm text-slate-800">اختر صورة من الجهاز</strong><span className="mt-1 text-xs font-bold text-slate-500">ستظهر المعاينة هنا قبل الحفظ</span><input type="file" accept={PORTFOLIO_IMAGE_ACCEPT} onChange={(event) => chooseImage(event.target.files?.[0])} className="sr-only" /></label>}{validationError ? <p className="mt-2 text-sm font-bold text-rose-600">{validationError}</p> : null}<details className="mt-3 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-black text-slate-600">رابط صورة متقدم (اختياري)</summary><input type="text" dir="ltr" value={form.attachmentUrl} onChange={(event) => { set("attachmentUrl", event.target.value); setPreviewUrl(event.target.value); }} placeholder="https://... أو /uploads/..." className="mt-3 w-full rounded-xl border p-3 text-left text-sm" /></details></div>
      <button disabled={busy || submitting || Boolean(validationError)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{phase === "uploading" ? "جار رفع الصورة..." : phase === "saving" ? "جار حفظ العنصر..." : "حفظ العنصر"}</button>
    </form></div> : null}
  </section>;
}
