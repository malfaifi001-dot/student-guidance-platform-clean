"use client";

import { FileText, ImageIcon, Trash2 } from "lucide-react";

type EvidenceItemCardProps = {
  item: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    size: number;
  };
  onDelete?: (id: string) => void;
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function EvidenceItemCard({
  item,
  onDelete,
}: EvidenceItemCardProps) {
  const isImage = item.mimeType.startsWith("image");

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {isImage ? (
          <img
            src={item.fileUrl}
            alt={item.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-14 w-14 text-slate-400" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {item.fileName}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {formatSize(item.size)}
            </p>
          </div>

          {isImage ? (
            <ImageIcon className="h-5 w-5 text-slate-400" />
          ) : (
            <FileText className="h-5 w-5 text-slate-400" />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={item.fileUrl}
            target="_blank"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            معاينة
          </a>

          <button
            type="button"
            onClick={() => onDelete?.(item.id)}
            className="rounded-xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}