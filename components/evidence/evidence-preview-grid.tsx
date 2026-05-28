"use client";

import { EvidenceItemCard } from "@/components/evidence/evidence-item-card";

type EvidencePreviewGridProps = {
  items: any[];
  onDelete?: (id: string) => void;
};

export function EvidencePreviewGrid({
  items,
  onDelete,
}: EvidencePreviewGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm font-bold text-slate-400">
        لا توجد مرفقات مضافة حاليًا.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <EvidenceItemCard
          key={item.id}
          item={item}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}