"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { OperationProgressPopCard } from "@/components/feedback/operation-progress-pop-card";
import {
  EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILES_MESSAGE,
  MAX_EVIDENCE_TOTAL_SIZE,
} from "@/lib/evidence/evidence-limits";
import type { EvidencePresentationMode } from "@/lib/evidence/evidence-presentation";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  sourceType?: "IMAGE" | "FILE" | "LINK";
  presentationMode?: EvidencePresentationMode;
  note?: string;
};

type EvidenceUploadCardProps = {
  onUploaded?: (items: EvidenceItem[]) => void;
  onFilesSelected?: (files: FileList) => void | Promise<void>;
  existingEvidenceCount: number;
  onUploadError?: (message: string) => void;
};

export function EvidenceUploadCard({
  onUploaded,
  onFilesSelected,
  existingEvidenceCount,
  onUploadError,
}: EvidenceUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [nativeCameraAvailable, setNativeCameraAvailable] = useState(false);
  const uploadActiveRef = useRef(false);
  const remainingCapacity = Math.max(0, MAX_EVIDENCE_FILES - existingEvidenceCount);
  const uploadDisabled = isUploading || remainingCapacity === 0;
  const [mode, setMode] = useState<"FILE" | "LINK">("FILE");
  const [link, setLink] = useState("");
  const [linkPresentation, setLinkPresentation] = useState<EvidencePresentationMode>("CLICKABLE_LINK");

  useEffect(() => {
    setNativeCameraAvailable(Capacitor.isNativePlatform());
  }, []);

  async function uploadFiles(files: FileList): Promise<boolean> {
    if (uploadActiveRef.current) return false;

    if (remainingCapacity === 0 || files.length > remainingCapacity) {
      onUploadError?.(MAX_EVIDENCE_FILES_MESSAGE);
      return false;
    }

    if (
      !onFilesSelected &&
      Array.from(files).reduce((total, file) => total + file.size, 0) >
        MAX_EVIDENCE_TOTAL_SIZE
    ) {
      onUploadError?.(EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE);
      return false;
    }

    uploadActiveRef.current = true;
    setIsUploading(true);

    if (onFilesSelected) {
      try {
        await onFilesSelected(files);
      } finally {
        uploadActiveRef.current = false;
        setIsUploading(false);
      }

      return true;
    }

    if (!onUploaded) {
      uploadActiveRef.current = false;
      setIsUploading(false);
      return false;
    }

    try {
      const formData = new FormData();

      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/dashboard/evidence", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (
        response.status === 413 ||
        data?.code === "EVIDENCE_UPLOAD_TOO_LARGE"
      ) {
        onUploadError?.(EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE);
        return true;
      }

      if (!response.ok) {
        throw new Error(data?.error || "فشل رفع الشواهد.");
      }

      onUploaded(data.items || []);
      return true;
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error.message : "تعذر رفع الشواهد.",
      );
      return true;
    } finally {
      uploadActiveRef.current = false;
      setIsUploading(false);
    }
  }

  async function addLink() {
    const value = link.trim();
    if (!/^https?:\/\//i.test(value)) {
      onUploadError?.("أدخل رابطًا يبدأ بـ http:// أو https://.");
      return;
    }
    if (!onUploaded) {
      onUploadError?.("تعذر إضافة الرابط في هذا السياق.");
      return;
    }
    onUploaded([{
      id: `link-${Date.now()}`,
      fileName: value.replace(/^https?:\/\//i, "").slice(0, 120),
      fileUrl: value,
      mimeType: "",
      size: 0,
      sourceType: "LINK",
      presentationMode: linkPresentation,
    }]);
    setLink("");
  }

  async function captureNativeImage() {
    if (uploadDisabled || !Capacitor.isNativePlatform()) return;

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        source: CameraSource.Prompt,
        resultType: CameraResultType.Uri,
        allowEditing: false,
      });
      const source = photo.webPath || photo.path;
      if (!source) return;

      const response = await fetch(source);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `teachix-evidence-${Date.now()}.jpg`,
        { type: blob.type || "image/jpeg" },
      );
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      await uploadFiles(dataTransfer.files);
    } catch (error) {
      if ((error as { message?: string })?.message !== "User cancelled photos app") {
        onUploadError?.("تعذر فتح الكاميرا أو اختيار الصورة.");
      }
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("FILE")} className={mode === "FILE" ? "rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white" : "rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"}>صورة أو ملف</button>
        <button type="button" onClick={() => setMode("LINK")} className={mode === "LINK" ? "rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white" : "rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"}>رابط</button>
      </div>
      {mode === "FILE" ? <label
        aria-disabled={uploadDisabled}
        className={[
          "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 p-8 text-center transition",
          uploadDisabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-sky-400 hover:bg-sky-100",
        ].join(" ")}
      >
        <UploadCloud className="h-12 w-12 text-sky-600" />

      <h3 className="mt-4 text-2xl font-black text-slate-900">رفع الشواهد</h3>

      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
        ارفع صور أو ملفات تخص تنفيذ البرنامج الإرشادي.
      </p>

      <div className="mt-5 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white">
        {isUploading
          ? "جاري الرفع..."
          : remainingCapacity === 0
            ? "تم بلوغ الحد الأقصى"
            : "اختيار الملفات"}
      </div>

        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          disabled={uploadDisabled}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              const input = event.currentTarget;
              void uploadFiles(event.target.files).then((shouldReset) => {
                if (shouldReset) input.value = "";
              });
            }
          }}
        />
      </label> : <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://example.com" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLinkPresentation("CLICKABLE_LINK")} className={linkPresentation === "CLICKABLE_LINK" ? "rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white" : "rounded-xl border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"}>عرض كرابط</button>
          <button type="button" onClick={() => setLinkPresentation("QR")} className={linkPresentation === "QR" ? "rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white" : "rounded-xl border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"}>عرض كـ QR</button>
          <button type="button" disabled={!link.trim() || uploadDisabled} onClick={() => void addLink()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900">إضافة الرابط</button>
        </div>
      </div>}
      {nativeCameraAvailable ? (
        <button
          type="button"
          onClick={() => void captureNativeImage()}
          disabled={uploadDisabled}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-200 px-5 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
        >
          التقاط صورة أو اختيارها
        </button>
      ) : null}
      <OperationProgressPopCard
        open={isUploading}
        title="جاري رفع الشواهد"
        message="يتم الآن رفع الشواهد، الرجاء الانتظار..."
      />
    </>
  );
}
