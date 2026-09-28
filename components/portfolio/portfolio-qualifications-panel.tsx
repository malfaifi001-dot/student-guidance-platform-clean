"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { PORTFOLIO_IMAGE_ACCEPT, validatePortfolioImageFile } from "@/lib/portfolio/portfolio-image-upload";
import type { PortfolioWorkspaceItem, PortfolioItemType } from "@/lib/portfolio/portfolio-types";

type UploadResult = { attachmentUrl: string; attachmentMimeType: "image/jpeg" | "image/png" | "image/webp"; attachmentKind: "IMAGE" };
type QualificationForm = Omit<PortfolioWorkspaceItem, "id" | "sortOrder">;

const ORGANIZATIONS = ["وزارة التعليم", "الإدارة العامة للتعليم", "مكتب التعليم", "المدرسة", "المعهد الوطني للتطوير المهني التعليمي", "المؤسسة العامة للتدريب التقني والمهني", "جامعة أو كلية", "معهد أو مركز تدريب", "منصة تدريب إلكترونية", "جهة حكومية أخرى", "أخرى"];
const GENERIC_ORGANIZATIONS = new Set(["جامعة أو كلية", "معهد أو مركز تدريب", "منصة تدريب إلكترونية", "جهة حكومية أخرى", "أخرى"]);
const DELIVERY_TYPES = ["متزامن", "غير متزامن", "مدمج", "حضوري", "عن بُعد"];
const DURATION_UNITS = ["ساعات", "أيام", "أسابيع", "شهور"];
const typeLabels = { QUALIFICATION: "مؤهل", COURSE: "دورة", CERTIFICATE: "شهادة" } as const;

const emptyItem: QualificationForm = { type: "QUALIFICATION" as PortfolioItemType, title: "", issuer: "", organizationCategory: "", date: "", startDate: "", endDate: "", deliveryType: "", hours: "", durationValue: "", durationUnit: "", description: "", attachmentUrl: "", attachmentMimeType: "", attachmentKind: "", externalUrl: "", isVisible: true };

function hasImageAttachment(item: Pick<PortfolioWorkspaceItem, "attachmentUrl" | "attachmentMimeType" | "attachmentKind">) {
  return Boolean(item.attachmentUrl) && (item.attachmentKind === "IMAGE" || item.attachmentMimeType.startsWith("image/") || /\.(?:jpe?g|png|webp)(?:\?.*)?$/i.test(item.attachmentUrl));
}

function isHttpUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; }
}

export function PortfolioQualificationsPanel({ items, busy, onUpload, onCreate, onUpdate, onMove, onDelete }: { items: PortfolioWorkspaceItem[]; busy: boolean; onUpload: (file: File) => Promise<UploadResult>; onCreate: (body: unknown) => Promise<void>; onUpdate: (id: string, body: unknown) => Promise<void>; onMove: (id: string, direction: "up" | "down") => Promise<void>; onDelete: (item: PortfolioWorkspaceItem) => void; }) {
  const [editing, setEditing] = useState<PortfolioWorkspaceItem | null | "new">(null);
  const [form, setForm] = useState(emptyItem);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const objectUrlRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  function releaseObjectUrl() { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  function close() { releaseObjectUrl(); setEditing(null); setSelectedFile(null); setPreviewUrl(""); setValidationError(""); setPhase("idle"); }
  function open(item?: PortfolioWorkspaceItem) {
    releaseObjectUrl();
    const next = item ? { ...emptyItem, ...item, organizationCategory: item.organizationCategory || (ORGANIZATIONS.includes(item.issuer) ? item.issuer : ""), startDate: item.startDate || item.date, durationValue: item.durationValue || item.hours, durationUnit: item.durationUnit || (item.hours ? "ساعات" : ""), externalUrl: item.externalUrl || (!hasImageAttachment(item) && /^https?:\/\//i.test(item.attachmentUrl) ? item.attachmentUrl : "") } : emptyItem;
    setEditing(item || "new"); setSelectedFile(null); setValidationError(""); setPreviewUrl(item && hasImageAttachment(item) ? item.attachmentUrl : ""); setForm(next);
  }
  function set(key: keyof QualificationForm, value: string | boolean) { setForm((old) => ({ ...old, [key]: value })); setValidationError(""); }
  function chooseOrganization(category: string) { setForm((old) => ({ ...old, organizationCategory: category, issuer: GENERIC_ORGANIZATIONS.has(category) ? "" : category })); setValidationError(""); }
  function chooseImage(file?: File) { if (!file) return; const error = validatePortfolioImageFile(file); if (error) { setValidationError(error); return; } releaseObjectUrl(); const objectUrl = URL.createObjectURL(file); objectUrlRef.current = objectUrl; setSelectedFile(file); setPreviewUrl(objectUrl); setValidationError(""); }
  function removeImage() { releaseObjectUrl(); setSelectedFile(null); setPreviewUrl(""); setForm((old) => ({ ...old, attachmentUrl: "", attachmentMimeType: "", attachmentKind: "" })); }
  async function submit() {
    if (submittingRef.current || busy) return;
    const title = form.title.trim(); const issuer = form.issuer.trim(); const externalUrl = form.externalUrl.trim();
    if (title.length < 2) return setValidationError("العنوان مطلوب.");
    if (!issuer || form.organizationCategory === "أخرى" && issuer === "أخرى") return setValidationError("أدخل اسم الجهة الفعلي.");
    if (form.type === "COURSE" && !form.deliveryType) return setValidationError("اختر نمط الدورة.");
    if (form.type === "QUALIFICATION" && form.deliveryType) return setValidationError("نمط الدورة خاص بالدورات فقط.");
    if (form.startDate && form.endDate && form.endDate < form.startDate) return setValidationError("تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.");
    if (form.durationValue && (!/^\d+(?:\.\d+)?$/.test(form.durationValue) || !form.durationUnit)) return setValidationError("أدخل مدة رقمية واختر وحدتها.");
    if (externalUrl && !isHttpUrl(externalUrl)) return setValidationError("أدخل رابطًا يبدأ بـ http:// أو https://.");
    if (!form.attachmentUrl && !externalUrl && !selectedFile) return setValidationError("أرفق صورة الشهادة أو أدخل رابطًا خارجيًا واحدًا على الأقل.");
    submittingRef.current = true; setSubmitting(true);
    try {
      let nextForm: QualificationForm = { ...form, title, issuer, externalUrl, date: form.startDate && form.endDate ? `${form.startDate} - ${form.endDate}` : form.startDate || form.date };
      if (selectedFile) { setPhase("uploading"); nextForm = { ...nextForm, ...(await onUpload(selectedFile)) }; setForm(nextForm); setSelectedFile(null); releaseObjectUrl(); setPreviewUrl(nextForm.attachmentUrl); }
      setPhase("saving"); if (editing === "new") await onCreate(nextForm); else if (editing) await onUpdate(editing.id, { action: "update", ...nextForm }); close();
    } catch { /* Workspace feedback presents the API error in Arabic. */ } finally { submittingRef.current = false; setSubmitting(false); setPhase("idle"); }
  }

  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">المؤهلات والدورات والشهادات</h2><p className="mt-1 text-sm font-bold text-slate-500">وثّق إنجازاتك بصورتها أو برابطها، ورتّب ظهورها في الملف.</p></div><button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة عنصر</button></div>
    <div className="mt-5 space-y-3">{items.length ? items.map((item, index) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{hasImageAttachment(item) ? <img src={item.attachmentUrl} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}</div><div className="min-w-0"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{typeLabels[item.type]}</span><h3 className="mt-2 truncate font-black text-slate-900">{item.title}</h3><p className="mt-1 text-xs font-bold text-slate-500">{[item.issuer, item.startDate || item.date, item.endDate, item.deliveryType, item.durationValue && item.durationUnit ? `${item.durationValue} ${item.durationUnit}` : ""].filter(Boolean).join(" · ") || "دون تفاصيل إضافية"}</p><p className="mt-1 text-xs font-black text-teal-700">{hasImageAttachment(item) ? "صورة مرفقة" : item.externalUrl ? "رابط خارجي" : "دون مصدر توثيق"} · {item.isVisible ? "ظاهر" : "مخفي"}</p></div></div><div className="flex flex-wrap gap-2"><button disabled={busy || index === 0} onClick={() => void onMove(item.id, "up")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك لأعلى"><ArrowUp className="h-4 w-4" /></button><button disabled={busy || index === items.length - 1} onClick={() => void onMove(item.id, "down")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك لأسفل"><ArrowDown className="h-4 w-4" /></button><button disabled={busy} onClick={() => void onUpdate(item.id, { action: "update", isVisible: !item.isVisible })} className="rounded-xl border p-2" aria-label="تغيير الظهور">{item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button disabled={busy} onClick={() => open(item)} className="rounded-xl border p-2" aria-label="تعديل"><Pencil className="h-4 w-4" /></button><button disabled={busy} onClick={() => onDelete(item)} className="rounded-xl border border-rose-200 p-2 text-rose-600" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div></article>) : <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-black text-slate-400">لم تضف مؤهلات أو دورات بعد.</div>}</div>
    {editing ? <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing === "new" ? "إضافة عنصر" : "تعديل العنصر"}</h2><button type="button" disabled={submitting} onClick={close}><X /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-black">النوع<select value={form.type} onChange={(event) => { const type = event.target.value as PortfolioItemType; setForm((old) => ({ ...old, type, deliveryType: type === "QUALIFICATION" ? "" : old.deliveryType })); }} className="mt-2 w-full rounded-2xl border p-3">{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-black">العنوان<input required value={form.title} onChange={(event) => set("title", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" /></label>
      <label className="text-sm font-black">الجهة المقدمة أو المانحة<select value={form.organizationCategory} onChange={(event) => chooseOrganization(event.target.value)} className="mt-2 w-full rounded-2xl border p-3"><option value="">اختر الجهة</option>{ORGANIZATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      {(GENERIC_ORGANIZATIONS.has(form.organizationCategory) || !form.organizationCategory) ? <label className="text-sm font-black">اسم الجهة<input value={form.issuer} onChange={(event) => set("issuer", event.target.value)} className="mt-2 w-full rounded-2xl border p-3" placeholder="مثال: جامعة الملك سعود" /></label> : null}
      {form.type === "COURSE" ? <label className="text-sm font-black">نمط الدورة<select value={form.deliveryType} onChange={(event) => set("deliveryType", event.target.value)} className="mt-2 w-full rounded-2xl border p-3"><option value="">اختر النمط</option>{DELIVERY_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : null}
      <div className="md:col-span-2"><span className="text-sm font-black">التواريخ</span><div className="mt-2 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">تاريخ البداية<input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(form.startDate) ? form.startDate : ""} onChange={(event) => set("startDate", event.target.value)} className="mt-1 w-full rounded-2xl border p-3 text-sm text-slate-900" /></label><label className="text-xs font-bold text-slate-500">تاريخ النهاية<input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(form.endDate) ? form.endDate : ""} onChange={(event) => set("endDate", event.target.value)} className="mt-1 w-full rounded-2xl border p-3 text-sm text-slate-900" /></label></div>{form.date && !/^\d{4}-\d{2}-\d{2}/.test(form.date) && !form.startDate ? <p className="mt-1 text-xs font-bold text-amber-700">التاريخ المحفوظ سابقًا: {form.date}</p> : null}</div>
      <label className="text-sm font-black">المدة<div className="mt-2 flex gap-2"><input inputMode="decimal" value={form.durationValue} onChange={(event) => set("durationValue", event.target.value)} className="min-w-0 flex-1 rounded-2xl border p-3" placeholder="12" /><select value={form.durationUnit} onChange={(event) => set("durationUnit", event.target.value)} className="w-32 rounded-2xl border p-3"><option value="">الوحدة</option>{DURATION_UNITS.map((value) => <option key={value} value={value}>{value}</option>)}</select></div></label>
      <label className="text-sm font-black md:col-span-2">رابط الدورة أو الشهادة<input type="url" dir="ltr" value={form.externalUrl} onChange={(event) => set("externalUrl", event.target.value)} className="mt-2 w-full rounded-2xl border p-3 text-left" placeholder="https://..." /><span className="mt-1 block text-xs font-bold text-slate-500">اختياري إذا أرفقت صورة الشهادة.</span></label>
    </div><div className="mt-5"><p className="text-sm font-black text-slate-800">صورة الشهادة</p>{previewUrl ? <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3"><img src={previewUrl} alt="معاينة صورة الشهادة" className="mx-auto max-h-56 w-full object-contain" /><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black"><Upload className="h-4 w-4" />استبدال الصورة<input type="file" accept={PORTFOLIO_IMAGE_ACCEPT} onChange={(event) => chooseImage(event.target.files?.[0])} className="sr-only" /></label><button type="button" onClick={removeImage} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-600">إزالة الصورة</button></div></div> : <label className="mt-3 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center"><Upload className="h-7 w-7 text-teal-700" /><strong className="mt-2 text-sm text-slate-800">اختر صورة من الجهاز</strong><span className="mt-1 text-xs font-bold text-slate-500">JPG أو PNG أو WEBP، بحد أقصى 5MB</span><input type="file" accept={PORTFOLIO_IMAGE_ACCEPT} onChange={(event) => chooseImage(event.target.files?.[0])} className="sr-only" /></label>}{validationError ? <p className="mt-3 text-sm font-bold text-rose-600" role="alert">{validationError}</p> : null}</div><button disabled={busy || submitting} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{phase === "uploading" ? "جارٍ رفع الصورة..." : phase === "saving" ? "جارٍ حفظ العنصر..." : "حفظ العنصر"}</button></form></div> : null}
  </section>;
}
