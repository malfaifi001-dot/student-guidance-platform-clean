import type { ReactNode } from "react";

import {
  ReportSmartA4ContentRegion,
  type ReportSmartA4LayoutResult,
} from "./report-smart-a4-layout";
import type { ReportSmartA4PriorityMode } from "./report-smart-a4-config";

export type ReportDesignSmartContentProps = {
  availableHeightMm: number;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  layoutKey?: string | number;
  priorityMode?: ReportSmartA4PriorityMode;
  onLayoutResult?: (result: ReportSmartA4LayoutResult) => void;
};

export function ReportDesignSmartContent({
  availableHeightMm,
  children,
  className,
  contentClassName,
  layoutKey,
  priorityMode = "signature",
  onLayoutResult,
}: ReportDesignSmartContentProps) {
  return (
    <ReportSmartA4ContentRegion
      heightMm={availableHeightMm}
      className={className}
      contentClassName={contentClassName}
      layoutKey={layoutKey}
      priorityMode={priorityMode}
      onLayoutResult={onLayoutResult}
    >
      {children}
    </ReportSmartA4ContentRegion>
  );
}
