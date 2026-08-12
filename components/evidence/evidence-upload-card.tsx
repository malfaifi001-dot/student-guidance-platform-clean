"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { OperationProgressPopCard } from "@/components/feedback/operation-progress-pop-card";
import { MAX_EVIDENCE_FILES, MAX_EVIDENCE_FILES_MESSAGE } from "@/lib/evidence/evidence-limits";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
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
  const uploadActiveRef = useRef(false);
  const remainingCapacity = Math.max(0, MAX_EVIDENCE_FILES - existingEvidenceCount);
  const uploadDisabled = isUploading || remainingCapacity === 0;

  async function uploadFiles(files: FileList) {
    if (uploadActiveRef.current) return;

    if (remainingCapacity === 0 || files.length > remainingCapacity) {
      onUploadError?.(MAX_EVIDENCE_FILES_MESSAGE);
      return;
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

      return;
    }

    if (!onUploaded) {
      uploadActiveRef.current = false;
      setIsUploading(false);
      return;
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل رفع الشواهد.");
      }

      onUploaded(data.items || []);
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error.message : "تعذر رفع الشواهد.",
      );
    } finally {
      uploadActiveRef.current = false;
      setIsUploading(false);
    }
  }

  return (
    <>
      <label
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
          accept="image/*,.pdf,.doc,.docx"
          disabled={uploadDisabled}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              void uploadFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
      </label>
      <OperationProgressPopCard
        open={isUploading}
        title="جاري رفع الشواهد"
        message="يتم الآن رفع الشواهد، الرجاء الانتظار..."
      />
    </>
  );
}
