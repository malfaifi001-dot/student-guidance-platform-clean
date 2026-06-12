"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";

import { SaveSmartReportButton } from "@/components/report-engine/save-smart-report-button";
import { SmartReportDocumentRenderer } from "@/components/report-engine/smart-report-document-renderer";
import { SmartReportVariantSelector } from "@/components/report-engine/smart-report-variant-selector";
import { computeReportDraftAdjustments } from "@/lib/report-engine/report-draft-merger";
import { buildReportPages } from "@/lib/report-engine/report-page-builder";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type {
  ReportEvidenceConfig,
  SmartReportCustomBlock,
  SmartReportCustomBlockType,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartReportCasePreviewPageProps = {
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
};

type EditableReportField = {
  key: string;
  label: string;
  value: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  activity_domain: "مجال النشاط",
  execution_mode: "طريقة التنفيذ",
  execution_method: "طريقة التنفيذ",
  planned_sessions: "عدد اللقاءات",
  start_day: "يوم البداية",
  end_day: "يوم النهاية",
  end_week: "أسبوع النهاية",
  end_date: "تاريخ النهاية",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  parents_participated: "مشاركة أولياء الأمور",
  community_partnership_count: "عدد الشراكات المجتمعية",
  semester: "الفصل الدراسي",
  week: "الأسبوع",
  execution_date: "تاريخ التنفيذ",
  target_group: "الفئة المستهدفة",
  executor: "المعلم المنفذ",
};

const VALUE_LABELS: Record<string, string> = {
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  yes: "نعم",
  no: "لا",
  activity_leader: "رائد النشاط",
  counselor: "الموجه الطلابي",
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  scouting: "النشاط الكشفي",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",
};

const IMAGE_SIZE_LABELS: Record<ReportEvidenceConfig["imageSize"], string> = {
  "large-square": "كبير 178×160",
  "small-squares": "عادي 82×82",
  portrait: "طولي 70×95",
  landscape: "عرضي 120×58",
};

const IMAGE_SIZE_ORDER: Array<ReportEvidenceConfig["imageSize"]> = [
  "large-square",
  "small-squares",
  "portrait",
  "landscape",
];

function getReportOrderItems(payload: SmartReportPayload) {
  const items: Array<{
    id: string;
    type: "SYSTEM" | "CUSTOM";
    label: string;
    order: number;
  }> = [];

  if (payload.primaryFields.length || payload.detailFields.length) {
    items.push({
      id: "meta-fields",
      type: "SYSTEM",
      label: "بيانات التقرير",
      order: 100,
    });
  }

  if (payload.narrative?.body) {
    items.push({
      id: "narrative",
      type: "SYSTEM",
      label: "وصف التنفيذ",
      order: 200,
    });
  }

  for (const [index, block] of (payload.customBlocks || []).entries()) {
    items.push({
      id: block.id,
      type: "CUSTOM",
      label: block.title || (block.type === "BULLET_LIST" ? "قائمة نقاط" : "فقرة نصية"),
      order: block.order ?? 300 + index * 10,
    });
  }

  if (payload.evidence.items.length) {
    items.push({
      id: "evidence",
      type: "SYSTEM",
      label: "الشواهد",
      order: 800,
    });
  }

  return items.sort((a, b) => a.order - b.order);
}

function getNewOrderBetween(
  previousOrder: number | null,
  nextOrder: number | null,
) {
  if (previousOrder === null && nextOrder === null) return 300;
  if (previousOrder === null) return nextOrder! - 10;
  if (nextOrder === null) return previousOrder + 10;

  return (previousOrder + nextOrder) / 2;
}
function getFieldLabel(key: string, label: string) {
  if (label && label !== key && !/^[a-z0-9_]+$/i.test(label)) return label;

  return FIELD_LABELS[key] || "";
}

function getFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => getFieldValue(item))
      .filter(Boolean)
      .join("، ");
  }

  const text = String(value).trim();
  const translated = VALUE_LABELS[text.toLowerCase()] || VALUE_LABELS[text];

  if (translated) return translated;
  if (/^[a-z0-9_]+$/i.test(text) && text.includes("_")) return "";

  return text;
}

function isVisibleField(field: EditableReportField) {
  return Boolean(getFieldLabel(field.key, field.label) && getFieldValue(field.value));
}

function createBlock(
  type: SmartReportCustomBlockType,
  targetPageIndex: number,
): SmartReportCustomBlock {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `block-${Date.now()}`;

  if (type === "BULLET_LIST") {
    return {
      id,
      type,
      title: "قائمة نقاط",
      body: "النقطة الأولى\nالنقطة الثانية\nالنقطة الثالثة",
      targetPageIndex,
    };
  }

  return {
    id,
    type,
    title: "عنوان الفقرة",
    body: "اكتب نص الفقرة هنا.",
    targetPageIndex,
  };
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-xs font-black transition",
        active
          ? "bg-emerald-700 text-white shadow-sm"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PanelSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details
      open
      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            {description}
          </p>
        </div>

        <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}


function getReportLiveDraftKey(caseId: string, variantId: string) {
  return `smart-report-live-draft:${caseId}:${variantId}`;
}

function saveReportLiveDraft({
  caseId,
  variantId,
  payload,
  evidenceConfig,
}: {
  caseId: string;
  variantId: string;
  payload: SmartReportPayload;
  evidenceConfig: ReportEvidenceConfig;
}) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getReportLiveDraftKey(caseId, variantId),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      payload,
      evidenceConfig,
    }),
  );
}

function loadReportLiveDraft(caseId: string, variantId: string) {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(
    getReportLiveDraftKey(caseId, variantId),
  );

  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      savedAt?: string;
      payload?: SmartReportPayload;
      evidenceConfig?: ReportEvidenceConfig;
    };
  } catch {
    return null;
  }
}
export function SmartReportCasePreviewPage({
  payload: initialPayload,
  selectedVariantId,
  variants,
}: SmartReportCasePreviewPageProps) {
  const [editablePayload, setEditablePayload] = useState<SmartReportPayload>(
    () => JSON.parse(JSON.stringify(initialPayload)),
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [evidenceConfig, setEvidenceConfig] = useState<ReportEvidenceConfig>(
    () =>
      initialPayload.evidenceConfig || {
        visible: true,
        itemsPerPage: 2,
        showCaptions: false,
        imageSize: "small-squares",
      },
  );

  const reportLiveDraftBootedRef = useRef(false);
  const reportLiveDraftKey = `smart-report-live-draft:${initialPayload.caseInfo.id}:${selectedVariantId}`;

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(reportLiveDraftKey);

      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as {
          payload?: SmartReportPayload;
          evidenceConfig?: ReportEvidenceConfig;
        };

        if (draft.payload?.caseInfo?.id === initialPayload.caseInfo.id) {
          setEditablePayload(draft.payload);

          if (draft.evidenceConfig) {
            setEvidenceConfig(draft.evidenceConfig);
          }
        }
      }
    } catch {
      // تجاهل أي مسودة تالفة
    } finally {
      reportLiveDraftBootedRef.current = true;
    }
  }, [initialPayload.caseInfo.id, reportLiveDraftKey]);

  useEffect(() => {
    if (!reportLiveDraftBootedRef.current) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        reportLiveDraftKey,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          payload: editablePayload,
          evidenceConfig,
        }),
      );
    }, 200);

    return () => window.clearTimeout(timer);
  }, [editablePayload, evidenceConfig, reportLiveDraftKey]);

  useEffect(() => {
    const saveBeforeLeave = () => {
      if (!reportLiveDraftBootedRef.current) return;

      window.localStorage.setItem(
        reportLiveDraftKey,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          payload: editablePayload,
          evidenceConfig,
        }),
      );
    };

    window.addEventListener("beforeunload", saveBeforeLeave);

    return () => window.removeEventListener("beforeunload", saveBeforeLeave);
  }, [editablePayload, evidenceConfig, reportLiveDraftKey]);
  const pages = useMemo(
    () => buildReportPages(editablePayload, evidenceConfig),
    [editablePayload, evidenceConfig],
  );

  useEffect(() => {
    const lastIndex = Math.max(0, pages.length - 1);

    if (activePage > lastIndex) {
      setActivePage(lastIndex);
    }
  }, [activePage, pages.length]);

  const activeReportPage = pages[activePage] || pages[0];

  const visiblePrimaryFields = useMemo(
    () => editablePayload.primaryFields.filter(isVisibleField),
    [editablePayload.primaryFields],
  );

  const visibleDetailFields = useMemo(
    () => editablePayload.detailFields.filter(isVisibleField),
    [editablePayload.detailFields],
  );

  const customBlocks = editablePayload.customBlocks || [];

  const adjustments = useMemo(
    () => computeReportDraftAdjustments(initialPayload, editablePayload),
    [initialPayload, editablePayload],
  );

  const saveAdjustments = useMemo(
    () => ({
      ...adjustments,
      evidenceConfig,
    }),
    [adjustments, evidenceConfig],
  );

  const updateCustomBlocks = useCallback((blocks: SmartReportCustomBlock[]) => {
    setEditablePayload((prev) => ({
      ...prev,
      customBlocks: blocks,
    }));
  }, []);

  const addCustomBlock = useCallback(
    (type: SmartReportCustomBlockType) => {
      const orderItems = getReportOrderItems(editablePayload);
      const evidenceItem = orderItems.find((item) => item.id === "evidence");
      const beforeEvidenceItems = orderItems.filter(
        (item) => item.order < (evidenceItem?.order ?? 800),
      );
      const previousOrder =
        beforeEvidenceItems.at(-1)?.order ?? null;
      const nextOrder = evidenceItem?.order ?? null;
      const newBlock = {
        ...createBlock(type, activePage),
        order: getNewOrderBetween(previousOrder, nextOrder),
      };

      updateCustomBlocks([...customBlocks, newBlock]);
      setAddBlockOpen(false);
      setActivePage(activePage);
    },
    [activePage, customBlocks, editablePayload, updateCustomBlocks],
  );

  const updateCustomBlock = useCallback(
    (id: string, patch: Partial<SmartReportCustomBlock>) => {
      updateCustomBlocks(
        customBlocks.map((block) =>
          block.id === id ? { ...block, ...patch } : block,
        ),
      );
      setActivePage(activePage);
    },
    [activePage, customBlocks, editablePayload, updateCustomBlocks],
  );

  const removeCustomBlock = useCallback(
    (id: string) => {
      updateCustomBlocks(customBlocks.filter((block) => block.id !== id));
      setActivePage(activePage);
    },
    [activePage, customBlocks, editablePayload, updateCustomBlocks],
  );

  const moveCustomBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      const orderItems = getReportOrderItems(editablePayload);
      const currentIndex = orderItems.findIndex((item) => item.id === id);

      if (currentIndex < 0) return;

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= orderItems.length) return;

      const reorderedItems = [...orderItems];
      const [currentItem] = reorderedItems.splice(currentIndex, 1);
      reorderedItems.splice(targetIndex, 0, currentItem);

      const newIndex = reorderedItems.findIndex((item) => item.id === id);
      const previousOrder =
        newIndex > 0 ? reorderedItems[newIndex - 1].order : null;
      const nextOrder =
        newIndex < reorderedItems.length - 1
          ? reorderedItems[newIndex + 1].order
          : null;
      const nextOrderValue = getNewOrderBetween(previousOrder, nextOrder);

      updateCustomBlocks(
        customBlocks.map((block) =>
          block.id === id ? { ...block, order: nextOrderValue } : block,
        ),
      );
      setActivePage(activePage);
    },
    [activePage, customBlocks, editablePayload, updateCustomBlocks],
  );

  const handleTitleChange = useCallback((value: string) => {
    setEditablePayload((prev) => ({
      ...prev,
      title: value,
      caseInfo: { ...prev.caseInfo, title: value },
    }));
  }, []);

  const handleNarrativeChange = useCallback((value: string) => {
    setEditablePayload((prev) => ({
      ...prev,
      narrative: { ...prev.narrative, body: value },
    }));
  }, []);

  const handlePrimaryFieldChange = useCallback((key: string, value: string) => {
    setEditablePayload((prev) => ({
      ...prev,
      primaryFields: prev.primaryFields.map((field) =>
        field.key === key ? { ...field, value } : field,
      ),
    }));
  }, []);

  const handleDetailFieldChange = useCallback((key: string, value: string) => {
    setEditablePayload((prev) => ({
      ...prev,
      detailFields: prev.detailFields.map((field) =>
        field.key === key ? { ...field, value } : field,
      ),
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[#eef3ef] px-5 py-5" dir="rtl">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <section className="rounded-[1.5rem] border border-emerald-100 bg-white px-5 py-4 shadow-sm print:hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-700">
                تجهيز التقرير
              </p>

              <h1 className="mt-0.5 text-xl font-black text-slate-950">
                {editablePayload.title || "تقرير"}
              </h1>

              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                التقرير مبني من بلوكات قابلة للتعديل، والمعاينة تتحدث مباشرة.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-black text-slate-500">
                شكل التقرير
              </p>

              {variants.length > 1 ? (
                <div className="mt-2">
                  <SmartReportVariantSelector
                    caseId={editablePayload.caseInfo.id}
                    selectedVariantId={selectedVariantId}
                    variants={variants}
                  />
                </div>
              ) : (
                <span className="mt-2 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white">
                  {variants[0]?.shortName || "بطاقة نشاط"}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[430px_minmax(0,1fr)] lg:items-start">
          <aside className="print:hidden">
            <div className="overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setPanelOpen(!panelOpen)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-black text-slate-900 transition hover:bg-slate-50"
              >
                لوحة التعديل
                {panelOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {panelOpen ? (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                  <PanelSection
                    title="١. تعديل الحقول"
                    description="غيّر النصوص والقيم، والتقرير يتحدث مباشرة."
                  >
                    <div>
                      <label className="text-xs font-black text-slate-500">
                        عنوان التقرير
                      </label>

                      <input
                        type="text"
                        value={editablePayload.title}
                        onChange={(event) => handleTitleChange(event.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {editablePayload.narrative?.body !== undefined ? (
                      <div>
                        <label className="text-xs font-black text-slate-500">
                          وصف / ملخص التقرير
                        </label>

                        <textarea
                          value={editablePayload.narrative.body}
                          onChange={(event) =>
                            handleNarrativeChange(event.target.value)
                          }
                          rows={6}
                          className="mt-1 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black leading-8 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    ) : null}

                    {visiblePrimaryFields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-black text-slate-500">
                          {getFieldLabel(field.key, field.label)}
                        </label>

                        <input
                          type="text"
                          value={getFieldValue(field.value)}
                          onChange={(event) =>
                            handlePrimaryFieldChange(field.key, event.target.value)
                          }
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    ))}

                    {visibleDetailFields.length > 0 ? (
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-black text-slate-500">
                          الحقول الإضافية
                        </p>

                        <div className="mt-3 space-y-3">
                          {visibleDetailFields.map((field) => (
                            <div key={field.key}>
                              <label className="text-xs font-black text-slate-500">
                                {getFieldLabel(field.key, field.label)}
                              </label>

                              <input
                                type="text"
                                value={getFieldValue(field.value)}
                                onChange={(event) =>
                                  handleDetailFieldChange(
                                    field.key,
                                    event.target.value,
                                  )
                                }
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </PanelSection>

                  <PanelSection
                    title="٢. إعدادات الشواهد"
                    description="اختر ظهور الشواهد وعددها وحجم الصورة."
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-slate-600">
                          عرض الشواهد
                        </span>

                        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                          <ToggleButton
                            active={evidenceConfig.visible}
                            onClick={() =>
                              setEvidenceConfig((prev) => ({
                                ...prev,
                                visible: true,
                              }))
                            }
                          >
                            ظاهر
                          </ToggleButton>
                          <ToggleButton
                            active={!evidenceConfig.visible}
                            onClick={() =>
                              setEvidenceConfig((prev) => ({
                                ...prev,
                                visible: false,
                              }))
                            }
                          >
                            مخفي
                          </ToggleButton>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-slate-600">
                          عدد الشواهد في الصفحة
                        </span>

                        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                          {([1, 2, 4] as const).map((value) => (
                            <ToggleButton
                              key={value}
                              active={evidenceConfig.itemsPerPage === value}
                              onClick={() =>
                                setEvidenceConfig((prev) => ({
                                  ...prev,
                                  itemsPerPage: value,
                                }))
                              }
                            >
                              {value}
                            </ToggleButton>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-slate-600">
                          التسميات
                        </span>

                        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                          <ToggleButton
                            active={evidenceConfig.showCaptions}
                            onClick={() =>
                              setEvidenceConfig((prev) => ({
                                ...prev,
                                showCaptions: true,
                              }))
                            }
                          >
                            ظاهر
                          </ToggleButton>
                          <ToggleButton
                            active={!evidenceConfig.showCaptions}
                            onClick={() =>
                              setEvidenceConfig((prev) => ({
                                ...prev,
                                showCaptions: false,
                              }))
                            }
                          >
                            مخفي
                          </ToggleButton>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-black text-slate-600">
                          أبعاد الصورة
                        </p>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {IMAGE_SIZE_ORDER.map((size) => (
                            <ToggleButton
                              key={size}
                              active={evidenceConfig.imageSize === size}
                              onClick={() =>
                                setEvidenceConfig((prev) => ({
                                  ...prev,
                                  imageSize: size,
                                }))
                              }
                            >
                              {IMAGE_SIZE_LABELS[size]}
                            </ToggleButton>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PanelSection>

                  <PanelSection
                    title="٣. فقرات التقرير"
                    description="أضف بلوكات نصية تظهر داخل التقرير حسب ترتيبها."
                  >
                    <button
                      type="button"
                      onClick={() => setAddBlockOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة بلوك
                    </button>

                    {customBlocks.length > 0 ? (
                      <div className="space-y-3">
                        {customBlocks.map((block, index) => (
                          <article
                            key={block.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                                {block.type === "BULLET_LIST"
                                  ? "قائمة نقاط"
                                  : "فقرة نصية"}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveCustomBlock(block.id, "up")}
                                  disabled={index === 0}
                                  className="rounded-xl bg-white p-2 text-slate-500 disabled:opacity-30"
                                  title="تحريك لأعلى"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => moveCustomBlock(block.id, "down")}
                                  disabled={index === customBlocks.length - 1}
                                  className="rounded-xl bg-white p-2 text-slate-500 disabled:opacity-30"
                                  title="تحريك لأسفل"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeCustomBlock(block.id)}
                                  className="rounded-xl bg-white p-2 text-rose-500"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-black text-slate-500">
                                  العنوان
                                </label>

                                <input
                                  type="text"
                                  value={block.title}
                                  onChange={(event) =>
                                    updateCustomBlock(block.id, {
                                      title: event.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-black text-slate-500">
                                  {block.type === "BULLET_LIST"
                                    ? "النقاط، كل نقطة في سطر"
                                    : "النص"}
                                </label>

                                <textarea
                                  value={block.body}
                                  onChange={(event) =>
                                    updateCustomBlock(block.id, {
                                      body: event.target.value,
                                    })
                                  }
                                  rows={block.type === "BULLET_LIST" ? 5 : 4}
                                  className="mt-1 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-8 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-400">
                        لا توجد فقرات إضافية حتى الآن.
                      </p>
                    )}
                  </PanelSection>

                  <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
                    <Link
                      href={`/dashboard/cases/${editablePayload.caseInfo.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <ArrowRight className="h-4 w-4" />
                      العودة
                    </Link>

                    <SaveSmartReportButton
                      caseId={editablePayload.caseInfo.id}
                      variantId={selectedVariantId}
                      adjustments={saveAdjustments}
                    />

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
                    >
                      <Printer className="h-4 w-4" />
                      طباعة
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex items-center gap-2 overflow-x-auto rounded-[1.5rem] border border-emerald-100 bg-white/80 p-2 print:hidden">
              <span className="shrink-0 px-2 text-xs font-black text-slate-500">
                صفحات التقرير
              </span>

              {pages.map((page, index) => (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => setActivePage(index)}
                  className={[
                    "whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-black transition",
                    activePage === index
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {page.title}
                </button>
              ))}
            </div>

            {activeReportPage ? (
              <div className="rounded-[2rem] bg-slate-100 p-4">
                <div className="mx-auto w-fit">
                  <SmartReportDocumentRenderer
                    payload={activeReportPage.payload}
                    blocks={activeReportPage.blocks}
                    variantId={selectedVariantId}
                  />
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {addBlockOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 print:hidden">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  إضافة بلوك جديد
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  اختر نوع البلوك
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  سيظهر البلوك داخل التقرير ويمكنك تعديله وتحريكه بعد الإضافة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAddBlockOpen(false)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-600"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => addCustomBlock("PARAGRAPH")}
                className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 text-right transition hover:border-emerald-300"
              >
                <p className="text-base font-black text-emerald-900">
                  فقرة بعنوان ونص
                </p>
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-950">
                    عنوان الفقرة
                  </h3>
                  <p className="mt-2 text-xs font-bold leading-7 text-slate-500">
                    نص قصير أو شرح يظهر داخل التقرير بتصميم القالب الرسمي.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => addCustomBlock("BULLET_LIST")}
                className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 text-right transition hover:border-emerald-300"
              >
                <p className="text-base font-black text-emerald-900">
                  عنوان وقائمة نقاط
                </p>
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-950">
                    قائمة نقاط
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs font-bold leading-7 text-slate-500">
                    <li>• نقطة أولى</li>
                    <li>• نقطة ثانية</li>
                    <li>• نقطة ثالثة</li>
                  </ul>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}