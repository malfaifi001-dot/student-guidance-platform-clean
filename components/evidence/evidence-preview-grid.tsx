"use client";

import { EvidenceItemCard } from "@/components/evidence/evidence-item-card";

type EvidencePreviewGridProps = {
  items: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    size: number;
  }>;
  onDelete?: (id: string) => void;
};

export function EvidencePreviewGrid({ items, onDelete }: EvidencePreviewGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-400">
        لا توجد شواهد مضافة حاليًا.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <EvidenceItemCard key={item.id} item={item} onDelete={onDelete} />
      ))}
    </div>
  );
}