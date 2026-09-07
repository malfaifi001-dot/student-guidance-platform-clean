"use client";

import { useRef, useState } from "react";
import { SignaturePad, type SignaturePadHandle } from "@/components/signatures/signature-pad";

type SignatureKind = "principal" | "activityLeader" | "counselor" | "teacher";
type Props = {
  kind: SignatureKind;
  title: string;
  signerName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void> | void;
  onSaveUpload: (file: File) => Promise<void> | void;
};

const MAX_FILE_SIZE = 2_000_000;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function SchoolSignaturePadModal({ kind, title, signerName, saving, onClose, onSave, onSaveUpload }: Props) {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [draftSignature, setDraftSignature] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const signaturePadRef = useRef<SignaturePadHandle | null>(null);

  async function selectFile(candidate: File | null) {
    setError("");
    setPreview("");
    setFile(null);
    if (!candidate) return;
    if (!ACCEPTED_TYPES.has(candidate.type)) {
      setError("اختر صورة بصيغة PNG أو JPG أو JPEG أو WEBP.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("حجم صورة التوقيع يجب ألا يتجاوز 2 ميجابايت.");
      return;
    }
    setFile(candidate);
    setProcessing(true);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", candidate);
      body.set("preview", "true");
      const response = await fetch("/api/dashboard/settings/school/signature", { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || typeof payload.previewDataUrl !== "string") throw new Error(payload?.error || "تعذر معالجة صورة التوقيع.");
      setPreview(payload.previewDataUrl);
    } catch (reason) {
      setFile(null);
      setError(reason instanceof Error ? reason.message : "تعذر معالجة صورة التوقيع.");
    } finally {
      setProcessing(false);
    }
  }

  function chooseAnother() {
    setFile(null);
    setPreview("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center" dir="rtl">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-2xl font-black text-slate-950">{title}</h3><p className="mt-2 text-sm font-bold text-slate-500">اختر طريقة إضافة التوقيع ثم احفظه بعد ظهور المعاينة.</p></div>
          <button type="button" onClick={onClose} disabled={saving || processing} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">إغلاق</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode("draw"); setError(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-black ${mode === "draw" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>رسم التوقيع</button>
          <button type="button" onClick={() => { setMode("upload"); setError(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-black ${mode === "upload" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>رفع صورة التوقيع</button>
        </div>

        {mode === "draw" ? <>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-inner"><SignaturePad ref={signaturePadRef} disabled={saving} onChange={setDraftSignature} /></div>
          <p className="mt-3 text-xs font-black text-slate-500">الاسم المعتمد للتوقيع: {signerName}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between"><button type="button" onClick={() => signaturePadRef.current?.clear()} disabled={saving} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50">مسح التوقيع</button><button type="button" onClick={() => onSave(draftSignature)} disabled={!draftSignature || saving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جاري الحفظ..." : "حفظ التوقيع"}</button></div>
        </> : <>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0] || null)} />
          {!preview ? <button type="button" onClick={() => inputRef.current?.click()} disabled={processing || saving} className="mt-5 flex min-h-48 w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-sky-300 bg-sky-50 px-5 text-center text-sm font-black text-sky-700 disabled:opacity-50"><span className="text-lg">اختر صورة التوقيع</span><span className="mt-2 text-xs font-bold text-sky-600">PNG أو JPG أو JPEG أو WEBP · بحد أقصى 2 ميجابايت</span></button> : <div className="mt-5 rounded-[1.5rem] border border-slate-300 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5"><img src={preview} alt="معاينة التوقيع بعد إزالة الخلفية" className="mx-auto h-48 w-full object-contain" /></div>}
          {processing ? <p className="mt-3 text-sm font-black text-sky-700">جاري فحص الصورة وإزالة الخلفية...</p> : null}
          {file && preview ? <p className="mt-3 text-xs font-black text-slate-500">تمت معالجة الصورة وتحويلها إلى PNG بخلفية شفافة.</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between"><button type="button" onClick={() => { setMode("draw"); setError(""); }} disabled={saving || processing} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50">العودة للرسم</button><div className="flex gap-2"><button type="button" onClick={chooseAnother} disabled={saving || processing} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50">اختيار صورة أخرى</button><button type="button" onClick={() => file && onSaveUpload(file)} disabled={!file || !preview || processing || saving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جاري الحفظ..." : "حفظ التوقيع"}</button></div></div>
        </>}
      </section>
    </div>
  );
}
