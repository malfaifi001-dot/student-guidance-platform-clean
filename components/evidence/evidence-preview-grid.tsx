"use client";

import type { ReactNode } from "react";
import {
  EvidenceItemCard,
  type EvidenceCardItem,
} from "@/components/evidence/evidence-item-card";

type EvidencePreviewGridProps = {
  items: EvidenceCardItem[];
  onDelete?: (id: string) => void;
  actionsForItem?: (item: EvidenceCardItem) => ReactNode;
  footerForItem?: (item: EvidenceCardItem) => ReactNode;
  compact?: boolean;
};

export function EvidencePreviewGrid({
  items,
  onDelete,
  actionsForItem,
  footerForItem,
  compact = false,
}: EvidencePreviewGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-400">
        لا توجد شواهد مضافة حاليًا.
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "grid gap-4 md:grid-cols-2"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {items.map((item) => (
        <EvidenceItemCard
          key={item.id}
          item={item}
          onDelete={onDelete}
          actions={actionsForItem?.(item)}
          footer={footerForItem?.(item)}
          compact={compact}
        />
      ))}
    </div>
  );
}
