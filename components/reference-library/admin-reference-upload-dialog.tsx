"use client";

import {
  FileUp,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";

type AudienceMode = "INHERIT" | "COUNSELOR" | "ALL_USERS";

export function AdminReferenceUploadDialog({
  open,
  parentId,
  parentTitle,
  onClose,
  onUploaded,
}: {
  open: boolean;
  parentId: string | null;
  parentTitle: string | null;
  onClose: () => void;
  onUploaded: (message: string) => void;
}) {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    "PUBLISHED",
  );
  const [allowDownload, setAllowDownload] = useState(true);
  const [addSchoolCover, setAddSchoolCover] = useState(true);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(
    parentId ? "INHERIT" : "COUNSELOR",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setPdfFile(null);
    setDocxFile(null);
    setTitle("");
    setDescription("");
    setStatus("PUBLISHED");
    setAllowDownload(true);
    setAddSchoolCover(true);
    setAudienceMode(parentId ? "INHERIT" : "COUNSELOR");
    setBusy(false);
    setError("");

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }

    if (docxInputRef.current) {
      docxInputRef.current.value = "";
    }
  }, [open, parentId]);

  if (!open) {
    return null;
  }

  function applyDefaultTitle(selectedFile: File) {
    if (!title.trim()) {
      setTitle(selectedFile.name.replace(/\.(pdf|docx)$/i, ""));
    }
  }

  function selectPdfFile(selectedFile: File | null) {
    setError("");

    if (!selectedFile) {
      setPdfFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("اختر ملف PDF في خانة نسخة PDF للمعاينة.");
      setPdfFile(null);
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("حجم ملف PDF يتجاوز 50 ميجابايت.");
      setPdfFile(null);
      return;
    }

    setPdfFile(selectedFile);
    applyDefaultTitle(selectedFile);
  }

  function selectDocxFile(selectedFile: File | null) {
    setError("");

    if (!selectedFile) {
      setDocxFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      setError("اختر ملف Word بصيغة DOCX في خانة نسخة Word للتحميل.");
      setDocxFile(null);
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("حجم ملف Word يتجاوز 50 ميجابايت.");
      setDocxFile(null);
      return;
    }

    setDocxFile(selectedFile);
    applyDefaultTitle(selectedFile);
  }

  async function submit() {
    if (!parentId) {
      setError("افتح حقيبة أو قسمًا أولًا ثم ارفع الملف داخله.");
      return;
    }

    if (!pdfFile && !docxFile) {
      setError("ارفع نسخة PDF أو نسخة Word واحدة على الأقل.");
      return;
    }

    if (!title.trim()) {
      setError("اكتب عنوان الملف.");
      return;
    }

    setBusy(true);
    setError("");

    const formData = new FormData();

    if (pdfFile) {
      formData.set("pdfFile", pdfFile);
    }

    if (docxFile) {
      formData.set("docxFile", docxFile);
    }

    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("parentId", parentId);
    formData.set("status", status);
    formData.set("sortOrder", "0");
    formData.set("allowDownload", String(allowDownload));
    formData.set("addSchoolCover", String(addSchoolCover));
    formData.set("inheritAudience", String(audienceMode === "INHERIT"));

    const audiences =
      audienceMode === "ALL_USERS"
        ? [
            {
              audienceType: "ALL_USERS",
            },
          ]
        : [
            {
              audienceType: "ROLE",
              role: "COUNSELOR",
            },
          ];

    formData.set("audiences", JSON.stringify(audiences));

    try {
      const response = await fetch(
        "/api/dashboard/admin/counselor-reference-library/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر رفع الملف.");
      }

      onUploaded(payload?.message || "تم رفع الملف بنجاح.");
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر رفع الملف.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="my-6 w-full max-w-2xl rounded-[32px] border border-white/70 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <UploadCloud className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                رفع ملف جديد
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                {parentTitle
                  ? `سيحفظ داخل: ${parentTitle}`
                  : "يجب فتح حقيبة أو قسم قبل رفع الملف."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FileSelector
              label="نسخة PDF للمعاينة"
              helper="اختياري، يستخدم للمعاينة ويمكن تحميله عند السماح."
              file={pdfFile}
              busy={busy}
              accept=".pdf,application/pdf"
              inputRef={pdfInputRef}
              onSelect={selectPdfFile}
            />

            <FileSelector
              label="نسخة Word للتحميل"
              helper="اختياري، DOCX للتحميل فقط دون معاينة."
              file={docxFile}
              busy={busy}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              inputRef={docxInputRef}
              onSelect={selectDocxFile}
            />
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              عنوان الملف
            </span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="عنوان واضح يظهر للمستخدم"
              className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              الوصف
            </span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="وصف مختصر لمحتوى الملف"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                حالة النشر
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "DRAFT" | "PUBLISHED")
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                <option value="PUBLISHED">منشور</option>
                <option value="DRAFT">مسودة</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                المستفيدون
              </span>

              <select
                value={audienceMode}
                onChange={(event) =>
                  setAudienceMode(event.target.value as AudienceMode)
                }
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none"
              >
                {parentId ? (
                  <option value="INHERIT">
                    نفس مستفيدي المجلد
                  </option>
                ) : null}
                <option value="COUNSELOR">
                  الموجهون الطلابيون
                </option>
                <option value="ALL_USERS">
                  جميع المستخدمين
                </option>
              </select>
            </label>
          </div>

          {pdfFile ? (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
              <div>
                <p className="text-sm font-black text-sky-950">
                  إضافة غلاف هوية المدرسة
                </p>
                <p className="mt-1 text-xs font-bold leading-6 text-sky-700">
                  يضاف غلاف رسمي تلقائيًا كأول صفحة في نسخة PDF.
                </p>
              </div>

              <input
                type="checkbox"
                checked={addSchoolCover}
                onChange={(event) => setAddSchoolCover(event.target.checked)}
                className="h-5 w-5 rounded border-sky-300 accent-sky-600"
              />
            </label>
          ) : null}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div>
              <p className="text-sm font-black text-slate-900">
                السماح بالتحميل
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                يستطيع المستخدم تنزيل النسخ المتاحة عند تفعيل هذا الخيار.
              </p>
            </div>

            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(event) => setAllowDownload(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 accent-sky-600"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={busy || !parentId}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            رفع الملف
          </button>
        </div>
      </div>
    </div>
  );
}

function FileSelector({
  label,
  helper,
  file,
  busy,
  accept,
  inputRef,
  onSelect,
}: {
  label: string;
  helper: string;
  file: File | null;
  busy: boolean;
  accept: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (file: File | null) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex min-h-40 w-full flex-col items-center justify-center rounded-[26px] border-2 border-dashed border-sky-200 bg-sky-50/60 px-5 py-7 text-center transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm">
          <FileUp className="h-6 w-6" />
        </div>

        <p className="mt-4 font-black text-slate-950">
          {file ? file.name : label}
        </p>

        <p className="mt-2 text-xs font-bold text-slate-500">
          {helper}
        </p>

        {file ? (
          <p className="mt-2 text-xs font-black text-sky-700">
            {formatFileSize(file.size)}
          </p>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} بايت`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} كيلوبايت`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} ميجابايت`;
}
