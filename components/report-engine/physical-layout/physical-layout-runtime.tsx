"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { A4DesignPage } from "@/components/report-engine/design-renderers/shared/report-blocks";
import { BrandLoader } from "@/components/common/brand-loader";

import type { ReportDesignId } from "@/components/report-engine/design-renderers/report-design-types";

import type { PreviewCaseData } from "@/components/report-engine/design-renderers/shared/report-types";

import type {
  ReportTwoPhysicalNavigationItem,
} from "@/components/report-engine/design-renderers/smart-layout/report-smart-physical-types";

import {
  createSemanticInputFingerprint,
  ReportSmartSemanticFingerprintProvider,
} from "@/components/report-engine/design-renderers/smart-layout/report-smart-lifecycle";

import {
  buildPhysicalLogicalPages,
} from "@/lib/report-engine/physical-layout/physical-layout-blocks";

import {
  buildPhysicalLayoutPlan,
} from "@/lib/report-engine/physical-layout/physical-layout-planner";

import type {
  PhysicalLayoutCandidate,
  PhysicalLayoutLogicalPage,
  PhysicalLayoutMeasurement,
  PhysicalLayoutPlan,
  PhysicalLayoutSourcePage,
} from "@/lib/report-engine/physical-layout/physical-layout-types";

import {
  PhysicalLayoutRenderer,
} from "./physical-layout-renderer";

/**
 * ============================================================
 * PHYSICAL LAYOUT RUNTIME
 * ============================================================
 *
 * المسؤوليات الوحيدة:
 *
 * 1. تحويل صفحات Studio إلى Logical Pages.
 * 2. تشغيل Measurement مخفي.
 * 3. تمرير نتائج القياس إلى Planner.
 * 4. استلام PhysicalLayoutPlan المجمدة.
 * 5. Commit الخطة النهائية دفعة واحدة.
 *
 * Runtime لا يقرر Pagination بنفسه.
 * Renderer لا يرى أي Candidate وسيط.
 */

type PhysicalLayoutRuntimeProps = {
  designId: ReportDesignId;

  pages: Array<{
    id?: string;
    title?: string;
    kind?: string;
    blocks?: any[];
    [key: string]: any;
  }>;

  activePageId?: string;
  activePhysicalPageId?: string;

  context: Record<string, string>;
  previewCase: PreviewCaseData | null;

  fallbackPageLabel?: string;

  renderMode?: "single" | "stack";

  onPhysicalPagesChange?: (
    items: ReportTwoPhysicalNavigationItem[],
  ) => void;
  loadingLabel?: string;
  showLoadingWhilePreparing?: boolean;
  onPhysicalLayoutReady?: (designId: ReportDesignId) => void;
};

type PendingMeasurement = {
  id: number;

  generation: number;

  candidate: PhysicalLayoutCandidate;

  resolve: (
    result: PhysicalLayoutMeasurement,
  ) => void;
};

type CommittedPhysicalLayout = {
  semanticKey: string;

  designId: ReportDesignId;

  plan: PhysicalLayoutPlan;

  context: Record<string, string>;

  previewCase: PreviewCaseData | null;
};

function toNavigationItems(
  plan: PhysicalLayoutPlan,
): ReportTwoPhysicalNavigationItem[] {
  return plan.pages.map(
    (page, index) => {
      const role:
        ReportTwoPhysicalNavigationItem["role"] =
        page.containsSignature
          ? "signature"
          : page.containsEvidence
            ? "evidence"
            : "primary";

      return {
        physicalPageId:
          page.id,

        corePhysicalPageId:
          page.id,

        sourceLogicalPageId:
          page.sourceLogicalPageId,

        /**
         * Compatibility مع Navigation الحالي فقط.
         *
         * Physical Page واحدة تنتمي دائمًا إلى
         * Logical Page واحدة.
         */
        sourcePageIds: [
          page.sourceLogicalPageId,
        ],

        label:
          page.title,

        physicalPageIndex:
          index,

        physicalIndexWithinLogicalPage:
          page.physicalIndexWithinLogicalPage,

        role,
      };
    },
  );
}

export function PhysicalLayoutRuntime({
  designId,
  pages,
  activePageId,
  activePhysicalPageId,
  context,
  previewCase,
  fallbackPageLabel = "التقرير",
  renderMode = "stack",
  onPhysicalPagesChange,
  loadingLabel = "جارٍ تجهيز التقرير...",
  showLoadingWhilePreparing = false,
  onPhysicalLayoutReady,
}: PhysicalLayoutRuntimeProps) {
  /**
   * ==========================================================
   * STABLE SOURCE
   * ==========================================================
   */

  const sourcePages =
    useMemo<
      PhysicalLayoutSourcePage[]
    >(
      () =>
        (pages || []).map(
          (page, index) => ({
            id:
              String(
                page?.id ||
                  `logical-page-${index + 1}`,
              ),

            title:
              String(
                page?.title ||
                  `صفحة ${index + 1}`,
              ),

            kind:
              String(
                page?.kind ||
                  "content",
              ),

            blocks:
              Array.isArray(
                page?.blocks,
              )
                ? page.blocks
                : [],
          }),
        ),
      [pages],
    );

  const logicalPages =
    useMemo(
      () =>
        buildPhysicalLogicalPages(
          sourcePages,
        ),
      [sourcePages],
    );

  /**
   * المرجع يحدث في كل Render.
   *
   * Build Effect لا يعتمد على reference الخاص بـ logicalPages.
   * يعتمد على semanticKey فقط.
   */
  const logicalPagesRef =
    useRef<
      PhysicalLayoutLogicalPage[]
    >(logicalPages);

  logicalPagesRef.current =
    logicalPages;

  /**
   * ==========================================================
   * SEMANTIC IDENTITY
   * ==========================================================
   *
   * إعادة التخطيط تحصل فقط عندما تتغير البيانات الفعلية
   * التي تؤثر على التقرير.
   */

  const semanticKey =
    useMemo(
      () =>
        createSemanticInputFingerprint({
          designId,

          pages:
            sourcePages,

          context,

          previewCase,
        }),
      [
        designId,
        sourcePages,
        context,
        previewCase,
      ],
    );

  /**
   * ==========================================================
   * ATOMIC COMMIT
   * ==========================================================
   *
   * لا نخزن plan وحدها.
   *
   * التصميم + الخطة + البيانات التي تم القياس بها
   * تنتقل إلى الشاشة دفعة واحدة.
   *
   * أثناء بناء نسخة جديدة تبقى آخر نسخة مكتملة ظاهرة.
   */

  const [
    committedLayout,
    setCommittedLayout,
  ] =
    useState<
      CommittedPhysicalLayout | null
    >(null);

  /**
   * الخطة المجمدة لكل Semantic Input.
   *
   * الرجوع إلى تصميم سبق قياسه لا يحتاج إعادة بناء كاملة.
   */
  const planCacheRef =
    useRef(
      new Map<
        string,
        CommittedPhysicalLayout
      >(),
    );

  /**
   * ==========================================================
   * MEASUREMENT WORKER STATE
   * ==========================================================
   */

  const [
    pendingMeasurement,
    setPendingMeasurement,
  ] =
    useState<
      PendingMeasurement | null
    >(null);

  const measurementRootRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const measurementSequenceRef =
    useRef(0);

  const buildGenerationRef =
    useRef(0);

  /**
   * ==========================================================
   * HIDDEN DOM MEASUREMENT
   * ==========================================================
   *
   * يوجد Candidate واحد فقط في DOM في أي لحظة.
   *
   * ننتظر Smart A4 حتى يصل إلى FROZEN.
   * ثم نقرأ:
   *
   * fits
   * overflowPx
   * candidate
   * density
   * fieldLayout
   *
   * ونرسلها للـ Planner.
   */

  useLayoutEffect(() => {
    if (!pendingMeasurement) {
      return;
    }

    let disposed = false;

    let frame:
      | number
      | null = null;

    let attempts = 0;

    const completeMeasurement = (
      result: PhysicalLayoutMeasurement,
    ) => {
      if (disposed) {
        return;
      }

      const completed =
        pendingMeasurement;

      /**
       * أولًا نزيل DOM measurement الحالية.
       */
      setPendingMeasurement(
        (current) =>
          current?.id ===
          completed.id
            ? null
            : current,
      );

      /**
       * ثم نسمح للـ Planner بطلب Candidate التالية.
       *
       * فصل المرحلتين يمنع Candidate جديدة من الكتابة
       * فوق القديمة قبل أن React يزيل DOM السابق.
       */
      window.setTimeout(
        () => {
          completed.resolve(
            result,
          );
        },
        0,
      );
    };

    const inspect = () => {
      if (disposed) {
        return;
      }

      frame =
        window.requestAnimationFrame(
          () => {
            frame = null;

            if (disposed) {
              return;
            }

            attempts += 1;

            const root =
              measurementRootRef.current;

            const viewport =
              root?.querySelector<HTMLElement>(
                ".report-smart-a4-content",
              );

            /**
             * Smart A4 ما زال يتفاوض.
             */
            if (
              !viewport ||
              viewport.dataset
                .smartA4Phase !==
                "FROZEN"
            ) {
              /**
               * حماية من دورة لا تنتهي.
               *
               * لا نسقط أي Block.
               * نرجع overflow للـ Planner وهو يضع المحتوى
               * في Physical Page مستقلة عند الحاجة.
               */
              if (
                attempts >= 240
              ) {
                completeMeasurement({
                  fits: false,

                  overflowPx:
                    Number.POSITIVE_INFINITY,
                });

                return;
              }

              inspect();

              return;
            }

            const rawOverflow =
              Number(
                viewport.getAttribute(
                  "data-smart-a4-overflow-px",
                ) ||
                  viewport.dataset
                    .smartA4OverflowPx ||
                  "0",
              );

            const readMetric = (
              attributeName: string,
            ) => {
              const value = Number(
                viewport.getAttribute(
                  attributeName,
                ) || "0",
              );

              return Number.isFinite(value)
                ? value
                : 0;
            };

            completeMeasurement({
              fits:
                viewport.dataset
                  .reportOverflow ===
                "fit",

              overflowPx:
                Number.isFinite(
                  rawOverflow,
                )
                  ? rawOverflow
                  : 0,

              blockOverflowPx:
                readMetric(
                  "data-smart-a4-block-overflow-px",
                ),

              scrollOverflowPx:
                readMetric(
                  "data-smart-a4-scroll-overflow-px",
                ),

              boundingOverflowPx:
                readMetric(
                  "data-smart-a4-bounding-overflow-px",
                ),

              mainContentOverflowPx:
                readMetric(
                  "data-smart-a4-main-content-overflow-px",
                ),

              candidate:
                viewport.dataset
                  .smartA4Candidate,

              density:
                viewport.dataset
                  .reportDensity,

              fieldLayout:
                viewport.dataset
                  .reportFieldLayout,
            });
          },
        );
    };

    inspect();

    return () => {
      disposed = true;

      if (
        frame !== null
      ) {
        window.cancelAnimationFrame(
          frame,
        );
      }
    };
  }, [
    pendingMeasurement,
  ]);

  /**
   * ==========================================================
   * BUILD PHYSICAL PLAN
   * ==========================================================
   */

  useEffect(() => {
    /**
     * إذا لدينا نفس الخطة مسبقًا:
     *
     * Commit مباشر.
     * لا قياس.
     * لا Loading.
     */
    const cached =
      planCacheRef.current.get(
        semanticKey,
      );

    if (cached) {
      setCommittedLayout(
        cached,
      );

      return;
    }

    const generation =
      ++buildGenerationRef.current;

    const logicalPagesSnapshot =
      logicalPagesRef.current;

    let disposed = false;

    /**
     * Measurement function خاصة بهذه الدورة فقط.
     */
    const measureForBuild = (
      candidate: PhysicalLayoutCandidate,
    ) =>
      new Promise<PhysicalLayoutMeasurement>(
        (resolve) => {
          /**
           * لا تسمح لدورة قديمة بفتح Measurement جديدة.
           */
          if (
            disposed ||
            buildGenerationRef.current !==
              generation
          ) {
            resolve({
              fits: false,

              overflowPx:
                Number.POSITIVE_INFINITY,
            });

            return;
          }

          const id =
            ++measurementSequenceRef.current;

          setPendingMeasurement({
            id,
            generation,
            candidate,
            resolve,
          });
        },
      );

    void buildPhysicalLayoutPlan({
      logicalPages:
        logicalPagesSnapshot,

      measure:
        measureForBuild,
    }).then(
      (nextPlan) => {
        /**
         * Build قديمة انتهت بعد بدء Build أحدث.
         *
         * نتيجتها لا يسمح لها بالظهور.
         */
        if (
          disposed ||
          buildGenerationRef.current !==
            generation
        ) {
          return;
        }

        const nextCommitted:
          CommittedPhysicalLayout = {
            semanticKey,

            designId,

            plan:
              nextPlan,

            context,

            previewCase,
          };

        /**
         * Cache أولًا.
         */
        planCacheRef.current.set(
          semanticKey,
          nextCommitted,
        );

        /**
         * ثم Atomic Commit.
         *
         * هذه هي اللحظة الوحيدة التي تتغير فيها
         * النسخة المرئية للمستخدم.
         */
        setCommittedLayout(
          nextCommitted,
        );
      },
    );

    return () => {
      disposed = true;

      /**
       * إذا كانت لهذه الدورة Measurement معلقة،
       * نحرر Promise حتى لا يبقى Planner عالقًا.
       *
       * لا نمس Measurement تخص Generation أحدث.
       */
      setPendingMeasurement(
        (current) => {
          if (
            !current ||
            current.generation !==
              generation
          ) {
            return current;
          }

          current.resolve({
            fits: false,

            overflowPx:
              Number.POSITIVE_INFINITY,
          });

          return null;
        },
      );
    };
  }, [
    semanticKey,
  ]);

  /**
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  useEffect(() => {
    if (
      !committedLayout ||
      !onPhysicalPagesChange
    ) {
      return;
    }

    onPhysicalPagesChange(
      toNavigationItems(
        committedLayout.plan,
      ),
    );
  }, [
    committedLayout,
    onPhysicalPagesChange,
  ]);

  useEffect(() => {
    if (!committedLayout || committedLayout.designId !== designId) return;
    onPhysicalLayoutReady?.(committedLayout.designId);
  }, [committedLayout, designId, onPhysicalLayoutReady]);

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <>
      {pendingMeasurement ? (
        <div
          ref={
            measurementRootRef
          }
          data-report-measurement-only="true"
          data-physical-layout-measurement-id={
            pendingMeasurement.id
          }
          data-physical-layout-generation={
            pendingMeasurement.generation
          }
          aria-hidden="true"
          style={{
            position:
              "fixed",

            left:
              "-100000px",

            top:
              0,

            width:
              "210mm",

            visibility:
              "hidden",

            pointerEvents:
              "none",

            contain:
              "layout style paint",

            zIndex:
              -100,
          }}
        >
          <ReportSmartSemanticFingerprintProvider
            fingerprint={
              createSemanticInputFingerprint({
                semanticKey,

                measurementId:
                  pendingMeasurement.id,

                generation:
                  pendingMeasurement.generation,

                candidate: {
                  sourcePageId:
                    pendingMeasurement
                      .candidate
                      .sourcePageId,

                  role:
                    pendingMeasurement
                      .candidate
                      .role,

                  kind:
                    pendingMeasurement
                      .candidate
                      .kind,

                  blocks:
                    pendingMeasurement
                      .candidate
                      .blocks,
                },
              })
            }
          >
            <A4DesignPage
              key={
                pendingMeasurement.id
              }
              designId={
                designId
              }
              page={
                {
                  id:
                    `physical-measure-${pendingMeasurement.id}`,

                  title:
                    pendingMeasurement
                      .candidate
                      .sourcePageTitle,

                  kind:
                    pendingMeasurement
                      .candidate
                      .kind,

                  blocks:
                    pendingMeasurement
                      .candidate
                      .blocks,
                } as any
              }
              context={
                context
              }
              previewCase={
                previewCase
              }
              pageLabel={
                pendingMeasurement
                  .candidate
                  .sourcePageTitle ||
                fallbackPageLabel
              }
            />
          </ReportSmartSemanticFingerprintProvider>
        </div>
      ) : null}

      {committedLayout &&
      (!showLoadingWhilePreparing || committedLayout.designId === designId) ? (
        <PhysicalLayoutRenderer
          /**
           * مهم جدًا:
           *
           * لا نستخدم designId الحالية مباشرة.
           * نستخدم التصميم الذي اكتملت خطته مع الخطة نفسها.
           *
           * إذا اختار المستخدم تصميمًا جديدًا أثناء القياس،
           * تبقى النسخة السابقة مستقرة حتى اكتمال الجديدة.
           */
          designId={
            committedLayout.designId
          }
          plan={
            committedLayout.plan
          }
          context={
            committedLayout.context
          }
          previewCase={
            committedLayout.previewCase
          }
          renderMode={
            renderMode
          }
          activePageId={
            activePageId
          }
          activePhysicalPageId={
            activePhysicalPageId
          }
          fallbackPageLabel={
            fallbackPageLabel
          }
        />
      ) : (
        /**
         * يظهر فقط عند فتح التقرير لأول مرة
         * قبل وجود أي خطة مكتملة.
         *
         * بعد أول Commit لن نعود إلى هذه الشاشة
         * أثناء تبديل التصميم أو إعادة القياس.
         */
        <div
          className="flex min-h-[320px] items-center justify-center text-center print:hidden"
          data-physical-layout-initializing
        >
          <BrandLoader
            variant="inline"
            size="lg"
            label={loadingLabel}
            className="flex-col gap-4 [&>span:last-child]:text-base [&>span:last-child]:text-slate-500 [&>span:last-child]:sm:text-lg [&>span:last-child]:dark:text-slate-300"
          />
        </div>
      )}
    </>
  );
}
