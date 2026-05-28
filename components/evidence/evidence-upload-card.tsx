"use client";

import { UploadCloud } from "lucide-react";

type EvidenceUploadCardProps = {
  onFilesSelected: (files: FileList) => void;
};

export function EvidenceUploadCard({
  onFilesSelected,
}: EvidenceUploadCardProps) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-sky-200 bg-sky-50 p-10 text-center transition hover:border-sky-400 hover:bg-sky-100">
      <UploadCloud className="h-14 w-14 text-sky-600" />

      <h3 className="mt-5 text-2xl font-black text-slate-900">
        رفع الشواهد والمرفقات
      </h3>

      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
        يمكنك رفع صور، ملفات PDF، أو مستندات داعمة مرتبطة بالحالة.
      </p>

      <div className="mt-6 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white">
        اختر الملفات
      </div>

      <input
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            onFilesSelected(event.target.files);
          }
        }}
      />
    </label>
  );
}