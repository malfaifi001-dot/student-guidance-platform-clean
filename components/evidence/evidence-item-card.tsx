"use client";

import type { ReactNode } from "react";
import { FileText, ImageIcon, Trash2 } from "lucide-react";

export type EvidenceCardItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  size?: number | null;
  caption?: string | null;
  visible?: boolean;
  sortOrder?: number | null;
};

type EvidenceItemCardProps = {
  item: EvidenceCardItem;
  onDelete?: (id: string) => void;
  actions?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageEvidence(item: EvidenceCardItem) {
  const mimeType = String(item.mimeType || "").toLowerCase();

  if (mimeType.startsWith("image")) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(`${item.fileName} ${item.fileUrl}`);
}

export function EvidenceItemCard({
  item,
  onDelete,
  actions,
  footer,
  compact = false,
}: EvidenceItemCardProps) {
  const isImage = isImageEvidence(item);
  const isHidden = item.visible === false;
  const caption = String(item.caption || "").trim();
  const formattedSize =
    typeof item.size === "number" && Number.isFinite(item.size) && item.size >= 0
      ? formatSize(item.size)
      : null;

  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
        isHidden ? "ring-1 ring-amber-100" : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden bg-slate-100",
          compact ? "aspect-[4/3]" : "aspect-video",
        ].join(" ")}
      >
        {isImage ? (
          <img
            src={item.fileUrl}
            alt={item.fileName}
            className={[
              "h-full w-full object-cover",
              isHidden ? "opacity-75" : "",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-14 w-14 text-slate-400" />
          </div>
        )}

        {isHidden ? (
          <>
            <div className="absolute inset-0 bg-white/30" />
            <div className="absolute left-3 top-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
                مخفي من التقرير
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{item.fileName}</p>

            {caption ? (
              <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">
                {caption}
              </p>
            ) : null}

            {formattedSize ? (
              <p className="mt-1 text-xs text-slate-400">{formattedSize}</p>
            ) : null}
          </div>

          {isImage ? (
            <ImageIcon className="h-5 w-5 text-slate-400" />
          ) : (
            <FileText className="h-5 w-5 text-slate-400" />
          )}
        </div>

        <div className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            معاينة
          </a>

          {actions}

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="rounded-xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {footer ? <div className={compact ? "mt-3" : "mt-4"}>{footer}</div> : null}
      </div>
    </div>
  );
}
