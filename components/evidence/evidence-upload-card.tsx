"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type EvidenceUploadCardProps = {
  onUploaded: (items: EvidenceItem[]) => void;
};

export function EvidenceUploadCard({ onUploaded }: EvidenceUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFiles(files: FileList) {
    setIsUploading(true);

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
        throw new Error("فشل رفع الشواهد.");
      }

      onUploaded(data.items || []);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 p-8 text-center transition hover:border-sky-400 hover:bg-sky-100">
      <UploadCloud className="h-12 w-12 text-sky-600" />

      <h3 className="mt-4 text-2xl font-black text-slate-900">رفع الشواهد</h3>

      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
        ارفع صور أو ملفات تخص تنفيذ البرنامج الإرشادي.
      </p>

      <div className="mt-5 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white">
        {isUploading ? "جاري الرفع..." : "اختيار الملفات"}
      </div>

      <input
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        disabled={isUploading}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) uploadFiles(event.target.files);
        }}
      />
    </label>
  );
}