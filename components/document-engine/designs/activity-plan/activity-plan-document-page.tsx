import type {
  ReactNode,
} from "react";

import {
  DocumentContentZone,
  DocumentFooterZone,
  DocumentPage,
} from "@/components/document-engine";

type ActivityPlanDocumentPageProps = {
  children: ReactNode;

  footer?: ReactNode;

  className?: string;
  contentClassName?: string;

  /**
   * Some Activity Plan variants intentionally use growing flow
   * because their table may extend beyond one minimum A4 height.
   */
  flow?: boolean;
};

export function ActivityPlanDocumentPage({
  children,
  footer,
  className = "",
  contentClassName = "",
  flow = false,
}: ActivityPlanDocumentPageProps) {
  return (
    <DocumentPage
      orientation="landscape"
      direction="rtl"
      fixedHeight={!flow}
      className={[
        "activity-plan-print-page",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <DocumentContentZone
        className={[
          "activity-plan-print-page-content",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </DocumentContentZone>

      {footer ? (
        <DocumentFooterZone className="activity-plan-print-footer-slot">
          {footer}
        </DocumentFooterZone>
      ) : null}
    </DocumentPage>
  );
}