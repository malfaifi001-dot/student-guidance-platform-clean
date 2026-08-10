"use client";

import { A4DesignPage } from "@/components/report-engine/design-renderers/shared/report-blocks";

import type { ReportDesignId } from "@/components/report-engine/design-renderers/report-design-types";

import type {
  PreviewCaseData,
} from "@/components/report-engine/design-renderers/shared/report-types";

import type {
  PhysicalLayoutFrozenSettings,
  PhysicalLayoutPage,
  PhysicalLayoutPlan,
} from "@/lib/report-engine/physical-layout/physical-layout-types";

import {
  PhysicalLayoutFrozenProvider,
} from "./physical-layout-frozen-context";

type PhysicalLayoutRendererProps = {
  designId: ReportDesignId;

  plan: PhysicalLayoutPlan;

  context: Record<string, string>;

  previewCase: PreviewCaseData | null;

  renderMode?: "single" | "stack";

  activePageId?: string;

  activePhysicalPageId?: string;

  fallbackPageLabel?: string;
};

/**
 * أي Physical Page تصل إلى Final Renderer
 * يجب أن تكون مجمدة.
 *
 * fallback هنا دفاعي فقط للخطط القديمة الموجودة في الذاكرة
 * أثناء التطوير.
 *
 * Final Renderer لا يسمح أبدًا بعودة Smart A4 negotiation.
 */
const FALLBACK_FROZEN_LAYOUT:
  PhysicalLayoutFrozenSettings = {
  candidate:
    "normal-comfortable",

  density:
    "normal",

  fieldLayout:
    "comfortable",
};

function resolveFrozenLayout(
  page: PhysicalLayoutPage,
): PhysicalLayoutFrozenSettings {
  const frozen =
    page.frozenLayout;

  /**
   * إذا Measurement أعطتنا Layout كاملة،
   * نعيد نفس Object الموجودة داخل الخطة المجمدة.
   *
   * مهم:
   * لا ننشئ Object جديدة في كل Render حتى لا يعيد
   * Frozen Context تشغيل Smart A4 lifecycle بلا داعٍ.
   */
  if (
    frozen?.candidate &&
    frozen.density &&
    frozen.fieldLayout
  ) {
    return frozen;
  }

  return FALLBACK_FROZEN_LAYOUT;
}

function getVisiblePages({
  plan,
  renderMode,
  activePageId,
  activePhysicalPageId,
}: {
  plan: PhysicalLayoutPlan;

  renderMode:
    | "single"
    | "stack";

  activePageId?: string;

  activePhysicalPageId?: string;
}) {
  if (
    renderMode ===
    "stack"
  ) {
    return plan.pages;
  }

  if (
    activePhysicalPageId
  ) {
    const exactPhysicalPage =
      plan.pages.find(
        (page) =>
          page.id ===
          activePhysicalPageId,
      );

    if (
      exactPhysicalPage
    ) {
      return [
        exactPhysicalPage,
      ];
    }
  }

  if (activePageId) {
    const logicalPage =
      plan.pages.find(
        (page) =>
          page
            .sourceLogicalPageId ===
            activePageId ||
          page.sourcePageIds?.includes(
            activePageId,
          ),
      );

    if (logicalPage) {
      return [
        logicalPage,
      ];
    }
  }

  return plan.pages.length
    ? [plan.pages[0]]
    : [];
}

export function PhysicalLayoutRenderer({
  designId,
  plan,
  context,
  previewCase,
  renderMode = "stack",
  activePageId,
  activePhysicalPageId,
  fallbackPageLabel = "التقرير",
}: PhysicalLayoutRendererProps) {
  const visiblePages =
    getVisiblePages({
      plan,
      renderMode,
      activePageId,
      activePhysicalPageId,
    });

  if (
    visiblePages.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      data-physical-layout-renderer="true"
      data-physical-layout-frozen="true"
      data-physical-layout-pages={
        plan.pages.length
      }
      data-physical-layout-fingerprint={
        plan.fingerprint
      }
      className={
        renderMode === "stack"
          ? "space-y-5 print:space-y-0"
          : ""
      }
    >
      {visiblePages.map(
        (page) => {
          const frozenLayout =
            resolveFrozenLayout(
              page,
            );

          return (
            <div
              key={page.id}
              data-physical-page-id={
                page.id
              }
              data-source-logical-page-id={
                page.sourceLogicalPageId
              }
              data-physical-page-role={
                page.role
              }
              data-physical-page-index={
                page.physicalPageIndex
              }
              data-physical-index-within-logical-page={
                page.physicalIndexWithinLogicalPage
              }
              data-physical-page-contains-evidence={
                String(
                  page.containsEvidence,
                )
              }
              data-physical-page-contains-signature={
                String(
                  page.containsSignature,
                )
              }
              data-physical-layout-candidate={
                frozenLayout.candidate ||
                ""
              }
              data-physical-layout-density={
                frozenLayout.density ||
                ""
              }
              data-physical-layout-field-layout={
                frozenLayout.fieldLayout ||
                ""
              }
            >
              <PhysicalLayoutFrozenProvider
                value={
                  frozenLayout
                }
              >
                <A4DesignPage
                  designId={
                    designId
                  }
                  page={
                    {
                      id:
                        page.id,

                      title:
                        page.title,

                      kind:
                        page.kind,

                      blocks:
                        page.blocks,
                    } as any
                  }
                  context={
                    context
                  }
                  previewCase={
                    previewCase
                  }
                  pageLabel={
                    page.title ||
                    fallbackPageLabel
                  }
                />
              </PhysicalLayoutFrozenProvider>
            </div>
          );
        },
      )}
    </div>
  );
}