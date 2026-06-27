"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReportDesignRenderer,
  reportDesignTemplates,
  type ReportDesignId,
  type ReportHeaderSettings,
} from "@/components/report-engine/design-renderers/report-design-renderer";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { applyReportFlowPreparationToPayload } from "@/lib/report-flow/report-flow-payload";
import { loadReportFlowPreparation } from "@/lib/report-flow/report-flow-storage";


type ReportTwoCollapsibleCardProps = {
  id: string;
  title: string;
  children: ReactNode;
};

function ReportTwoCollapsibleCard({
  id,
  title,
  children,
}: ReportTwoCollapsibleCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      data-report-two-panel-id={id}
      className="rounded-[2rem] border border-emerald-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[1.4rem] bg-slate-50 px-4 py-3 text-right transition hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <span className="text-sm font-black text-slate-950 dark:text-white">
          {title}
        </span>

        <span
          className={[
            "rounded-full px-3 py-1 text-[11px] font-black transition",
            open
              ? "bg-emerald-700 text-white"
              : "bg-white text-emerald-700 ring-1 ring-emerald-100",
          ].join(" ")}
        >
          {open ? "إغلاق" : "فتح"}
        </span>
      </button>

      {open ? (
        <div className="mt-3 rounded-[1.5rem] bg-white p-2 dark:bg-slate-950">
          {children}
        </div>
      ) : null}
    </section>

            );
}

type TemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  updatedAt: string;
  templateJson: Record<string, unknown> | null;
};

type ReportTwoHeaderFieldKey =
  | "case.createdAt"
  | "service.name"
  | "identity.ministryName"
  | "identity.educationDepartment"
  | "report.platformName";

type ReportTwoHeaderValues = Record<ReportTwoHeaderFieldKey, string>;

type ReportTwoLogoSettings = {
  url: string;
  width: number;
  height: number;
  fit: "contain" | "cover";
  filter: "invert" | "none";
};
type ReportTwoHeaderAlign = "right" | "center" | "left";
type ReportTwoHeaderAlignments = Record<ReportTwoHeaderFieldKey, ReportTwoHeaderAlign>;

type StudioBlockKind =
  | "hero-title"
  | "meta-strip"
  | "plain-text"
  | "section-text"
  | "multi-paragraph"
  | "highlight-note"
  | "bullet-list"
  | "dynamic-fields"
  | "evidence-gallery"
  | "closing-note"
  | "report-one-table"
  | "signature-grid";

type StudioPageKind =
  | "content"
  | "recommendations"
  | "evidence"
  | "approval"
  | "custom";

type ReportTwoDynamicField = {
  id: string;
  key: string;
  label: string;
  value: string;
  valueItems?: string[];
  visible: boolean;
};

function getReportTwoDynamicFieldBaseId(
  field: Partial<Pick<ReportTwoDynamicField, "id" | "key" | "label">>,
  index: number,
) {
  return (
    cleanText(field.id) ||
    cleanText(field.key) ||
    cleanText(field.label) ||
    `dynamic-field-${index + 1}`
  );
}

function ensureUniqueReportTwoDynamicFieldIds(fields: ReportTwoDynamicField[]) {
  const seen = new Map<string, number>();

  return fields.map((field, index) => {
    const baseId = getReportTwoDynamicFieldBaseId(field, index);
    const count = seen.get(baseId) || 0;
    seen.set(baseId, count + 1);

    return {
      ...field,
      id: count === 0 ? baseId : `${baseId}__${count + 1}`,
    };
  });
}

type ReportTwoTableSettings = {
  highlightHeader: boolean;
  highlightFirstColumn: boolean;
  stripedRows: boolean;
  rounded: boolean;
  compact: boolean;
  repeatHeader: boolean;
  colorTheme: "light-gray" | "soft-blue" | "green" | "none";
};

type ReportTwoTableDraft = {
  blockId: string;
  title: string;
  columns: string[];
  rows: string[][];
  settings: ReportTwoTableSettings;
};

type StudioBlock = {
  id: string;
  kind: StudioBlockKind;
  title: string;
  content: string;
  variant?: string;
  source?: string;
  showTitle?: boolean;
  showMeta?: boolean;
  align?: "right" | "center";
  placement?: string;
  signatures?: any[];
  signatureOrder?: string[];
  hiddenSignatureKeys?: string[];
  boundFieldKey?: string;
  hideWhenMissing?: boolean;
  evidenceLayout?: string;
  evidenceFit?: string;
  evidenceAspectRatio?: string;
  evidenceShowCaptions?: boolean;
  evidenceAutoCreatePages?: boolean;
  evidenceEmptyBehavior?: string;
  columns?: string[];
  rows?: string[][];
  tableSettings?: Record<string, any>;
  dynamicFields?: ReportTwoDynamicField[];
  [key: string]: any;
};

type StudioPage = {
  id: string;
  kind: StudioPageKind;
  title: string;
  description?: string;
  sourceTemplatePageId?: string | null;
  reportTwoVirtualPage?: boolean;
  blocks: StudioBlock[];
};

type StudioTemplate = {
  id: string;
  name: string;
  description: string;
  designTemplateId?: ReportDesignId;
  designConfig?: {
    header?: ReportHeaderSettings;
  };
  pages: StudioPage[];
};

type ReportTwoDraftSnapshot = {
  version: 1;
  savedAt: string;
  selectedTemplateOptionId: string;
  activeSavedRuntimeTemplateId: string;
  runtimeTemplateName: string;
  template: StudioTemplate;
  headerValues: ReportTwoHeaderValues | null;
  headerAlignments: ReportTwoHeaderAlignments | null;
  logoSettings: ReportTwoLogoSettings | null;
  hiddenRuntimePageIds: string[];
  runtimePageOrder: string[];
  activePageId: string;
  selectedBlockId: string;
  finalCheckConfirmedAt?: string | null;
};

type ReportTwoSmartAlertType = "success" | "info" | "warning" | "error";

type ReportTwoSmartAlertAction =
  | "hide-technical-fields"
  | "restore-header"
  | "focus-preview"
  | "open-page"
  | "open-block";

type ReportTwoSmartAlert = {
  id: string;
  type: ReportTwoSmartAlertType;
  title: string;
  description: string;
  pageId?: string;
  blockId?: string;
  action?: ReportTwoSmartAlertAction;
};

type ReportTwoFinalCheckItem = {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  required: boolean;
};

type ReportTwoSavedRuntimeTemplate = {
  id: string;
  name: string;
  serviceSlug: string;
  sourceTemplateId: string;
  createdAt: string;
  updatedAt: string;
  template: StudioTemplate;
  headerValues: ReportTwoHeaderValues | null;
  headerAlignments: ReportTwoHeaderAlignments | null;
  logoSettings: ReportTwoLogoSettings | null;
  hiddenRuntimePageIds: string[];
  runtimePageOrder: string[];
};

type ReportTwoStudioRuntimeProps = {
  caseId: string;
  selectedTemplateId: string;
  selectedVariantId?: string;
  initialMode?: "preview" | "edit";
  payload: SmartReportPayload;
  templates: TemplateOption[];
};

const REPORT_TWO_PAGE_CONTENT_HEIGHT_SCORE = 214;
const REPORT_TWO_FOOTER_SAFE_GAP_SCORE = 14;
const REPORT_TWO_EVIDENCE_FOOTER_SAFE_GAP_SCORE = 4;
const REPORT_TWO_PAGE_SAFE_HEIGHT_SCORE =
  REPORT_TWO_PAGE_CONTENT_HEIGHT_SCORE - REPORT_TWO_FOOTER_SAFE_GAP_SCORE;
const REPORT_TWO_EVIDENCE_SAFE_HEIGHT_SCORE =
  REPORT_TWO_PAGE_SAFE_HEIGHT_SCORE - REPORT_TWO_EVIDENCE_FOOTER_SAFE_GAP_SCORE;
const REPORT_TWO_BLOCK_MOVED_NOTICE =
  "لا توجد مساحة كافية في هذه الصفحة، سيتم نقل البلوك إلى الصفحة التالية.";

function getReportTwoSavedTemplatesStorageKey(serviceSlug: string) {
  return `report-2:saved-runtime-templates:${serviceSlug || "general"}`;
}

function readReportTwoSavedTemplates(
  serviceSlug: string,
): ReportTwoSavedRuntimeTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(
      getReportTwoSavedTemplatesStorageKey(serviceSlug),
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getReportTwoSavedTemplatesStoragePrefix() {
  return "report-2:saved-runtime-templates:";
}

function readAllReportTwoSavedTemplates() {
  if (typeof window === "undefined") return [];

  const prefix = getReportTwoSavedTemplatesStoragePrefix();
  const items: ReportTwoSavedRuntimeTemplate[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(prefix)) continue;

    const serviceSlug = key.slice(prefix.length);
    const templates = readReportTwoSavedTemplates(serviceSlug);

    templates.forEach((template) => {
      items.push({
        ...template,
        serviceSlug: (template as any).serviceSlug || serviceSlug,
      } as ReportTwoSavedRuntimeTemplate);
    });
  }

  return items.sort((a, b) => {
    return String((b as any).updatedAt || (b as any).createdAt || "").localeCompare(
      String((a as any).updatedAt || (a as any).createdAt || ""),
    );
  });
}

function deleteReportTwoSavedTemplateFromAllServices(templateId: string) {
  if (typeof window === "undefined") return [];

  const prefix = getReportTwoSavedTemplatesStoragePrefix();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(prefix)) continue;

    const serviceSlug = key.slice(prefix.length);
    const templates = readReportTwoSavedTemplates(serviceSlug);
    const nextTemplates = templates.filter((template) => template.id !== templateId);

    if (nextTemplates.length !== templates.length) {
      writeReportTwoSavedTemplates(serviceSlug, nextTemplates);
    }
  }

  return readAllReportTwoSavedTemplates();
}
function writeReportTwoSavedTemplates(
  serviceSlug: string,
  items: ReportTwoSavedRuntimeTemplate[],
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getReportTwoSavedTemplatesStorageKey(serviceSlug),
    JSON.stringify(items),
  );
}

function cloneReportTwoTemplate(template: StudioTemplate): StudioTemplate {
  return JSON.parse(JSON.stringify(template)) as StudioTemplate;
}

function getReportTwoDraftStorageKey(serviceSlug: string, caseId: string) {
  return `report-2:draft:${serviceSlug || "general"}:${caseId || "unknown"}`;
}

function formatReportTwoSavedAt(value: string) {
  if (!value) return "لم يتم الحفظ بعد";

  try {
    return new Date(value).toLocaleString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "تم الحفظ";
  }
}

function parseReportTwoDraftSnapshot(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ReportTwoDraftSnapshot;

    if (!parsed || parsed.version !== 1 || !parsed.template?.pages) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDesignId(value: unknown): ReportDesignId {
  const designId = cleanText(value);

  if (reportDesignTemplates.some((item) => item.id === designId)) {
    return designId as ReportDesignId;
  }

  return "ministry-form";
}

function createBlock(kind: StudioBlockKind): StudioBlock {
  const base = {
    id: makeId(kind),
    kind,
    title: "بلوك جديد",
    content: "",
    variant: "card",
    source: "manual",
    showTitle: true,
    showMeta: false,
    align: "right" as const,
    placement: "flow",
  };

  if (kind === "hero-title") {
    return {
      ...base,
      title: "عنوان التقرير",
      content: "{{case.title}}",
      variant: "hero",
      showTitle: false,
      align: "center",
    };
  }

  if (kind === "dynamic-fields") {
    return {
      ...base,
      title: "حقول الحالة",
      content: "",
      variant: "soft",
    };
  }

  if (kind === "signature-grid") {
    return {
      ...base,
      title: "تواقيع الاعتماد",
      content: "",
      variant: "soft",
      align: "center",
      placement: "bottom",
      showTitle: false,
    };
  }

  if (kind === "evidence-gallery") {
    return {
      ...base,
      title: "الشواهد والمرفقات",
      evidenceLayout: "TWO_PER_PAGE",
      evidenceFit: "contain",
      evidenceAspectRatio: "SQUARE_1_1",
      evidenceShowCaptions: false,
      evidenceAutoCreatePages: false,
      evidenceEmptyBehavior: "message",
    };
  }

  if (kind === "bullet-list") {
    return {
      ...base,
      title: "قائمة نقاط",
      content: "النقطة الأولى\nالنقطة الثانية\nالنقطة الثالثة",
    };
  }

  if (kind === "closing-note") {
    return {
      ...base,
      title: "خاتمة واعتماد",
      content: "تم إعداد التقرير واعتماده وفق البيانات المتاحة في منصة التوجيه الطلابي.",
    };
  }

  if (kind === "report-one-table") {
    return {
      ...base,
      title: "جدول",
      columns: ["المجال", "الإجراء", "ملاحظات"],
      rows: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      tableSettings: {
        highlightHeader: true,
        highlightFirstColumn: true,
        stripedRows: true,
        rounded: true,
        compact: false,
        repeatHeader: true,
        colorTheme: "light-gray",
      },
    };
  }

  return {
    ...base,
    title: kind === "section-text" ? "فقرة" : "نص",
    content: "اكتب النص هنا.",
  };
}

function createPage(index: number): StudioPage {
  return {
    id: makeId("page"),
    kind: "content",
    title: `صفحة محتوى ${index}`,
    description: "",
    blocks: [createBlock("section-text")],
  };
}

function normalizeBlock(value: any, index: number): StudioBlock {
  const kind = cleanText(value?.kind || value?.settings?.smartBlockKind || "section-text") as StudioBlockKind;

  return {
    ...createBlock(kind),
    ...value,
    id: cleanText(value?.id) || makeId(`block-${index + 1}`),
    kind,
    title: cleanText(value?.title) || `بلوك ${index + 1}`,
    content: cleanText(value?.content ?? value?.defaultContent ?? value?.customContent ?? ""),
    showTitle: value?.showTitle !== false,
    showMeta: Boolean(value?.showMeta),
    align: value?.align === "center" ? "center" : "right",
    placement: cleanText(value?.placement) || "flow",
  };
}

function normalizePage(value: any, index: number): StudioPage {
  const rawBlocks = asArray(value?.blocks);

  return {
    id: cleanText(value?.id) || makeId(`page-${index + 1}`),
    kind: cleanText(value?.kind || "content") as StudioPageKind,
    title: cleanText(value?.title) || `صفحة ${index + 1}`,
    description: cleanText(value?.description),
    blocks: rawBlocks.length
      ? rawBlocks.map(normalizeBlock)
      : [createBlock("section-text")],
  };
}

function hydrateTemplate(template: TemplateOption | null): StudioTemplate {
  const raw = asRecord(template?.templateJson);
  const smartStudio = asRecord(raw.smartStudio);
  const source = asArray(smartStudio.pages).length ? smartStudio : raw;
  const pages = asArray(source.pages);

  return {
    id: template?.id || "report-2-empty-template",
    name: template?.name || "قالب report-2",
    description: template?.description || "",
    designTemplateId: normalizeDesignId(source.designTemplateId || raw.designTemplateId),
    designConfig: asRecord(source.designConfig).header
      ? {
          header: asRecord(source.designConfig)
            .header as unknown as ReportHeaderSettings,
        }
      : asRecord(raw.designConfig).header
        ? {
            header: asRecord(raw.designConfig)
              .header as unknown as ReportHeaderSettings,
          }
        : undefined,
    pages: pages.length
      ? pages.map(normalizePage)
      : [
          {
            id: "report-2-fallback-page",
            kind: "content",
            title: "صفحة التقرير",
            description: "",
            blocks: [
              createBlock("hero-title"),
              createBlock("dynamic-fields"),
              createBlock("section-text"),
            ],
          },
        ],
  };
}



function getDefaultReportTwoLogoSettings(
  context: Record<string, string>,
): ReportTwoLogoSettings {
  return {
    url:
      cleanText(context["report.logoUrl"]) ||
      cleanText(context["identity.logoUrl"]) ||
      "/uploads/school-logos/MOE.png",
    width: 96,
    height: 56,
    fit: "contain",
    filter: "invert",
  };
}

function normalizeReportTwoLogoNumber(
  value: number,
  fallback: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}
const reportTwoHeaderFields: Array<{
  key: ReportTwoHeaderFieldKey;
  label: string;
  hint: string;
}> = [
  {
    key: "case.createdAt",
    label: "التاريخ",
    hint: "يظهر يسار الترويسة.",
  },
  {
    key: "service.name",
    label: "اسم الخدمة",
    hint: "يظهر أسفل التاريخ في يسار الترويسة.",
  },
  {
    key: "identity.ministryName",
    label: "اسم الوزارة",
    hint: "يظهر يمين الترويسة.",
  },
  {
    key: "identity.educationDepartment",
    label: "الإدارة التعليمية",
    hint: "يظهر أسفل الوزارة.",
  },
  {
    key: "report.platformName",
    label: "اسم المنصة / الوسط",
    hint: "يظهر تحت الشعار في منتصف الترويسة.",
  },
];

const reportTwoHeaderAlignOptions: Array<{
  value: ReportTwoHeaderAlign;
  label: string;
  title: string;
}> = [
  {
    value: "right",
    label: "≡",
    title: "محاذاة يمين",
  },
  {
    value: "center",
    label: "☰",
    title: "محاذاة وسط",
  },
  {
    value: "left",
    label: "≡",
    title: "محاذاة يسار",
  },
];

const reportTwoHeaderBindingOptions = [
  ["case.createdAt", "تاريخ الحالة"],
  ["case.title", "عنوان الحالة"],
  ["service.name", "اسم الخدمة"],
  ["student.name", "اسم الطالب"],
  ["student.grade", "الصف"],
  ["student.classroom", "الفصل"],
  ["identity.ministryName", "وزارة التعليم"],
  ["identity.educationDepartment", "الإدارة التعليمية"],
  ["identity.schoolName", "اسم المدرسة"],
  ["report.platformName", "اسم المنصة"],
];

function getDefaultReportTwoHeaderValues(
  context: Record<string, string>,
): ReportTwoHeaderValues {
  return {
    "case.createdAt": cleanText(context["case.createdAt"]),
    "service.name": cleanText(context["service.name"]),
    "identity.ministryName":
      cleanText(context["identity.ministryName"]) || "وزارة التعليم",
    "identity.educationDepartment":
      cleanText(context["identity.educationDepartment"]) ||
      "الإدارة العامة للتعليم",
    "report.platformName":
      cleanText(context["report.platformName"]) || "منصة التوجيه الطلابي",
  };
}

function getDefaultReportTwoHeaderAlignments(): ReportTwoHeaderAlignments {
  return {
    "case.createdAt": "center",
    "service.name": "center",
    "identity.ministryName": "center",
    "identity.educationDepartment": "center",
    "report.platformName": "center",
  };
}
const REPORT_TWO_FIELD_LABELS: Record<string, string> = {
  activity_domain: "مجال النشاط",
  activity_program: "برنامج النشاط",
  activity_program_scouting: "برنامج النشاط الكشفي",
  execution_mode: "طريقة التنفيذ",
  execution_method: "طريقة التنفيذ",
  start_day: "يوم البداية",
  end_day: "يوم النهاية",
  start_week: "أسبوع البداية",
  end_week: "أسبوع النهاية",
  start_date: "تاريخ البداية",
  end_date: "تاريخ النهاية",
  semester: "الفصل الدراسي",
  term: "الفصل الدراسي",
  week: "الأسبوع",
  target_group: "الفئة المستهدفة",
  target_class: "الفئة المستهدفة",
  executor: "المعلم المنفذ",
  execution_date: "تاريخ التنفيذ",
  planned_sessions: "عدد اللقاءات المخططة",
  sessions_count: "عدد اللقاءات",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  parents_participated: "مشاركة أولياء الأمور",
  community_partnership_count: "عدد الشراكات المجتمعية",
  beneficiary_count: "عدد المستفيدين",
  beneficiaries_count: "عدد المستفيدين",
  location: "موقع التنفيذ",
  place: "المكان",
  execution_location: "موقع التنفيذ",
  activity_leader: "رائد النشاط",
  counselor: "الموجه الطلابي",
  principal: "قائد المدرسة",
};

const REPORT_TWO_VALUE_LABELS: Record<string, string> = {
  scouting: "النشاط الكشفي",
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",
  activity_leader: "رائد النشاط",
  teacher: "المعلم",
  counselor: "الموجه الطلابي",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  yes: "نعم",
  no: "لا",
  "true": "نعم",
  "false": "لا",
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  term_3: "الفصل الدراسي الثالث",
  semester_1: "الفصل الدراسي الأول",
  semester_2: "الفصل الدراسي الثاني",
  semester_3: "الفصل الدراسي الثالث",
  academic: "أكاديمي",
  behavioral: "سلوكي",
  social: "اجتماعي",
  psychological: "نفسي",
  lecture: "محاضرة",
  workshop: "ورشة عمل",
  field_visit: "زيارة ميدانية",
  competition: "مسابقة",
  awareness_campaign: "حملة توعوية",
  training_course: "دورة تدريبية",
  meeting: "لقاء",
  interview: "مقابلة",
  phone: "اتصال هاتفي",
  message: "رسالة نصية",
};

function getReportTwoFieldLabel(key: string, label: string): string {
  if (!key && !label) return "";
  const trimmed = label?.trim();
  if (trimmed && trimmed !== key && !/^[a-z0-9_./-]+$/i.test(trimmed)) {
    return trimmed;
  }
  return REPORT_TWO_FIELD_LABELS[key] || REPORT_TWO_FIELD_LABELS[label] || trimmed || key || "";
}

function getReportTwoFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const direct = REPORT_TWO_VALUE_LABELS[lower] || REPORT_TWO_VALUE_LABELS[raw];
  if (direct) return direct;
  const programMatch = lower.match(/^program_(\d+)$/);
  if (programMatch) return `برنامج النشاط رقم ${programMatch[1]}`;
  if (/^[a-z0-9_./-]+$/i.test(raw) && /[a-z_]/i.test(raw)) return raw;
  return raw;
}

function getPayloadAny(payload: SmartReportPayload) {
  return payload as any;
}

function getRuntimeContext(payload: SmartReportPayload) {
  const data = getPayloadAny(payload);
  const student = data.student || data.caseInfo?.student || {};
  const fields = [...(payload.primaryFields || []), ...(payload.detailFields || [])];

  const context: Record<string, string> = {
    "case.id": cleanText(data.caseInfo?.id),
    "case.title": cleanText(data.caseInfo?.title || data.title),
    "case.status": cleanText(data.caseInfo?.status),
    "case.createdAt": cleanText(data.caseInfo?.createdAt),
    "case.updatedAt": cleanText(data.caseInfo?.updatedAt),

    "service.name": cleanText(data.service?.name),
    "service.slug": cleanText(data.service?.slug),

    "student.name": cleanText(student.name || student.fullName),
    "student.grade": cleanText(student.grade),
    "student.classroom": cleanText(student.classroom),
    "student.stage": cleanText(student.stage),
    "student.guardianName": cleanText(student.guardianName),
    "student.guardianPhone": cleanText(student.guardianPhone),

    "identity.ministryName": cleanText(data.identity?.ministryName || "وزارة التعليم"),
    "identity.educationDepartment": cleanText(data.identity?.educationDepartment || "الإدارة العامة للتعليم"),
    "identity.schoolName": cleanText(data.identity?.schoolName || ""),
  };

  fields.forEach((field: any, index: number) => {
    const key = cleanText(field.key) || `field-${index + 1}`;
    const label = cleanText(field.label);
    const value = cleanText(field.value);

    context[key] = value;
    context[`field.${key}`] = value;

    if (label) {
      context[label] = value;
      context[`field.${label}`] = value;
    }
  });

  return context;
}

function normalizeEvidenceUrl(value: unknown) {
  const url = cleanText(value).replaceAll("\\", "/");

  if (!url) return "";
  if (url.startsWith("http://")) return url;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/")) return url;

  return `/${url.replace(/^public\//, "")}`;
}

const REPORT_TWO_IMAGE_EVIDENCE_EXTENSION_PATTERN =
  /\.(png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

function hasReportTwoImageEvidenceExtension(value: unknown) {
  const text = cleanText(value).replaceAll("\\", "/");

  if (!text) return false;

  return REPORT_TWO_IMAGE_EVIDENCE_EXTENSION_PATTERN.test(text);
}

function isReportTwoImageEvidence(item: any) {
  const evidenceType = cleanText(item?.type).toUpperCase();
  const mimeType = cleanText(item?.mimeType).toLowerCase();

  if (evidenceType === "IMAGE") return true;
  if (mimeType.startsWith("image/")) return true;

  return [
    item?.imageUrl,
    item?.fileUrl,
    item?.url,
    item?.publicUrl,
    item?.thumbnailUrl,
    item?.previewUrl,
    item?.fileName,
    item?.originalName,
    item?.name,
  ].some((value) => hasReportTwoImageEvidenceExtension(value));
}

function collectEvidences(payload: SmartReportPayload) {
  const data = getPayloadAny(payload);

  const candidates = [
    data.evidence,
    data.evidence?.items,
    data.evidence?.evidences,
    data.evidence?.files,
    data.evidence?.attachments,
    data.evidenceItems,
    data.evidences,
    data.attachments,
    data.files,
    data.caseInfo?.evidence,
    data.caseInfo?.evidence?.items,
    data.caseInfo?.evidence?.evidences,
    data.caseInfo?.evidence?.files,
    data.caseInfo?.evidence?.attachments,
    data.caseInfo?.evidenceItems,
    data.caseInfo?.evidences,
    data.caseInfo?.attachments,
    data.caseInfo?.files,
  ];

  const collected: any[] = [];

  candidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      collected.push(...candidate);
      return;
    }

    if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, any>;

      [
        record.items,
        record.evidences,
        record.files,
        record.attachments,
        record.data,
      ].forEach((value) => {
        if (Array.isArray(value)) {
          collected.push(...value);
        }
      });
    }
  });

  const seen = new Set<string>();

  return collected
    .map((item, index) => {
      const rawUrl =
        item.fileUrl ||
        item.url ||
        item.imageUrl ||
        item.publicUrl ||
        item.path ||
        item.filePath ||
        item.storagePath ||
        item.thumbnailUrl ||
        item.previewUrl ||
        item.downloadUrl ||
        item.secureUrl ||
        item.src ||
        "";

      const fileUrl = normalizeEvidenceUrl(rawUrl);
      const normalizedUrl = normalizeEvidenceUrl(item.url || "");
      const imageUrlCandidate = normalizeEvidenceUrl(
        item.imageUrl ||
          item.thumbnailUrl ||
          item.previewUrl ||
          item.publicUrl ||
          item.url ||
          item.fileUrl ||
          rawUrl,
      );
      const imageUrl = isReportTwoImageEvidence(item)
        ? imageUrlCandidate || fileUrl || normalizedUrl
        : "";
      const evidenceType: "IMAGE" | "FILE" = isReportTwoImageEvidence(item)
        ? "IMAGE"
        : "FILE";

      const id =
        cleanText(item.id) ||
        cleanText(item.evidenceId) ||
        cleanText(item.fileId) ||
        fileUrl ||
        imageUrl ||
        `evidence-${index + 1}`;

      return {
        id,
        title:
          cleanText(item.title || item.fileName || item.originalName || item.name) ||
          `شاهد ${index + 1}`,
        url: normalizedUrl || undefined,
        fileUrl,
        imageUrl,
        type: evidenceType,
        mimeType: cleanText(item.mimeType) || undefined,
        caption: cleanText(
          item.caption ||
            item.note ||
            item.description ||
            item.title ||
            item.fileName ||
            item.originalName,
        ),
      };
    })
    .filter((item) => item.fileUrl || item.imageUrl)
    .filter((item) => {
      const key = `${item.id}|${item.fileUrl}|${item.imageUrl}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function getPreviewCase(payload: SmartReportPayload) {
  const data = getPayloadAny(payload);
  const student = data.student || data.caseInfo?.student || {};
  const fields = [...(payload.primaryFields || []), ...(payload.detailFields || [])];

  return {
    found: true,
    caseId: cleanText(data.caseInfo?.id),
    serviceSlug: cleanText(data.service?.slug),
    serviceName: cleanText(data.service?.name),
    title: cleanText(data.caseInfo?.title || data.title),
    status: cleanText(data.caseInfo?.status),
    createdAt: cleanText(data.caseInfo?.createdAt),
    updatedAt: cleanText(data.caseInfo?.updatedAt),
    student: {
      name: cleanText(student.name || student.fullName),
      nationalId: cleanText(student.nationalId),
      grade: cleanText(student.grade),
      classroom: cleanText(student.classroom),
      stage: cleanText(student.stage),
      guardianName: cleanText(student.guardianName),
      guardianPhone: cleanText(student.guardianPhone),
    },
    values: fields.map((field: any, index: number) => {
      const fieldKey =
        cleanText(field.key) ||
        cleanText(field.fieldKey) ||
        cleanText(field.name) ||
        cleanText(field.id) ||
        `field-${index + 1}`;
      const valueItems = getReportTwoReadableFieldValueItems(field);
      const value =
        valueItems.length > 1
          ? valueItems.join("، ")
          : getReportTwoReadableFieldValue(field);

      return {
        fieldKey,
        fieldLabel: getReportTwoReadableFieldLabel(field, index),
        value,
        ...(valueItems.length > 1 ? { valueItems } : {}),
        rawValue: Array.isArray(field.value)
          ? field.value.map((item: unknown) => cleanText(item)).filter(Boolean).join("، ")
          : cleanText(field.value),
      };
    }),
    evidences: collectEvidences(payload),
  };
}


function getEvidencePerPageFromBlock(block: StudioBlock) {
  const explicitLimit = Number(block.evidenceLimit || 0);

  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    return Math.max(1, Math.floor(explicitLimit));
  }

  if (block.evidenceLayout === "ONE_PER_PAGE") return 1;
  if (block.evidenceLayout === "GRID_2X2") return 4;
  if (block.evidenceLayout === "ATTACHMENT_LIST") return 6;

  return 2;
}

function getReportTwoSignatureCardsFromPayload(payload: SmartReportPayload) {
  const priority = ["teacher", "activity_leader", "counselor", "principal"];

  const signatures = [...(payload.signatures || [])].sort((a, b) => {
    const aIndex = priority.indexOf(String(a.key || ""));
    const bIndex = priority.indexOf(String(b.key || ""));

    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return signatures
    .filter((signature) => {
      return Boolean(
        signature?.label ||
          signature?.signerName ||
          signature?.signerTitle ||
          signature?.imageUrl,
      );
    })
    .map((signature) => ({
      key: String(signature.key || ""),
      label: String(signature.label || "التوقيع"),
      signerName: String(signature.signerName || ""),
      signerTitle: String(signature.signerTitle || ""),
      imageUrl: String(signature.imageUrl || ""),
      required: Boolean(signature.required),
    }));
}

function isReportTwoSignatureBlock(block: StudioBlock | null | undefined) {
  if (!block) return false;

  const kind = cleanText(block.kind);
  const title = cleanText(block.title);

  return (
    kind === "signature-grid" ||
    kind === "signatures" ||
    kind === "approval-signatures" ||
    title.includes("توقيع") ||
    title.includes("اعتماد") ||
    Array.isArray((block as any).signatures)
  );
}

function getReportTwoSignatureTargetPageId(pages: StudioPage[]) {
  const lastContentPage = [...pages]
    .reverse()
    .find((page) => page.kind !== "evidence");

  return lastContentPage?.id || pages[pages.length - 1]?.id || "";
}

function getReportTwoSignatureHiddenKeys(block: StudioBlock | null | undefined) {
  return new Set(
    Array.isArray((block as any)?.hiddenSignatureKeys)
      ? ((block as any).hiddenSignatureKeys as string[]).map((key) => cleanText(key))
      : [],
  );
}

function getReportTwoOrderedSignatureCards(
  signatures: ReturnType<typeof getReportTwoSignatureCardsFromPayload>,
  block: StudioBlock | null | undefined,
) {
  const order = Array.isArray((block as any)?.signatureOrder)
    ? ((block as any).signatureOrder as string[]).map((key) => cleanText(key)).filter(Boolean)
    : [];

  const byKey = new Map(signatures.map((signature) => [signature.key, signature]));
  const used = new Set<string>();
  const ordered = order
    .map((key) => byKey.get(key))
    .filter((signature): signature is NonNullable<typeof signature> => {
      if (!signature || used.has(signature.key)) return false;

      used.add(signature.key);
      return true;
    });

  return [
    ...ordered,
    ...signatures.filter((signature) => !used.has(signature.key)),
  ];
}

function getReportTwoConfiguredSignatureCards(
  signatures: ReturnType<typeof getReportTwoSignatureCardsFromPayload>,
  block: StudioBlock | null | undefined,
) {
  const hiddenKeys = getReportTwoSignatureHiddenKeys(block);

  return getReportTwoOrderedSignatureCards(signatures, block).filter(
    (signature) => !hiddenKeys.has(signature.key),
  );
}

function moveReportTwoSignatureOrder(
  currentOrder: unknown,
  allKeys: string[],
  key: string,
  direction: -1 | 1,
) {
  const normalizedKeys = allKeys.map((item) => cleanText(item)).filter(Boolean);
  const current = Array.isArray(currentOrder)
    ? currentOrder.map((item) => cleanText(item)).filter(Boolean)
    : [];

  const order = [
    ...current.filter((item) => normalizedKeys.includes(item)),
    ...normalizedKeys.filter((item) => !current.includes(item)),
  ];

  const index = order.indexOf(key);
  const targetIndex = index + direction;

  if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }

  const next = [...order];
  const currentItem = next[index];

  next[index] = next[targetIndex];
  next[targetIndex] = currentItem;

  return next;
}

function toggleReportTwoSignatureHiddenKey(currentHiddenKeys: unknown, key: string) {
  const hidden = new Set(
    Array.isArray(currentHiddenKeys)
      ? currentHiddenKeys.map((item) => cleanText(item)).filter(Boolean)
      : [],
  );

  if (hidden.has(key)) {
    hidden.delete(key);
  } else {
    hidden.add(key);
  }

  return Array.from(hidden);
}

function withReportTwoSignatureBlock(
  template: StudioTemplate,
  payload: SmartReportPayload,
): StudioTemplate {
  const signatures = getReportTwoSignatureCardsFromPayload(payload);
  let signatureBlock: StudioBlock | null = null;

  const pagesWithoutSignatureBlocks = template.pages.map((page) => ({
    ...page,
    blocks: page.blocks.filter((block) => {
      if (isReportTwoSignatureBlock(block)) {
        if (!signatureBlock) {
          signatureBlock = block;
        }

        return false;
      }

      return true;
    }),
  }));

  if (!signatureBlock) {
    return template;
  }

  const targetPageId = getReportTwoSignatureTargetPageId(pagesWithoutSignatureBlocks);

  if (!targetPageId) {
    return template;
  }

  const baseSignatureBlock = signatureBlock as StudioBlock;

  const normalizedSignatureBlock = {
    ...baseSignatureBlock,
    kind: "signature-grid" as StudioBlockKind,
    title: baseSignatureBlock.title || "تواقيع الاعتماد",
    content: "",
    variant: baseSignatureBlock.variant || "soft",
    source: baseSignatureBlock.source || "manual",
    showTitle: baseSignatureBlock.showTitle ?? false,
    showMeta: false,
    align: "center",
    placement: "bottom",
    signatures: getReportTwoConfiguredSignatureCards(signatures, signatureBlock),
  } as StudioBlock;

  return {
    ...template,
    pages: pagesWithoutSignatureBlocks.map((page) =>
      page.id === targetPageId
        ? {
            ...page,
            blocks: [...page.blocks, normalizedSignatureBlock],
          }
        : page,
    ),
  };
}
function getReportTwoTextLineCount(content: string) {
  const text = cleanText(content);
  const hardLines = text.split("\n").filter(Boolean).length;

  return Math.max(hardLines, Math.ceil(text.length / 68), 1);
}

function getReportTwoDynamicFieldsColumns(designId?: ReportDesignId) {
  if (
    designId === "ministry-form" ||
    designId === "modern-official" ||
    designId === "report-official-archive"
  ) {
    return 3;
  }

  return 2;
}

function getReportTwoEstimatedTextLines(text: string, charsPerLine: number) {
  const value = cleanText(text);

  if (!value) {
    return 1;
  }

  return value
    .split(/\n+/)
    .filter(Boolean)
    .reduce((count, line) => count + Math.max(Math.ceil(line.length / charsPerLine), 1), 0);
}

function getReportTwoDynamicFieldCardHeightScore(field: ReportTwoDynamicField) {
  const labelLines = getReportTwoEstimatedTextLines(field.label, 18);
  const valueItems = Array.isArray(field.valueItems)
    ? uniqueReportTwoValueItems(field.valueItems)
    : [];
  const valueLines =
    valueItems.length > 1
      ? valueItems.reduce(
          (count, item) => count + getReportTwoEstimatedTextLines(item, 22),
          0,
        )
      : getReportTwoEstimatedTextLines(
          valueItems[0] || cleanText(field.value) || "غير متوفر",
          24,
        );

  const baseScore = 13;
  const labelScore = labelLines * 3.5;
  const valueScore = valueItems.length > 1 ? valueLines * 4.8 + 4 : valueLines * 5.4;

  return Math.max(baseScore + labelScore + valueScore, 22);
}

function getReportTwoDynamicFieldRows(
  block: StudioBlock,
  previewCase: ReturnType<typeof getPreviewCase>,
  designId?: ReportDesignId,
) {
  const fields = getDynamicFieldsForBlock(block, previewCase).filter(
    (field) => field.visible !== false,
  );
  const columns = getReportTwoDynamicFieldsColumns(designId);
  const rows: ReportTwoDynamicField[][] = [];

  for (let index = 0; index < fields.length; index += columns) {
    rows.push(fields.slice(index, index + columns));
  }

  return rows;
}

function getReportTwoDynamicFieldsChunkHeightScore(
  block: StudioBlock,
  rows: ReportTwoDynamicField[][],
) {
  const titleScore =
    block.showTitle === false || !cleanText(block.title)
      ? 0
      : 12;
  const shellScore = block.variant === "plain" ? 4 : 8;

  if (!rows.length) {
    return titleScore + shellScore + 16;
  }

  const rowsScore = rows.reduce((total, row, rowIndex) => {
    const rowHeight = row.reduce(
      (maxScore, field) => Math.max(maxScore, getReportTwoDynamicFieldCardHeightScore(field)),
      0,
    );

    return total + rowHeight + (rowIndex > 0 ? 4 : 0);
  }, 0);

  return titleScore + shellScore + rowsScore;
}

function createReportTwoDynamicFieldsChunkBlock(
  block: StudioBlock,
  rows: ReportTwoDynamicField[][],
  chunkIndex: number,
) {
  const sourceBlockId = cleanText((block as any).sourceBlockId) || block.id;

  return {
    ...block,
    id: chunkIndex === 0 ? block.id : `${sourceBlockId}-auto-dynamic-${chunkIndex + 1}`,
    title:
      chunkIndex === 0
        ? block.title
        : `${block.title || "التفاصيل"} - تكملة`,
    showTitle: chunkIndex === 0 ? block.showTitle : false,
    dynamicFields: rows.flat(),
    reportTwoVirtualBlock: chunkIndex > 0,
    sourceBlockId,
  } as StudioBlock;
}

function getReportTwoBlockHeightScore(
  block: StudioBlock,
  previewCase: ReturnType<typeof getPreviewCase>,
  designId?: ReportDesignId,
) {
  if (isReportTwoSignatureBlock(block) || (block as any)?.placement === "bottom") {
    return 0;
  }

  if (block.kind === "hero-title") return 32;
  if (block.kind === "meta-strip") return 28;
  if (block.kind === "closing-note") return 28;
  if (block.kind === "highlight-note") return 28;
  if (block.kind === "plain-text") return 24;

  if (block.kind === "dynamic-fields") {
    return getReportTwoDynamicFieldsChunkHeightScore(
      block,
      getReportTwoDynamicFieldRows(block, previewCase, designId),
    );
  }

  if (block.kind === "section-text" || block.kind === "multi-paragraph") {
    const content = cleanText(block.content);
    const lineCount = getReportTwoTextLineCount(content);
    const baseScore = 20;

    return baseScore + lineCount * 8.5;
  }

  if (block.kind === "bullet-list") {
    const count = Math.max(
      cleanText(block.content)
        .split("\n")
        .filter(Boolean).length,
      1,
    );

    return 20 + count * 7;
  }

  if (block.kind === "report-one-table") {
    const rowCount = Math.max(block.rows?.length || 0, 1);
    return 28 + rowCount * 11;
  }

  if (block.kind === "evidence-gallery") {
    const perPage = getEvidencePerPageFromBlock(block);
    const shown = Math.min(perPage, Math.max(previewCase.evidences.length, 1));

    if (block.evidenceLayout === "ONE_PER_PAGE") return 92;
    if (block.evidenceLayout === "GRID_2X2") return shown <= 2 ? 54 : 72;
    if (block.evidenceLayout === "ATTACHMENT_LIST") return 20 + shown * 8;

    return shown <= 2 ? 52 : 70;
  }

  return 32;
}

function isReportTwoSplittableTextBlock(block: StudioBlock) {
  return (
    block.kind === "section-text" ||
    block.kind === "multi-paragraph" ||
    block.kind === "plain-text"
  );
}

function splitReportTwoTextBySafeSize(content: string) {
  const text = cleanText(content);

  if (!text) {
    return [""];
  }

  const maxChars = 460;
  const chunks: string[] = [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  let current = "";

  function pushCurrent() {
    const value = current.trim();

    if (value) {
      chunks.push(value);
    }

    current = "";
  }

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (paragraph.length > maxChars) {
      pushCurrent();

      for (let index = 0; index < paragraph.length; index += maxChars) {
        chunks.push(paragraph.slice(index, index + maxChars).trim());
      }

      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length > maxChars) {
      pushCurrent();
      current = paragraph;
    } else {
      current = next;
    }
  }

  pushCurrent();

  return chunks.length ? chunks : [text];
}

function splitReportTwoBlockForPagination(
  block: StudioBlock,
  previewCase: ReturnType<typeof getPreviewCase>,
  designId?: ReportDesignId,
) {
  if (!isReportTwoSplittableTextBlock(block)) {
    return [block];
  }

  const content = cleanText(block.content);

  if (!content) {
    return [block];
  }

  const score = getReportTwoBlockHeightScore(block, previewCase, designId);

  if (score <= REPORT_TWO_PAGE_SAFE_HEIGHT_SCORE) {
    return [block];
  }

  return splitReportTwoTextBySafeSize(content).map((chunk, index) => ({
    ...block,
    id: index === 0 ? block.id : `${block.id}-auto-text-${index + 1}`,
    title: index === 0 ? block.title : `${block.title || "نص"} - تكملة ${index + 1}`,
    content: chunk,
    reportTwoVirtualBlock: index > 0,
    sourceBlockId: (block as any).sourceBlockId || block.id,
  })) as StudioBlock[];
}
function makeReportTwoContinuationPage(
  sourcePage: StudioPage,
  index: number,
): StudioPage {
  return {
    ...sourcePage,
    id: `${sourcePage.id}-auto-page-${index}`,
    title: `${sourcePage.title} - صفحة ${index}`,
    description: "صفحة تكميلية أنشأها report-2 لحماية حدود A4.",
    sourceTemplatePageId: sourcePage.id,
    reportTwoVirtualPage: true,
    blocks: [],
  } as StudioPage;
}

function normalizeReportTwoBlockForRuntime(
  block: StudioBlock,
  previewCase: ReturnType<typeof getPreviewCase>,
): StudioBlock {
  if (isReportTwoDynamicFieldsBlock(block)) {
    return {
      ...block,
      sourceBlockId: block.id,
      kind: "dynamic-fields" as StudioBlockKind,
      dynamicFields: getDynamicFieldsForBlock(block, previewCase),
    };
  }

  if (block.kind !== "evidence-gallery") {
    return {
      ...block,
      sourceBlockId: block.id,
    } as StudioBlock;
  }

  const perPage = getEvidencePerPageFromBlock(block);
  const count = previewCase.evidences.length;

  return {
    ...block,
    evidenceStartIndex: Number(block.evidenceStartIndex || 0),
    evidenceLimit: perPage,
    evidenceAutoCreatePages: false,
    evidenceEmptyBehavior: count ? block.evidenceEmptyBehavior : "message",
  } as StudioBlock;
}

function buildReportTwoRuntimeTemplate(
  template: StudioTemplate,
  previewCase: ReturnType<typeof getPreviewCase>,
): StudioTemplate {
  const runtimePages: StudioPage[] = [];
  const designId = template.designTemplateId;

  template.pages.forEach((sourcePage) => {
    let pageNumber = 1;
    let usedScore = 0;
    let currentPageAlreadyPushed = false;

    let currentPage: StudioPage = {
      ...sourcePage,
      blocks: [],
    };

    function pushCurrentPage() {
      if (currentPageAlreadyPushed) return;
      if (!currentPage.blocks.length) return;

      runtimePages.push({
        ...currentPage,
        blocks: currentPage.blocks,
      });

      currentPageAlreadyPushed = true;
    }

    function startNextPage() {
      pageNumber += 1;
      usedScore = 0;
      currentPage = makeReportTwoContinuationPage(sourcePage, pageNumber);
      currentPageAlreadyPushed = false;
    }

    function placeBlock(block: StudioBlock) {
      const blockScore = getReportTwoBlockHeightScore(block, previewCase, designId);
      const pageSafeHeightScore =
        block.kind === "evidence-gallery"
          ? REPORT_TWO_EVIDENCE_SAFE_HEIGHT_SCORE
          : REPORT_TWO_PAGE_SAFE_HEIGHT_SCORE;

      if (
        currentPage.blocks.length > 0 &&
        usedScore + blockScore > pageSafeHeightScore
      ) {
        pushCurrentPage();
        startNextPage();
      }

      currentPage.blocks.push(block);
      usedScore += Math.min(blockScore, pageSafeHeightScore);

      if (block.kind === "evidence-gallery") {
        const perPage = getEvidencePerPageFromBlock(block);
        const count = previewCase.evidences.length;
        const pagesCount = Math.ceil(count / perPage);

        if (pagesCount > 1) {
          pushCurrentPage();

          for (let index = 1; index < pagesCount; index += 1) {
            const evidencePageNumber = pageNumber + index;
            const evidencePage: StudioPage = {
              ...sourcePage,
              id: `${sourcePage.id}-${block.id}-evidence-${evidencePageNumber}`,
              kind: "evidence",
              title: `${block.title || "الشواهد"} - صفحة ${index + 1}`,
              description: "صفحة شواهد إضافية داخل التقرير.",
              sourceTemplatePageId: sourcePage.id,
              reportTwoVirtualPage: true,
              blocks: [
                {
                  ...block,
                  id: `${block.id}-evidence-${index + 1}`,
                  sourceBlockId: (block as any).sourceBlockId || block.id,
                  title: `${block.title || "الشواهد"} - صفحة ${index + 1}`,
                  evidenceStartIndex: index * perPage,
                  evidenceLimit: perPage,
                  evidenceAutoCreatePages: false,
                },
              ],
            };

            runtimePages.push(evidencePage);
          }

          pageNumber += pagesCount - 1;
          startNextPage();
        }
      }
    }

    function placeDynamicFieldsBlock(block: StudioBlock) {
      const rows = getReportTwoDynamicFieldRows(block, previewCase, designId);

      if (!rows.length) {
        placeBlock(block);
        return;
      }

      let rowIndex = 0;
      let chunkIndex = 0;

      while (rowIndex < rows.length) {
        const pageSafeHeightScore = REPORT_TWO_PAGE_SAFE_HEIGHT_SCORE;
        const remainingScore = Math.max(pageSafeHeightScore - usedScore, 0);
        const chunkRows: ReportTwoDynamicField[][] = [];

        while (rowIndex < rows.length) {
          const candidateRows = [...chunkRows, rows[rowIndex]];
          const candidateBlock = createReportTwoDynamicFieldsChunkBlock(
            block,
            candidateRows,
            chunkIndex,
          );
          const candidateScore = getReportTwoDynamicFieldsChunkHeightScore(
            candidateBlock,
            candidateRows,
          );
          const canFitCurrentPage =
            candidateScore <= remainingScore ||
            (currentPage.blocks.length === 0 &&
              chunkRows.length === 0 &&
              candidateRows.length === 1);

          if (!canFitCurrentPage && chunkRows.length === 0) {
            pushCurrentPage();
            startNextPage();
            break;
          }

          if (!canFitCurrentPage) {
            break;
          }

          chunkRows.push(rows[rowIndex]);
          rowIndex += 1;
        }

        if (!chunkRows.length) {
          continue;
        }

        placeBlock(
          createReportTwoDynamicFieldsChunkBlock(block, chunkRows, chunkIndex),
        );
        chunkIndex += 1;
      }
    }

    sourcePage.blocks.forEach((originalBlock) => {
      const normalizedBlock = normalizeReportTwoBlockForRuntime(
        originalBlock,
        previewCase,
      );

      if (normalizedBlock.kind === "dynamic-fields") {
        placeDynamicFieldsBlock(normalizedBlock);
        return;
      }

      const runtimeBlocks = splitReportTwoBlockForPagination(
        normalizedBlock,
        previewCase,
        designId,
      );

      runtimeBlocks.forEach((block) => placeBlock(block));
    });

    pushCurrentPage();
  });

  return {
    ...template,
    pages: runtimePages,
  };
}
function getWritableReportTwoPageId(
  activePageId: string,
  activePage: StudioPage | undefined,
  template: StudioTemplate,
) {
  const directPage = template.pages.find((page) => page.id === activePageId);

  if (directPage) return directPage.id;

  const sourceTemplatePageId = cleanText((activePage as any)?.sourceTemplatePageId);

  if (sourceTemplatePageId) {
    const sourcePage = template.pages.find((page) => page.id === sourceTemplatePageId);

    if (sourcePage) return sourcePage.id;
  }

  const autoPageParentId = activePageId.includes("-auto-page-")
    ? activePageId.split("-auto-page-")[0]
    : "";

  if (autoPageParentId) {
    const sourcePage = template.pages.find((page) => page.id === autoPageParentId);

    if (sourcePage) return sourcePage.id;
  }

  const evidencePageParentId = activePageId.includes("-evidence-")
    ? activePageId.split("-evidence-")[0]
    : "";

  if (evidencePageParentId) {
    const sourcePage = template.pages.find((page) =>
      evidencePageParentId.startsWith(page.id),
    );

    if (sourcePage) return sourcePage.id;
  }

  return template.pages[0]?.id || "";
}
function getReportTwoSourcePageId(pageId: string, runtimePage: any) {
  const sourceTemplatePageId = cleanText(runtimePage?.sourceTemplatePageId);

  if (sourceTemplatePageId) return sourceTemplatePageId;

  if (pageId.includes("-auto-page-")) {
    return pageId.split("-auto-page-")[0];
  }

  if (pageId.includes("-evidence-")) {
    const beforeEvidence = pageId.split("-evidence-")[0];

    return beforeEvidence.split("-").slice(0, -1).join("-") || beforeEvidence;
  }

  return pageId;
}

function findReportTwoRuntimePageIdForBlock(
  runtimeTemplate: StudioTemplate,
  blockId: string,
  fallbackPageId: string,
) {
  const runtimePage = runtimeTemplate.pages.find((page) =>
    page.blocks.some((block) => {
      return block.id === blockId || cleanText((block as any).sourceBlockId) === blockId;
    }),
  );

  return runtimePage?.id || fallbackPageId;
}

function resolveReportTwoEquivalentPageId(
  pages: StudioPage[],
  activePageId: string,
) {
  if (!pages.length) return "";
  if (pages.some((page) => page.id === activePageId)) return activePageId;

  const sourcePageId = getReportTwoSourcePageId(activePageId, null);
  const equivalentPage =
    pages.find((page) => page.id === sourcePageId) ||
    pages.find(
      (page) => cleanText((page as any).sourceTemplatePageId) === sourcePageId,
    ) ||
    pages.find((page) => page.id.startsWith(`${sourcePageId}-auto-page-`));

  return equivalentPage?.id || pages[0]?.id || "";
}

function reorderReportTwoPages(
  pages: StudioPage[],
  sourcePageId: string,
  direction: "previous" | "next",
) {
  const index = pages.findIndex((page) => page.id === sourcePageId);

  if (index < 0) return pages;

  const targetIndex = direction === "previous" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= pages.length) {
    return pages;
  }

  const nextPages = [...pages];
  const [page] = nextPages.splice(index, 1);
  nextPages.splice(targetIndex, 0, page);

  return nextPages;
}


function isReportTwoDynamicFieldsBlock(block: StudioBlock | null | undefined) {
  if (!block) return false;

  const kind = cleanText(block.kind);
  const smartKind = cleanText((block as any).settings?.smartBlockKind);
  const title = cleanText(block.title);

  return (
    kind === "dynamic-fields" ||
    kind === "field-list" ||
    kind === "case-meta" ||
    kind === "student-summary" ||
    kind === "service-summary" ||
    smartKind === "dynamic-fields" ||
    smartKind === "field-list" ||
    title.includes("حقول") ||
    title.includes("بيانات الحالة")
  );
}
function getReportTwoLookupKey(value: unknown) {
  return cleanText(value).toLowerCase();
}

function getReportTwoDisplayText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => getReportTwoDisplayText(item))
      .filter(Boolean)
      .join("، ");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const candidates = [
      record.displayValue,
      record.valueLabel,
      record.optionLabel,
      record.selectedOptionLabel,
      record.labelAr,
      record.nameAr,
      record.titleAr,
      record.label,
      record.name,
      record.title,
      record.text,
      record.value,
    ];

    for (const candidate of candidates) {
      const text = cleanText(candidate);

      if (text) return text;
    }

    return "";
  }

  return cleanText(value);
}

function getReportTwoOptionCollections(field: any) {
  return [
    field.options,
    field.dynamicFieldOptions,
    field.fieldOptions,
    field.choices,
    field.items,
    field.field?.options,
    field.field?.dynamicFieldOptions,
    field.dynamicField?.options,
    field.workflowField?.options,
  ].filter(Array.isArray) as any[][];
}

function getReportTwoOptionArabicLabel(field: any, rawValue: unknown) {
  const target = getReportTwoLookupKey(rawValue);

  if (!target) return "";

  for (const options of getReportTwoOptionCollections(field)) {
    for (const option of options) {
      const optionValues = [
        option.value,
        option.key,
        option.code,
        option.slug,
        option.id,
      ].map(getReportTwoLookupKey);

      if (!optionValues.includes(target)) {
        continue;
      }

      const label = getReportTwoDisplayText({
        displayValue: option.displayValue,
        valueLabel: option.valueLabel,
        optionLabel: option.optionLabel,
        labelAr: option.labelAr,
        nameAr: option.nameAr,
        titleAr: option.titleAr,
        label: option.label,
        name: option.name,
        title: option.title,
        text: option.text,
      });

      if (label) return label;
    }
  }

  return "";
}

function getReportTwoReadableFieldLabel(field: any, index: number) {
  const key =
    cleanText(field.key) ||
    cleanText(field.fieldKey) ||
    cleanText(field.name) ||
    cleanText(field.id) ||
    `field-${index + 1}`;

  const candidates = [
    field.displayLabel,
    field.fieldLabel,
    field.labelAr,
    field.nameAr,
    field.titleAr,
    field.label,
    field.title,
    field.field?.label,
    field.dynamicField?.label,
    field.workflowField?.label,
  ];

  for (const candidate of candidates) {
    const text = cleanText(candidate);

    if (text && text !== key) return text;
  }

  const fromMap = getReportTwoFieldLabel(key, field.label);

  if (fromMap && fromMap !== key) return fromMap;

  return key;
}

function uniqueReportTwoValueItems(items: string[]) {
  return Array.from(
    new Set(items.map((item) => cleanText(item)).filter(Boolean)),
  );
}

function getReportTwoReadableFieldValueItems(field: any) {
  const directArrays = [
    field.valueItems,
    field.values,
    field.items,
    field.selectedValues,
    field.selectedOptions,
    Array.isArray(field.value) ? field.value : null,
  ].filter(Array.isArray) as unknown[][];

  const items = uniqueReportTwoValueItems(
    directArrays.flatMap((entries) =>
      entries.map((entry) => getReportTwoDisplayText(entry)).filter(Boolean),
    ),
  );

  return items.length > 1 ? items : [];
}

function getReportTwoReadableFieldValue(field: any) {
  const readableItems = getReportTwoReadableFieldValueItems(field);

  if (readableItems.length > 1) {
    return readableItems.join("، ");
  }

  const explicitCandidates = [
    field.displayValue,
    field.formattedValue,
    field.valueLabel,
    field.labelValue,
    field.optionLabel,
    field.selectedOptionLabel,
    field.answerLabel,
    field.answerText,
    field.textValue,
    field.valueText,
  ];

  for (const candidate of explicitCandidates) {
    const text = getReportTwoDisplayText(candidate);

    if (text) return text;
  }

  const optionLabel = getReportTwoOptionArabicLabel(field, field.value);

  if (optionLabel) return optionLabel;

  const rawValue = cleanText(field.value);

  if (!rawValue) return "";

  const fromMap = getReportTwoFieldValue(rawValue);

  if (fromMap && fromMap !== rawValue) return fromMap;

  return rawValue;
}

function getReportTwoDynamicFieldsFromPreviewCase(
  previewCase: ReturnType<typeof getPreviewCase>,
): ReportTwoDynamicField[] {
  const fields = (previewCase.values || [])
    .map((item: any, index: number) => {
      const key = cleanText(item.fieldKey) || `workflow-field-${index + 1}`;
      const label = cleanText(item.fieldLabel) || key || `حقل ${index + 1}`;
      const value = cleanText(item.value);
      const valueItems = Array.isArray(item.valueItems)
        ? uniqueReportTwoValueItems(item.valueItems)
        : [];

      return {
        id: key || `workflow-field-${index + 1}`,
        key,
        label,
        value,
        ...(valueItems.length > 1 ? { valueItems } : {}),
        visible: Boolean(label && (value || valueItems.length)),
      };
    })
    .filter((item) => item.label && (item.value || item.valueItems?.length));

  return ensureUniqueReportTwoDynamicFieldIds(fields);
}

function getDynamicFieldsForBlock(
  block: StudioBlock | null,
  previewCase: ReturnType<typeof getPreviewCase>,
) {
  const sourceFields = getReportTwoDynamicFieldsFromPreviewCase(previewCase);

  if (!block?.dynamicFields?.length) {
    return sourceFields;
  }

  const sourceByKey = new Map<string, ReportTwoDynamicField>();

  sourceFields.forEach((field) => {
    [field.id, field.key, field.label].forEach((value) => {
      const key = getReportTwoLookupKey(value);

      if (key) {
        sourceByKey.set(key, field);
      }
    });
  });

  const fields = block.dynamicFields.map((field, index) => {
    const source =
      sourceByKey.get(getReportTwoLookupKey(field.key)) ||
      sourceByKey.get(getReportTwoLookupKey(field.id)) ||
      sourceByKey.get(getReportTwoLookupKey(field.label)) ||
      sourceFields[index];

    const key = field.key || source?.key || `dynamic-field-${index + 1}`;
    const configuredValue = cleanText(field.value);
    const configuredValueItems = Array.isArray(field.valueItems)
      ? uniqueReportTwoValueItems(field.valueItems)
      : [];
    const sourceValue = cleanText(source?.value);
    const sourceValueItems = Array.isArray(source?.valueItems)
      ? uniqueReportTwoValueItems(source.valueItems)
      : [];
    const matchesSourceValue =
      Boolean(configuredValue && sourceValue) &&
      getReportTwoLookupKey(configuredValue) === getReportTwoLookupKey(sourceValue);
    const shouldUseSourceValueItems =
      sourceValueItems.length > 1 &&
      ((configuredValueItems.length > 0 &&
        configuredValueItems.every((item) => isReportTwoTechnicalValue(item))) ||
        (configuredValueItems.length === 0 &&
          (!configuredValue ||
            isReportTwoTechnicalValue(configuredValue) ||
            matchesSourceValue)));
    const valueItems = shouldUseSourceValueItems
      ? sourceValueItems
      : configuredValueItems;
    const value =
      configuredValue && !shouldUseSourceValueItems
        ? configuredValue
        : sourceValue || getReportTwoFieldValue(field.value) || configuredValue;

    return {
      id: field.id || source?.id || `dynamic-field-${index + 1}`,
      key,
      label: field.label ?? cleanText(source?.label) ?? getReportTwoFieldLabel(field.key, field.label) ?? key,
      value,
      ...(valueItems.length > 1 ? { valueItems } : {}),
      visible: field.visible !== false,
    };
  });

  return ensureUniqueReportTwoDynamicFieldIds(fields);
}
function getReportTwoTableSettings(
  settings?: Record<string, any>,
): ReportTwoTableSettings {
  const validThemes = ["light-gray", "soft-blue", "green", "none"] as const;
  const colorTheme = settings?.colorTheme;
  return {
    highlightHeader: settings?.highlightHeader !== false,
    highlightFirstColumn: settings?.highlightFirstColumn !== false,
    stripedRows: settings?.stripedRows !== false,
    rounded: settings?.rounded !== false,
    compact: Boolean(settings?.compact),
    repeatHeader: settings?.repeatHeader !== false,
    colorTheme: validThemes.includes(colorTheme) ? colorTheme : "light-gray",
  };
}

function normalizeReportTwoTableColumns(columns?: string[]) {
  const cleaned = Array.isArray(columns)
    ? columns.map((column) => cleanText(column)).filter(Boolean)
    : [];

  return cleaned.length ? cleaned : ["المجال", "الإجراء", "ملاحظات"];
}

function normalizeReportTwoTableRows(rows: unknown, columnsCount: number) {
  const sourceRows = Array.isArray(rows) && rows.length
    ? rows
    : [
        Array.from({ length: columnsCount }).map(() => ""),
        Array.from({ length: columnsCount }).map(() => ""),
        Array.from({ length: columnsCount }).map(() => ""),
      ];

  return sourceRows.map((row: any) => {
    const cells = Array.isArray(row) ? row : [];
    const normalized = Array.from({ length: columnsCount }).map((_, index) =>
      cleanText(cells[index]),
    );

    return normalized;
  });
}

function createReportTwoTableDraft(block: StudioBlock): ReportTwoTableDraft {
  const columns = normalizeReportTwoTableColumns(block.columns);
  const rows = normalizeReportTwoTableRows(block.rows, columns.length);

  return {
    blockId: block.id,
    title: cleanText(block.title) || "جدول",
    columns,
    rows,
    settings: getReportTwoTableSettings(block.tableSettings),
  };
}

function countReportTwoFilledCells(rows: string[][]) {
  return rows.reduce(
    (total, row) =>
      total + row.filter((cell) => cleanText(cell).length > 0).length,
    0,
  );
}

function updateReportTwoTableTitle(
  draft: ReportTwoTableDraft,
  title: string,
): ReportTwoTableDraft {
  return {
    ...draft,
    title,
  };
}

function updateReportTwoTableColumn(
  draft: ReportTwoTableDraft,
  columnIndex: number,
  value: string,
): ReportTwoTableDraft {
  const columns = draft.columns.map((column, index) =>
    index === columnIndex ? value : column,
  );

  return {
    ...draft,
    columns,
    rows: normalizeReportTwoTableRows(draft.rows, columns.length),
  };
}

function updateReportTwoTableCell(
  draft: ReportTwoTableDraft,
  rowIndex: number,
  columnIndex: number,
  value: string,
): ReportTwoTableDraft {
  const rows = normalizeReportTwoTableRows(draft.rows, draft.columns.length);

  rows[rowIndex] = rows[rowIndex].map((cell, index) =>
    index === columnIndex ? value : cell,
  );

  return {
    ...draft,
    rows,
  };
}

function addReportTwoTableRow(draft: ReportTwoTableDraft): ReportTwoTableDraft {
  return {
    ...draft,
    rows: [
      ...normalizeReportTwoTableRows(draft.rows, draft.columns.length),
      Array.from({ length: draft.columns.length }).map(() => ""),
    ],
  };
}

function removeReportTwoTableRow(
  draft: ReportTwoTableDraft,
  rowIndex: number,
): ReportTwoTableDraft {
  const rows = normalizeReportTwoTableRows(draft.rows, draft.columns.length);

  if (rows.length <= 1) {
    return draft;
  }

  return {
    ...draft,
    rows: rows.filter((_, index) => index !== rowIndex),
  };
}

function addReportTwoTableColumn(
  draft: ReportTwoTableDraft,
): ReportTwoTableDraft {
  const columns = [...draft.columns, `عمود ${draft.columns.length + 1}`];

  return {
    ...draft,
    columns,
    rows: normalizeReportTwoTableRows(draft.rows, draft.columns.length).map(
      (row) => [...row, ""],
    ),
  };
}

function removeReportTwoTableColumn(
  draft: ReportTwoTableDraft,
  columnIndex: number,
): ReportTwoTableDraft {
  if (draft.columns.length <= 1) {
    return draft;
  }

  const columns = draft.columns.filter((_, index) => index !== columnIndex);
  const rows = normalizeReportTwoTableRows(draft.rows, draft.columns.length).map(
    (row) => row.filter((_, index) => index !== columnIndex),
  );

  return {
    ...draft,
    columns,
    rows: normalizeReportTwoTableRows(rows, columns.length),
  };
}

function updateReportTwoTableSetting(
  draft: ReportTwoTableDraft,
  key: keyof ReportTwoTableSettings,
  value: boolean | string,
): ReportTwoTableDraft {
  return {
    ...draft,
    settings: {
      ...draft.settings,
      [key]: value,
    },
  };
}

function isReportTwoTechnicalValue(value: unknown) {
  const text = cleanText(value);

  if (!text) return false;

  return /^[a-z0-9_./-]+$/i.test(text) && /[a-z_]/i.test(text);
}

function getReportTwoFilledTableCells(block: StudioBlock) {
  const columns = normalizeReportTwoTableColumns(block.columns);
  const rows = normalizeReportTwoTableRows(block.rows, columns.length);

  return countReportTwoFilledCells(rows);
}

function getReportTwoSmartAlertSortValue(type: ReportTwoSmartAlertType) {
  if (type === "error") return 0;
  if (type === "warning") return 1;
  if (type === "info") return 2;

  return 3;
}

function getReportTwoSmartAlerts({
  visiblePreviewTemplate,
  previewCase,
  activeHeaderValues,
  activeLogoSettings,
  hiddenRuntimePageIds,
}: {
  visiblePreviewTemplate: StudioTemplate;
  previewCase: ReturnType<typeof getPreviewCase>;
  activeHeaderValues: ReportTwoHeaderValues;
  activeLogoSettings: ReportTwoLogoSettings;
  hiddenRuntimePageIds: string[];
}) {
  const alerts: ReportTwoSmartAlert[] = [];
  const pages = visiblePreviewTemplate.pages || [];

  if (!pages.length) {
    alerts.push({
      id: "no-pages",
      type: "error",
      title: "لا توجد صفحات في التقرير",
      description: "أضف صفحة محتوى حتى يظهر التقرير بشكل صحيح.",
      action: "open-page",
    });

    return alerts;
  }

  if (!cleanText(activeLogoSettings.url)) {
    alerts.push({
      id: "missing-logo",
      type: "warning",
      title: "الشعار غير محدد",
      description: "ضع شعارًا للتقرير أو استخدم الشعار الافتراضي.",
      action: "restore-header",
    });
  }

  const missingHeaderFields = Object.entries(activeHeaderValues).filter(
    ([, value]) => !cleanText(value),
  );

  if (missingHeaderFields.length) {
    alerts.push({
      id: "missing-header-values",
      type: "warning",
      title: "الترويسة غير مكتملة",
      description: "بعض قيم أعلى الصفحة فارغة. يمكن استعادتها من بيانات الحالة.",
      action: "restore-header",
    });
  }

  if (hiddenRuntimePageIds.length) {
    alerts.push({
      id: "hidden-pages",
      type: "info",
      title: "توجد صفحات مخفية",
      description: "هناك صفحات تم إخفاؤها من المعاينة. تأكد أنها غير مطلوبة قبل الاعتماد.",
      action: "focus-preview",
    });
  }

  pages.forEach((page, pageIndex) => {
    if (!page.blocks.length) {
      alerts.push({
        id: `empty-page-${page.id}`,
        type: "warning",
        title: "صفحة بدون محتوى",
        description: `الصفحة ${pageIndex + 1} لا تحتوي على بلوكات.`,
        pageId: page.id,
        action: "open-page",
      });
    }

    page.blocks.forEach((block) => {
      if (isReportTwoDynamicFieldsBlock(block)) {
        const fields = getDynamicFieldsForBlock(block, previewCase);
        const visibleFields = fields.filter((field) => field.visible !== false);
        const technicalFields = visibleFields.filter(
          (field) =>
            isReportTwoTechnicalValue(field.label) ||
            isReportTwoTechnicalValue(field.value),
        );

        if (!visibleFields.length) {
          alerts.push({
            id: `no-visible-fields-${page.id}-${block.id}`,
            type: "warning",
            title: "لا توجد حقول ظاهرة",
            description: "بلوك الحقول موجود، لكن كل الحقول مخفية أو فارغة.",
            pageId: page.id,
            blockId: block.id,
            action: "open-block",
          });
        }

        if (visibleFields.length > 14) {
          alerts.push({
            id: `too-many-fields-${page.id}-${block.id}`,
            type: "warning",
            title: "حقول كثيرة في صفحة واحدة",
            description: "عدد الحقول كبير وقد يصعّب قراءة التقرير. أخفِ غير المهم أو انقل جزءًا لصفحة أخرى.",
            pageId: page.id,
            blockId: block.id,
            action: "open-block",
          });
        }

        if (technicalFields.length) {
          alerts.push({
            id: `technical-fields-${page.id}-${block.id}`,
            type: "warning",
            title: "حقول تقنية ظاهرة",
            description: "توجد أسماء أو قيم تقنية مثل activity_domain أو program_02. يمكن إخفاؤها تلقائيًا.",
            pageId: page.id,
            blockId: block.id,
            action: "hide-technical-fields",
          });
        }
      }

      if (block.kind === "evidence-gallery") {
        const evidenceCount = previewCase.evidences.length;
        const perPage = getEvidencePerPageFromBlock(block);

        if (!evidenceCount) {
          alerts.push({
            id: `no-evidence-${page.id}-${block.id}`,
            type: "info",
            title: "لا توجد شواهد",
            description: "التقرير يحتوي على بلوك شواهد، لكن لا توجد مرفقات في الحالة.",
            pageId: page.id,
            blockId: block.id,
            action: "open-block",
          });
        }

        if (evidenceCount > perPage) {
          alerts.push({
            id: `evidence-overflow-${page.id}-${block.id}`,
            type: "info",
            title: "الشواهد موزعة على صفحات",
            description: `يوجد ${evidenceCount} شواهد، ويظهر ${perPage} في الصفحة. الباقي ينتقل تلقائيًا لصفحات شواهد.`,
            pageId: page.id,
            blockId: block.id,
            action: "focus-preview",
          });
        }
      }

      if (block.kind === "signature-grid") return 34;

  if (block.kind === "report-one-table") {
        const columns = normalizeReportTwoTableColumns(block.columns);
        const rows = normalizeReportTwoTableRows(block.rows, columns.length);
        const filledCells = getReportTwoFilledTableCells(block);

        if (!filledCells) {
          alerts.push({
            id: `empty-table-${page.id}-${block.id}`,
            type: "info",
            title: "جدول فارغ",
            description: "يوجد جدول بدون محتوى. عدّله أو احذفه إذا لم يكن مطلوبًا.",
            pageId: page.id,
            blockId: block.id,
            action: "open-block",
          });
        }

        if (columns.length > 4 || rows.length > 7) {
          alerts.push({
            id: `large-table-${page.id}-${block.id}`,
            type: "warning",
            title: "جدول كبير",
            description: "الجدول كبير وقد لا يكون مريحًا داخل A4. يفضّل تقليل الأعمدة أو نقله لصفحة مستقلة.",
            pageId: page.id,
            blockId: block.id,
            action: "open-block",
          });
        }
      }

      if (
        (block.kind === "section-text" || block.kind === "multi-paragraph") &&
        cleanText(block.content).length > 700
      ) {
        alerts.push({
          id: `long-text-${page.id}-${block.id}`,
          type: "warning",
          title: "فقرة طويلة",
          description: "الفقرة طويلة وقد تضغط الصفحة. اختصرها أو انقل جزءًا منها لبلوك جديد.",
          pageId: page.id,
          blockId: block.id,
          action: "open-block",
        });
      }
    });
  });

  if (!alerts.length) {
    alerts.push({
      id: "ready",
      type: "success",
      title: "التقرير يبدو جيدًا",
      description: "لا توجد تنبيهات مهمة حاليًا. يمكنك المتابعة بأمان.",
      action: "focus-preview",
    });
  }

  return alerts.sort(
    (firstAlert, secondAlert) =>
      getReportTwoSmartAlertSortValue(firstAlert.type) -
      getReportTwoSmartAlertSortValue(secondAlert.type),
  );
}

function getReportTwoFinalCheckItems({
  smartAlerts,
  visiblePreviewTemplate,
  activeHeaderValues,
  activeLogoSettings,
  lastAutoSavedAt,
}: {
  smartAlerts: ReportTwoSmartAlert[];
  visiblePreviewTemplate: StudioTemplate;
  activeHeaderValues: ReportTwoHeaderValues;
  activeLogoSettings: ReportTwoLogoSettings;
  lastAutoSavedAt: string;
}): ReportTwoFinalCheckItem[] {
  const errors = smartAlerts.filter((alert) => alert.type === "error");
  const warnings = smartAlerts.filter((alert) => alert.type === "warning");
  const pages = visiblePreviewTemplate.pages || [];
  const hasPages = pages.length > 0;
  const hasBlocks = pages.some((page) => page.blocks.length > 0);
  const headerComplete = Object.values(activeHeaderValues).every((value) =>
    Boolean(cleanText(value)),
  );
  const logoReady = Boolean(cleanText(activeLogoSettings.url));

  return [
    {
      id: "pages",
      label: "صفحات التقرير موجودة",
      description: hasPages
        ? `عدد الصفحات الحالية: ${pages.length}.`
        : "لا توجد صفحات داخل التقرير.",
      passed: hasPages,
      required: true,
    },
    {
      id: "blocks",
      label: "يوجد محتوى داخل التقرير",
      description: hasBlocks
        ? "التقرير يحتوي على بلوكات ومحتوى قابل للعرض."
        : "أضف بلوكًا واحدًا على الأقل قبل الاعتماد.",
      passed: hasBlocks,
      required: true,
    },
    {
      id: "header",
      label: "ترويسة التقرير مكتملة",
      description: headerComplete
        ? "قيم الترويسة الأساسية مكتملة."
        : "هناك قيمة أو أكثر فارغة في الترويسة.",
      passed: headerComplete,
      required: true,
    },
    {
      id: "logo",
      label: "الشعار جاهز",
      description: logoReady
        ? "يوجد شعار مستخدم في الترويسة."
        : "اختر شعارًا أو استعد الشعار الافتراضي.",
      passed: logoReady,
      required: false,
    },
    {
      id: "errors",
      label: "لا توجد أخطاء مانعة",
      description: errors.length
        ? `يوجد ${errors.length} خطأ مانع يحتاج إصلاحًا.`
        : "لا توجد أخطاء مانعة حاليًا.",
      passed: errors.length === 0,
      required: true,
    },
    {
      id: "warnings",
      label: "التنبيهات تمت مراجعتها",
      description: warnings.length
        ? `يوجد ${warnings.length} تنبيه. يمكن الاعتماد بعد مراجعتها.`
        : "لا توجد تنبيهات مهمة.",
      passed: warnings.length === 0,
      required: false,
    },
    {
      id: "draft",
      label: "المسودة محفوظة",
      description: lastAutoSavedAt
        ? `آخر حفظ: ${formatReportTwoSavedAt(lastAutoSavedAt)}.`
        : "سيتم حفظ المسودة تلقائيًا قبل التأكيد.",
      passed: Boolean(lastAutoSavedAt),
      required: false,
    },
  ];
}

function getReportTwoFinalCheckPassed(items: ReportTwoFinalCheckItem[]) {
  return items.every((item) => !item.required || item.passed);
}
function getReportTwoPreparedExecutionSummary(payload: SmartReportPayload) {
  return cleanText(
    (payload as any)?.narrative?.body ||
      (payload as any)?.executionSummary ||
      (payload as any)?.summary ||
      "",
  );
}

function isReportTwoExecutionSummaryPlaceholderText(input: unknown) {
  const content = cleanText(input).toLowerCase();

  if (!content) return true;
  if (content.includes("workflow")) return true;
  if (content.includes("تم توثيق هذا الجزء")) return true;
  if (content.includes("اكتب النص هنا")) return true;
  if (content.includes("{{execution")) return true;
  if (content.includes("{{report.execution")) return true;
  if (content.includes("{{case.execution")) return true;

  return false;
}

function isReportTwoExecutionSummaryBlock(block: StudioBlock) {
  if (
    block.kind !== "section-text" &&
    block.kind !== "multi-paragraph" &&
    block.kind !== "plain-text"
  ) {
    return false;
  }

  const title = cleanText(block.title).toLowerCase();
  const content = cleanText(block.content).toLowerCase();

  if (title.includes("وصف") && title.includes("تنفيذ")) return true;
  if (content.includes("workflow")) return true;
  if (content.includes("تم توثيق هذا الجزء")) return true;

  return false;
}

function shouldAutoApplyReportTwoExecutionSummary(block: StudioBlock) {
  if (!isReportTwoExecutionSummaryBlock(block)) {
    return false;
  }

  const rawBlock = block as any;

  if (rawBlock.autoFilledFromExecutionSummary === true) {
    return true;
  }

  return isReportTwoExecutionSummaryPlaceholderText(block.content);
}

function applyReportTwoPreparedExecutionSummary(
  template: StudioTemplate,
  payload: SmartReportPayload,
): StudioTemplate {
  const showExecutionDescriptionInReport =
    (payload as any)?.narrative?.visible !== false;

  if (!showExecutionDescriptionInReport) {
    return {
      ...template,
      pages: template.pages.map((page) => ({
        ...page,
        blocks: page.blocks.filter(
          (block) => !isReportTwoExecutionSummaryBlock(block),
        ),
      })),
    };
  }

  const summary = getReportTwoPreparedExecutionSummary(payload);

  if (!summary) return template;

  let replaced = false;

  return {
    ...template,
    pages: template.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => {
        if (replaced || !shouldAutoApplyReportTwoExecutionSummary(block)) {
          return block;
        }

        replaced = true;

        return {
          ...block,
          content: summary,
          autoFilledFromExecutionSummary: true,
        };
      }),
    })),
  };
}
function getBlockKindName(kind: StudioBlockKind) {
  if (kind === "hero-title") return "عنوان رئيسي";
  if (kind === "meta-strip") return "شريط بيانات";
  if (kind === "plain-text") return "نص بسيط";
  if (kind === "section-text") return "فقرة";
  if (kind === "multi-paragraph") return "فقرات";
  if (kind === "highlight-note") return "ملاحظة بارزة";
  if (kind === "bullet-list") return "قائمة";
  if (kind === "dynamic-fields") return "حقول الحالة";
  if (kind === "evidence-gallery") return "الشواهد";
  if (kind === "closing-note") return "خاتمة";
  if (kind === "report-one-table") return "جدول";
  if (kind === "signature-grid") return "تواقيع الاعتماد";

  return "بلوك";
}

export function ReportTwoStudioRuntime({
  caseId,
  selectedTemplateId,
  selectedVariantId = "",
  initialMode = "edit",
  payload,
  templates,
}: ReportTwoStudioRuntimeProps) {
  const router = useRouter();
  const [preparedPayload, setPreparedPayload] = useState<SmartReportPayload>(payload);
  const [runtimeMode, setRuntimeMode] = useState<"preview" | "edit">(initialMode);
  const [approvedSnapshot, setApprovedSnapshot] = useState<{
    id: string;
    previewUrl: string;
  } | null>(null);
  const [reportTwoApprovalSubmitting, setReportTwoApprovalSubmitting] =
    useState(false);

  useEffect(() => {
    const preparation =
      loadReportFlowPreparation(caseId, selectedVariantId) ||
      loadReportFlowPreparation(caseId, "official-activity-card") ||
      loadReportFlowPreparation(caseId, "smart-general-a4");

    if (preparation) {
      setPreparedPayload(applyReportFlowPreparationToPayload(payload, preparation));
      return;
    }

    setPreparedPayload(payload);
  }, [caseId, payload, selectedVariantId]);

  const initialTemplateOption =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0] ||
    null;

  const [selectedTemplateOptionId, setSelectedTemplateOptionId] = useState(
    initialTemplateOption?.id || "",
  );

  const serviceSlugForSavedTemplates = cleanText(
    (payload as any)?.service?.slug || (payload as any)?.serviceSlug || "general",
  );

  const reportTwoDraftStorageKey = getReportTwoDraftStorageKey(
    serviceSlugForSavedTemplates,
    caseId,
  );

  const [savedRuntimeTemplates, setSavedRuntimeTemplates] = useState<
    ReportTwoSavedRuntimeTemplate[]
  >([]);

  const [savedRuntimeTemplatesLoaded, setSavedRuntimeTemplatesLoaded] =
    useState(false);

  const [runtimeTemplateName, setRuntimeTemplateName] = useState("");
  const [activeSavedRuntimeTemplateId, setActiveSavedRuntimeTemplateId] =
    useState("");

  const [selectedQuickSavedTemplateId, setSelectedQuickSavedTemplateId] =
    useState("");

  const [template, setTemplate] = useState<StudioTemplate>(() =>
    hydrateTemplate(initialTemplateOption),
  );


  // report-two-sync-prepared-execution-summary
  useEffect(() => {
    setTemplate((current) =>
      applyReportTwoPreparedExecutionSummary(current, preparedPayload),
    );
  }, [preparedPayload]);
  const [protectedPageIds, setProtectedPageIds] = useState<string[]>(() =>
    hydrateTemplate(initialTemplateOption).pages.map((page) => page.id),
  );

  const [activePageId, setActivePageId] = useState(
    template.pages[0]?.id || "",
  );

  const [selectedBlockId, setSelectedBlockId] = useState("");

  const [hiddenRuntimePageIds, setHiddenRuntimePageIds] = useState<string[]>([]);
  const [runtimePageOrder, setRuntimePageOrder] = useState<string[]>([]);
  const [pageSafePlacementNotice, setPageSafePlacementNotice] = useState("");

  const [draftRestored, setDraftRestored] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [undoSnapshots, setUndoSnapshots] = useState<ReportTwoDraftSnapshot[]>([]);
  const lastDraftSerializedRef = useRef("");
  const restoringDraftRef = useRef(false);
  const [editingTableDraft, setEditingTableDraft] =
    useState<ReportTwoTableDraft | null>(null);

  const [finalWizardOpen, setFinalWizardOpen] = useState(false);
  const [finalChecklistConfirmed, setFinalChecklistConfirmed] = useState(false);
  const [finalCheckConfirmedAt, setFinalCheckConfirmedAt] = useState<string | null>(null);
  const [pendingDraftSnapshot, setPendingDraftSnapshot] =
    useState<ReportTwoDraftSnapshot | null>(null);

  const [popup, setPopup] = useState<{
    type: "alert" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);
  const [reportTwoActionModal, setReportTwoActionModal] = useState<{
    title: string;
    message: string;
    linkHref?: string;
    linkLabel?: string;
  } | null>(null);

  function closePopup() { setPopup(null); }
  function closeReportTwoActionModal() { setReportTwoActionModal(null); }

  const reportTwoPreviewExportRef = useRef<HTMLElement | null>(null);
  const reportTwoPdfStackExportRef = useRef<HTMLElement | null>(null);
  const [reportTwoPdfExporting, setReportTwoPdfExporting] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);

  const runtimeContext = useMemo(() => getRuntimeContext(preparedPayload), [preparedPayload]);
  const [headerValues, setHeaderValues] =
    useState<ReportTwoHeaderValues | null>(null);
  const [logoSettings, setLogoSettings] =
    useState<ReportTwoLogoSettings | null>(null);
  const [headerAlignments, setHeaderAlignments] =
    useState<ReportTwoHeaderAlignments | null>(null);

  const activeHeaderValues = useMemo(
    () => headerValues || getDefaultReportTwoHeaderValues(runtimeContext),
    [headerValues, runtimeContext],
  );

  const activeHeaderAlignments = useMemo(
    () => headerAlignments || getDefaultReportTwoHeaderAlignments(),
    [headerAlignments],
  );

  const activeLogoSettings = useMemo(
    () => logoSettings || getDefaultReportTwoLogoSettings(runtimeContext),
    [logoSettings, runtimeContext],
  );

  const editableRuntimeContext = useMemo(
    () => ({
      ...runtimeContext,
      ...activeHeaderValues,
      "report.logoUrl": activeLogoSettings.url,
      "report.logoWidthPx": String(activeLogoSettings.width),
      "report.logoHeightPx": String(activeLogoSettings.height),
      "report.logoFit": activeLogoSettings.fit,
      "report.logoFilter": activeLogoSettings.filter,
      "report.headerAlign.case.createdAt": activeHeaderAlignments["case.createdAt"],
      "report.headerAlign.service.name": activeHeaderAlignments["service.name"],
      "report.headerAlign.identity.ministryName": activeHeaderAlignments["identity.ministryName"],
      "report.headerAlign.identity.educationDepartment": activeHeaderAlignments["identity.educationDepartment"],
      "report.headerAlign.report.platformName": activeHeaderAlignments["report.platformName"],
    }),
    [runtimeContext, activeHeaderValues, activeHeaderAlignments, activeLogoSettings],
  );

  const previewCase = useMemo(() => getPreviewCase(preparedPayload), [preparedPayload]);

  const previewTemplate = useMemo(
    () => buildReportTwoRuntimeTemplate(template, previewCase),
    [template, previewCase],
  );

  const visiblePreviewPages = useMemo(() => {
    const pages = previewTemplate.pages.filter(
      (page) => !hiddenRuntimePageIds.includes(page.id),
    );

    if (!runtimePageOrder.length) {
      return pages;
    }

    const orderMap = new Map(
      runtimePageOrder.map((pageId, index) => [pageId, index]),
    );

    return [...pages].sort((firstPage, secondPage) => {
      const firstIndex = orderMap.has(firstPage.id)
        ? orderMap.get(firstPage.id)!
        : Number.MAX_SAFE_INTEGER;
      const secondIndex = orderMap.has(secondPage.id)
        ? orderMap.get(secondPage.id)!
        : Number.MAX_SAFE_INTEGER;

      if (firstIndex !== secondIndex) {
        return firstIndex - secondIndex;
      }

      return pages.indexOf(firstPage) - pages.indexOf(secondPage);
    });
  }, [previewTemplate.pages, hiddenRuntimePageIds, runtimePageOrder]);

  const visiblePreviewTemplate = useMemo(
    () => ({
      ...previewTemplate,
      pages: visiblePreviewPages,
    }),
    [previewTemplate, visiblePreviewPages],
  );

  const signedVisiblePreviewTemplate = useMemo(
    () => withReportTwoSignatureBlock(visiblePreviewTemplate, preparedPayload),
    [visiblePreviewTemplate, preparedPayload],
  );
  const activePage = useMemo(
    () =>
      signedVisiblePreviewTemplate.pages.find((page) => page.id === activePageId) ||
      signedVisiblePreviewTemplate.pages[0],
    [signedVisiblePreviewTemplate.pages, activePageId],
  );

  const editableActivePage = useMemo(
    () =>
      template.pages.find((page) => page.id === activePageId) ||
      template.pages[0],
    [template.pages, activePageId],
  );

  useEffect(() => {
    const pages = signedVisiblePreviewTemplate.pages;

    if (!pages.length || pages.some((page) => page.id === activePageId)) {
      return;
    }

    const equivalentPageId = resolveReportTwoEquivalentPageId(
      pages,
      activePageId,
    );

    if (equivalentPageId && equivalentPageId !== activePageId) {
      setActivePageId(equivalentPageId);
    }
  }, [activePageId, signedVisiblePreviewTemplate.pages]);

  const selectedBlock = useMemo(() => {
    const runtimeBlock =
      visiblePreviewTemplate.pages
        .flatMap((page) => page.blocks)
        .find((block) => block.id === selectedBlockId) || null;

    const sourceBlockId =
      cleanText((runtimeBlock as any)?.sourceBlockId) || selectedBlockId;

    const sourceBlock =
      template.pages
        .flatMap((page) => page.blocks)
        .find((block) => block.id === sourceBlockId) || null;

    return sourceBlock || runtimeBlock || null;
  }, [selectedBlockId, template.pages, visiblePreviewTemplate.pages]);




  const smartAlerts = useMemo(
    () =>
      getReportTwoSmartAlerts({
        visiblePreviewTemplate,
        previewCase,
        activeHeaderValues,
        activeLogoSettings,
        hiddenRuntimePageIds,
      }),
    [
      visiblePreviewTemplate,
      previewCase,
      activeHeaderValues,
      activeLogoSettings,
      hiddenRuntimePageIds,
    ],
  );

  const smartAlertsSummary = useMemo(
    () => ({
      errors: smartAlerts.filter((alert) => alert.type === "error").length,
      warnings: smartAlerts.filter((alert) => alert.type === "warning").length,
      infos: smartAlerts.filter((alert) => alert.type === "info").length,
      success: smartAlerts.filter((alert) => alert.type === "success").length,
    }),
    [smartAlerts],
  );

  function focusReportTwoSmartAlert(alert: ReportTwoSmartAlert) {
    if (alert.pageId) {
      setActivePageId(alert.pageId);
    }

    if (alert.blockId) {
      setSelectedBlockId(alert.blockId);
    }

    if (alert.action === "focus-preview") {
      setRightSidebarCollapsed(true);
      setLeftSidebarCollapsed(true);
    }

    if (alert.action === "open-block") {
      setLeftSidebarCollapsed(false);
    }

    window.setTimeout(() => {
      document
        .querySelector(".report-two-a4-host")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function fixReportTwoSmartAlert(alert: ReportTwoSmartAlert) {
    if (alert.action === "hide-technical-fields") {
      setTemplate((current) => ({
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          blocks: page.blocks.map((block) => {
            if (!isReportTwoDynamicFieldsBlock(block)) {
              return block;
            }

            const fields = getDynamicFieldsForBlock(block, previewCase).map(
              (field) => ({
                ...field,
                visible:
                  field.visible !== false &&
                  !isReportTwoTechnicalValue(field.label) &&
                  !isReportTwoTechnicalValue(field.value),
              }),
            );

            return {
              ...block,
              dynamicFields: fields,
            };
          }),
        })),
      }));

      return;
    }

    if (alert.action === "restore-header") {
      setHeaderValues(null);
      setHeaderAlignments(null);
      setLogoSettings(null);
      return;
    }

    focusReportTwoSmartAlert(alert);
  }

  const finalCheckItems = useMemo(
    () =>
      getReportTwoFinalCheckItems({
        smartAlerts,
        visiblePreviewTemplate,
        activeHeaderValues,
        activeLogoSettings,
        lastAutoSavedAt,
      }),
    [
      smartAlerts,
      visiblePreviewTemplate,
      activeHeaderValues,
      activeLogoSettings,
      lastAutoSavedAt,
    ],
  );

  const finalCheckPassed = useMemo(
    () => getReportTwoFinalCheckPassed(finalCheckItems),
    [finalCheckItems],
  );

  const finalCheckBlockingItems = useMemo(
    () => finalCheckItems.filter((item) => item.required && !item.passed),
    [finalCheckItems],
  );

  function openReportTwoFinalWizard() {
    saveReportTwoDraftNow(false);
    setFinalWizardOpen(true);
  }

  function confirmReportTwoFinalWizard() {
    if (!finalCheckPassed) {
      setPopup({ type: "alert", title: "الفحص النهائي", message: "لا يمكن تأكيد الجاهزية قبل إصلاح البنود المطلوبة." });
      return;
    }

    if (!finalChecklistConfirmed) {
      setPopup({ type: "alert", title: "الفحص النهائي", message: "ضع علامة التأكيد بعد مراجعة المعاينة." });
      return;
    }

    const now = new Date().toISOString();
    const snapshot: ReportTwoDraftSnapshot = {
      ...createReportTwoDraftSnapshot(),
      savedAt: now,
      finalCheckConfirmedAt: now,
    };
    const serialized = JSON.stringify(snapshot);

    window.localStorage.setItem(reportTwoDraftStorageKey, serialized);
    lastDraftSerializedRef.current = serialized;
    setLastAutoSavedAt(now);
    setFinalCheckConfirmedAt(now);
    setFinalWizardOpen(false);

    setPopup({ type: "alert", title: "جاهزية التقرير", message: "تم تأكيد جاهزية التقرير. يمكنك المتابعة للاعتماد أو التصدير لاحقًا." });
  }

  function fixAllReportTwoSmartAlerts() {
    smartAlerts
      .filter((alert) =>
        ["hide-technical-fields", "restore-header", "focus-preview"].includes(
          alert.action || "",
        ),
      )
      .forEach((alert) => fixReportTwoSmartAlert(alert));
  }
  function sanitizeReportTwoPdfFileNamePart(value: unknown) {
    return cleanText(value)
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/-+/g, "-")
      .trim();
  }

  function getReportTwoSnapshotTitle() {
    const defaultTitle = "تقرير معتمد";

    return (
      sanitizeReportTwoPdfFileNamePart(
        (previewCase as any)?.title ||
          (previewCase as any)?.caseTitle ||
          (preparedPayload as any)?.caseInfo?.title ||
          defaultTitle,
      ) || defaultTitle
    );

    return (
      sanitizeReportTwoPdfFileNamePart(
        (previewCase as any)?.title ||
          (previewCase as any)?.caseTitle ||
          (preparedPayload as any)?.caseInfo?.title ||
          "ØªÙ‚Ø±ÙŠØ± Ù…Ø¹ØªÙ…Ø¯",
      ) || "ØªÙ‚Ø±ÙŠØ± Ù…Ø¹ØªÙ…Ø¯"
    );
  }

  function getReportTwoPdfFileName() {
    const serviceName = sanitizeReportTwoPdfFileNamePart(
      (payload as any)?.service?.name ||
        (payload as any)?.serviceName ||
        previewCase.serviceName ||
        "تقرير",
    );

    const downloadDate = new Date().toISOString().slice(0, 10);

    return `${serviceName || "تقرير"} - ${downloadDate}.pdf`;
  }

  function buildReportTwoStudioUrl(nextMode: "preview" | "edit") {
    const params = new URLSearchParams();

    params.set("mode", nextMode);

    if (selectedVariantId) {
      params.set("variant", selectedVariantId);
    }

    if (selectedTemplateOptionId) {
      params.set("templateId", selectedTemplateOptionId);
    }

    return `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/studio?${params.toString()}`;
  }

  function syncReportTwoStudioUrl(nextMode: "preview" | "edit") {
    if (typeof window === "undefined") return;

    window.history.replaceState(window.history.state, "", buildReportTwoStudioUrl(nextMode));
  }

  function buildReportTwoPrepareUrl() {
    const params = new URLSearchParams();

    if (selectedVariantId) {
      params.set("variant", selectedVariantId);
    }

    const query = params.toString();

    return `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/prepare${
      query ? `?${query}` : ""
    }`;
  }

  function buildReportTwoPdfExportSnapshot() {
    return {
      template: signedVisiblePreviewTemplate,
      context: editableRuntimeContext,
      previewCase,
      designTemplateId: template.designTemplateId || "ministry-form",
    };
  }

  function buildReportTwoSnapshotHtml() {
    const source =
      document.querySelector<HTMLElement>(
        '[data-report-two-snapshot-source="print-stack"]',
      ) ||
      document.querySelector<HTMLElement>(
        '[data-report-two-snapshot-source="preview"]',
      );

    if (!source) return "";

    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("aria-hidden");
    clone.removeAttribute("style");
    clone.className = "report-two-a4-host report-two-snapshot-approved-root";

    return `
      <style>
        .report-two-snapshot-approved-root {
          background: #ffffff;
          direction: rtl;
        }

        .report-two-snapshot-approved-root .pdf-report-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 auto 16px auto !important;
          overflow: hidden !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        @media print {
          .report-two-snapshot-approved-root .pdf-report-page {
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
          }

          .report-two-snapshot-approved-root .pdf-report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      </style>
      ${clone.outerHTML}
    `;
  }

  async function createReportTwoApprovedSnapshotInternal(options?: {
    showSuccessPopup?: boolean;
    allowReuseExisting?: boolean;
  }) {
    const showSuccessPopup = options?.showSuccessPopup !== false;
    const allowReuseExisting = options?.allowReuseExisting !== false;

    if (reportTwoApprovalSubmitting) return null;

    if (approvedSnapshot && allowReuseExisting) {
      return approvedSnapshot;
    }

    if (!signedVisiblePreviewTemplate.pages.length) {
      setReportTwoActionModal({
        title: "اعتماد التقرير",
        message: "لا توجد صفحات جاهزة للاعتماد.",
      });
      return null;
    }

    if (!signedVisiblePreviewTemplate.pages.length) {
      setPopup({
        type: "alert",
        title: "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
        message: "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙØ­Ø§Øª Ø¬Ø§Ù‡Ø²Ø© Ù„Ù„Ø§Ø¹ØªÙ…Ø§Ø¯.",
      });
      return null;
    }

    const snapshotHtml = buildReportTwoSnapshotHtml();

    if (!snapshotHtml.trim()) {
      setReportTwoActionModal({
        title: "اعتماد التقرير",
        message: "تعذر التقاط معاينة التقرير الحالية للاعتماد.",
      });
      return null;
    }

    if (!snapshotHtml.trim()) {
      setPopup({
        type: "alert",
        title: "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
        message: "ØªØ¹Ø°Ø± Ø§Ù„ØªÙ‚Ø§Ø· Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù„Ù„Ø§Ø¹ØªÙ…Ø§Ø¯.",
      });
      return null;
    }

    setReportTwoApprovalSubmitting(true);

    try {
      const activeTemplate = templates.find(
        (item) => item.id === selectedTemplateOptionId,
      );
      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(caseId)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportTitle: getReportTwoSnapshotTitle(),
            templateId: selectedTemplateOptionId || null,
            templateName: activeTemplate?.name || template.name || null,
            variantId: selectedVariantId || null,
            snapshotPayload: preparedPayload,
            snapshotTemplateJson: signedVisiblePreviewTemplate,
            snapshotPagesJson: signedVisiblePreviewTemplate.pages,
            snapshotHtml,
          }),
        },
      );
      const text = await response.text();
      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = {
          error: text || `HTTP ${response.status}`,
        };
      }

      if (!response.ok) {
        throw new Error(
          result?.details ||
            result?.error ||
            `APPROVAL_FAILED_${response.status}`,
        );
      }

      const nextApprovedSnapshot = {
        id: result.snapshot?.id,
        previewUrl:
          result.previewUrl ||
          `/dashboard/report-2/snapshots/${result.snapshot?.id}/preview`,
      };

      setApprovedSnapshot(nextApprovedSnapshot);

      if (showSuccessPopup) {
        setReportTwoActionModal({
          title: "تم اعتماد التقرير",
          message: "تم حفظ نسخة ثابتة من التقرير في أرشيف التقارير المعتمدة.",
          linkHref: nextApprovedSnapshot.previewUrl,
          linkLabel: "استعراض التقرير المعتمد",
        });
        return nextApprovedSnapshot;
      }

      if (showSuccessPopup) {
        setPopup({
          type: "alert",
          title: "ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
          message: "ØªÙ… Ø­ÙØ¸ Ù†Ø³Ø®Ø© Ø«Ø§Ø¨ØªØ© Ù…Ù† Ø§Ù„ØªÙ‚Ø±ÙŠØ± ÙÙŠ Ø£Ø±Ø´ÙŠÙ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©.",
        });
      }

      return nextApprovedSnapshot;
    } catch (error) {
      console.error(error);
      setReportTwoActionModal({
        title: "اعتماد التقرير",
        message: "تعذر اعتماد التقرير. حاول مرة أخرى.",
      });
      return null;
      setPopup({
        type: "alert",
        title: "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
        message: "ØªØ¹Ø°Ø± Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªÙ‚Ø±ÙŠØ±. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.",
      });
      return null;
    } finally {
      setReportTwoApprovalSubmitting(false);
    }
  }

  async function approveReportTwoSnapshot() {
    if (approvedSnapshot) return;

    await createReportTwoApprovedSnapshotInternal({
      showSuccessPopup: true,
      allowReuseExisting: false,
    });
    return;

    if (!signedVisiblePreviewTemplate.pages.length) {
      setPopup({
        type: "alert",
        title: "اعتماد التقرير",
        message: "لا توجد صفحات جاهزة للاعتماد.",
      });
      return;
    }

    const snapshotHtml = buildReportTwoSnapshotHtml();

    if (!snapshotHtml.trim()) {
      setPopup({
        type: "alert",
        title: "اعتماد التقرير",
        message: "تعذر التقاط معاينة التقرير الحالية للاعتماد.",
      });
      return;
    }

    setReportTwoApprovalSubmitting(true);

    try {
      const activeTemplate = templates.find(
        (item) => item.id === selectedTemplateOptionId,
      );
      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(caseId)}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportTitle:
              (previewCase as any)?.title ||
              (previewCase as any)?.caseTitle ||
              (preparedPayload as any)?.caseInfo?.title ||
              "تقرير معتمد",
            templateId: selectedTemplateOptionId || null,
            templateName: activeTemplate?.name || template.name || null,
            variantId: selectedVariantId || null,
            snapshotPayload: preparedPayload,
            snapshotTemplateJson: signedVisiblePreviewTemplate,
            snapshotPagesJson: signedVisiblePreviewTemplate.pages,
            snapshotHtml,
          }),
        },
      );
      const text = await response.text();
      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = {
          error: text || `HTTP ${response.status}`,
        };
      }

      if (!response.ok) {
        throw new Error(
          result?.details ||
            result?.error ||
            `APPROVAL_FAILED_${response.status}`,
        );
      }

      setApprovedSnapshot({
        id: result.snapshot?.id,
        previewUrl:
          result.previewUrl ||
          `/dashboard/report-2/snapshots/${result.snapshot?.id}/preview`,
      });
      setPopup({
        type: "alert",
        title: "تم اعتماد التقرير",
        message: "تم حفظ نسخة ثابتة من التقرير في أرشيف التقارير المعتمدة.",
      });
    } catch (error) {
      console.error(error);
      setPopup({
        type: "alert",
        title: "اعتماد التقرير",
        message: "تعذر اعتماد التقرير. حاول مرة أخرى.",
      });
    } finally {
      setReportTwoApprovalSubmitting(false);
    }
  }

  async function exportReportTwoPdfInternal(options?: {
    fileName?: string;
    snapshot?: ReturnType<typeof buildReportTwoPdfExportSnapshot>;
  }) {
    if (reportTwoPdfExporting) return null;

    if (!visiblePreviewTemplate.pages.length) {
      setReportTwoActionModal({
        title: "تصدير PDF",
        message: "لا توجد صفحات جاهزة للتصدير.",
      });
      return null;
    }

    if (!visiblePreviewTemplate.pages.length) {
      setPopup({
        type: "alert",
        title: "ØªØµØ¯ÙŠØ± PDF",
        message: "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙØ­Ø§Øª Ø¬Ø§Ù‡Ø²Ø© Ù„Ù„ØªØµØ¯ÙŠØ±.",
      });
      return null;
    }

    setReportTwoPdfExporting(true);

    try {
      const fileName = options?.fileName || getReportTwoPdfFileName();

      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(caseId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            snapshot: options?.snapshot || buildReportTwoPdfExportSnapshot(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("PDF_EXPORT_FAILED");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();

        if (json.fallback === "PRINT_PREVIEW" && json.previewUrl) {
          setReportTwoActionModal({
            title: "تصدير PDF",
            message:
              "تم فتح نافذة المعاينة مع خيار الطباعة. استخدم \"طباعة\" أو \"حفظ كملف PDF\" من متصفحك.",
          });

          const fallbackPreviewWindow = window.open(
            json.previewUrl,
            "_blank",
            "noopener,noreferrer",
          );

          if (!fallbackPreviewWindow) {
            window.location.href = json.previewUrl;
          }

          return "preview-fallback" as const;

          setPopup({
            type: "alert",
            title: "ØªØµØ¯ÙŠØ± PDF",
            message:
              "ØªÙ… ÙØªØ­ Ù†Ø§ÙØ°Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…Ø¹ Ø®ÙŠØ§Ø± Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©. Ø§Ø³ØªØ®Ø¯Ù… 'Ø·Ø¨Ø§Ø¹Ø©' Ø£Ùˆ 'Ø­ÙØ¸ ÙƒÙ€ PDF' Ù…Ù† Ù…ØªØµÙØ­Ùƒ.",
          });

          const previewWindow = window.open(
            json.previewUrl,
            "_blank",
            "noopener,noreferrer",
          );

          if (!previewWindow) {
            window.location.href = json.previewUrl;
          }

          return "preview-fallback" as const;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      return "downloaded" as const;
    } catch (error) {
      console.error(error);
      setReportTwoActionModal({
        title: "تصدير PDF",
        message: "تعذر تصدير التقرير. حاول مرة أخرى.",
      });
      return null;
      setPopup({
        type: "alert",
        title: "ØªØµØ¯ÙŠØ± PDF",
        message: "ØªØ¹Ø°Ø± ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ±. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.",
      });
      return null;
    } finally {
      setReportTwoPdfExporting(false);
    }
  }

  async function exportReportTwoPdf() {
    await exportReportTwoPdfInternal();
    return;

    if (!visiblePreviewTemplate.pages.length) {
      setPopup({
        type: "alert",
        title: "تصدير PDF",
        message: "لا توجد صفحات جاهزة للتصدير.",
      });
      return;
    }

    setReportTwoPdfExporting(true);

    try {
      const fileName = getReportTwoPdfFileName();

      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(caseId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            snapshot: buildReportTwoPdfExportSnapshot(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("PDF_EXPORT_FAILED");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();

        if (json.fallback === "PRINT_PREVIEW" && json.previewUrl) {
          setPopup({
            type: "alert",
            title: "تصدير PDF",
            message:
              "تم فتح نافذة المعاينة مع خيار الطباعة. استخدم 'طباعة' أو 'حفظ كـ PDF' من متصفحك.",
          });

          const previewWindow = window.open(
            json.previewUrl,
            "_blank",
            "noopener,noreferrer",
          );

          if (!previewWindow) {
            window.location.href = json.previewUrl;
          }

          return;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setPopup({
        type: "alert",
        title: "تصدير PDF",
        message: "تعذر تصدير التقرير. حاول مرة أخرى.",
      });
    } finally {
      setReportTwoPdfExporting(false);
    }
  }

  async function saveAndDownloadReportTwoSnapshot() {
    if (reportTwoApprovalSubmitting || reportTwoPdfExporting) return;

    const approval = await createReportTwoApprovedSnapshotInternal({
      showSuccessPopup: false,
      allowReuseExisting: true,
    });

    if (!approval) {
      return;
    }

    const exportResult = await exportReportTwoPdfInternal({
      fileName: getReportTwoSnapshotTitle(),
      snapshot: buildReportTwoPdfExportSnapshot(),
    });

    if (exportResult === "downloaded") {
      setReportTwoActionModal({
        title: "تم حفظ التقرير واعتماده",
        message: "تم حفظ التقرير واعتماده، وبدأ تحميل PDF.",
        linkHref: approval.previewUrl,
        linkLabel: "استعراض التقرير المعتمد",
      });
      return;

      setPopup({
        type: "alert",
        title: "Ø­ÙØ¸ ÙˆØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
        message: "ØªÙ… Ø­ÙØ¸ Ù†Ø³Ø®Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ± ÙˆØ¨Ø¯Ø£ ØªÙ†Ø²ÙŠÙ„ Ù…Ù„Ù PDF.",
      });
    }
  }
  function updateReportTwoLogoSettings(
    patch: Partial<ReportTwoLogoSettings>,
  ) {
    setLogoSettings((current) => ({
      ...getDefaultReportTwoLogoSettings(runtimeContext),
      ...(current || {}),
      ...patch,
    }));
  }

  function resetReportTwoLogoSettings() {
    setLogoSettings(null);
  }

  function uploadReportTwoLogo(file: File | null) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");

      if (!result) return;

      updateReportTwoLogoSettings({
        url: result,
        filter: "none",
      });
    };

    reader.readAsDataURL(file);
  }
  function updateReportTwoHeaderValue(
    key: ReportTwoHeaderFieldKey,
    value: string,
  ) {
    setHeaderValues((current) => ({
      ...getDefaultReportTwoHeaderValues(runtimeContext),
      ...(current || {}),
      [key]: value,
    }));
  }

  function fillReportTwoHeaderValueFromContext(
    key: ReportTwoHeaderFieldKey,
    sourceKey: string,
  ) {
    const value = runtimeContext[sourceKey] || "";

    updateReportTwoHeaderValue(key, value);
  }

  function updateReportTwoHeaderAlign(
    key: ReportTwoHeaderFieldKey,
    value: ReportTwoHeaderAlign,
  ) {
    setHeaderAlignments((current) => ({
      ...getDefaultReportTwoHeaderAlignments(),
      ...(current || {}),
      [key]: value,
    }));
  }

  function resetReportTwoHeaderValues() {
    setHeaderValues(null);
    setHeaderAlignments(null);
  }


  function createReportTwoDraftSnapshot(): ReportTwoDraftSnapshot {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      selectedTemplateOptionId,
      activeSavedRuntimeTemplateId,
      runtimeTemplateName,
      template: cloneReportTwoTemplate(template),
      headerValues,
      headerAlignments,
      logoSettings,
      hiddenRuntimePageIds,
      runtimePageOrder,
      activePageId,
      selectedBlockId,
      finalCheckConfirmedAt,
    };
  }

  function restoreReportTwoDraftSnapshot(snapshot: ReportTwoDraftSnapshot) {
    restoringDraftRef.current = true;

    setSelectedTemplateOptionId(snapshot.selectedTemplateOptionId || selectedTemplateOptionId);
    setActiveSavedRuntimeTemplateId(snapshot.activeSavedRuntimeTemplateId || "");
    setRuntimeTemplateName(snapshot.runtimeTemplateName || "");
    setTemplate(cloneReportTwoTemplate(snapshot.template));
    setHeaderValues(snapshot.headerValues || null);
    setHeaderAlignments(snapshot.headerAlignments || null);
    setLogoSettings(snapshot.logoSettings || null);
    setHiddenRuntimePageIds(snapshot.hiddenRuntimePageIds || []);
    setRuntimePageOrder(snapshot.runtimePageOrder || []);
    setActivePageId(
      resolveReportTwoEquivalentPageId(
        snapshot.template.pages,
        snapshot.activePageId || activePageId,
      ),
    );
    setSelectedBlockId(snapshot.selectedBlockId || "");
    setFinalCheckConfirmedAt(snapshot.finalCheckConfirmedAt || null);
    setFinalChecklistConfirmed(Boolean(snapshot.finalCheckConfirmedAt));
  }

  function saveReportTwoDraftNow(showMessage = true) {
    const snapshot = createReportTwoDraftSnapshot();
    const serialized = JSON.stringify(snapshot);

    window.localStorage.setItem(reportTwoDraftStorageKey, serialized);
    lastDraftSerializedRef.current = serialized;
    setLastAutoSavedAt(snapshot.savedAt);

    if (showMessage) {
      setPopup({ type: "alert", title: "حفظ المسودة", message: "تم حفظ المسودة الحالية." });
    }
  }

  function undoReportTwoLastChange() {
    const previous = undoSnapshots[0];

    if (!previous) {
      setPopup({ type: "alert", title: "التراجع", message: "لا يوجد تعديل سابق للرجوع إليه." });
      return;
    }

    restoreReportTwoDraftSnapshot(previous);

    const serialized = JSON.stringify(previous);
    window.localStorage.setItem(reportTwoDraftStorageKey, serialized);
    lastDraftSerializedRef.current = serialized;
    setLastAutoSavedAt(previous.savedAt);
    setUndoSnapshots((current) => current.slice(1));
  }
  function persistSavedRuntimeTemplates(items: ReportTwoSavedRuntimeTemplate[]) {
    setSavedRuntimeTemplates(items);
    writeReportTwoSavedTemplates(serviceSlugForSavedTemplates, items);
  }

  function saveCurrentRuntimeTemplate() {
    const name = runtimeTemplateName.trim();

    if (!name) {
      setPopup({ type: "alert", title: "حفظ القالب", message: "اكتب اسم القالب أولًا." });
      return;
    }

    const now = new Date().toISOString();
    const existingId = activeSavedRuntimeTemplateId || "";
    const id = existingId || makeId("saved-runtime-template");

    const item: ReportTwoSavedRuntimeTemplate = {
      id,
      name,
      serviceSlug: serviceSlugForSavedTemplates,
      sourceTemplateId: selectedTemplateOptionId,
      createdAt:
        savedRuntimeTemplates.find((template) => template.id === id)?.createdAt ||
        now,
      updatedAt: now,
      template: cloneReportTwoTemplate(template),
      headerValues,
      headerAlignments,
      logoSettings,
      hiddenRuntimePageIds,
      runtimePageOrder,
    };

    const nextItems = [
      item,
      ...savedRuntimeTemplates.filter((template) => template.id !== id),
    ];

    persistSavedRuntimeTemplates(nextItems);
    setActiveSavedRuntimeTemplateId(id);
    setRuntimeTemplateName(name);

    setPopup({ type: "alert", title: "حفظ القالب", message: "تم حفظ قالب التقرير الحالي." });
  }

  function applySavedRuntimeTemplate(templateId: string) {
    const saved = savedRuntimeTemplates.find((item) => item.id === templateId);

    if (!saved) return;

    setTemplate(cloneReportTwoTemplate(saved.template));
    setSelectedTemplateOptionId(saved.sourceTemplateId || selectedTemplateOptionId);
    setHeaderValues(saved.headerValues || null);
    setHeaderAlignments(saved.headerAlignments || null);
    setLogoSettings(saved.logoSettings || null);
    setHiddenRuntimePageIds(saved.hiddenRuntimePageIds || []);
    setRuntimePageOrder(saved.runtimePageOrder || []);
    setActiveSavedRuntimeTemplateId(saved.id);
    setSelectedQuickSavedTemplateId(saved.id);
    setRuntimeTemplateName(saved.name);

    setActivePageId(
      resolveReportTwoEquivalentPageId(saved.template.pages, activePageId),
    );
    setSelectedBlockId("");
  }

  function deleteSavedRuntimeTemplate(templateId: string) {
    setPopup({
      type: "confirm",
      title: "حذف القالب المحفوظ",
      message: "هل تريد حذف هذا القالب المحفوظ؟",
      onConfirm: () => {
        const nextItems = savedRuntimeTemplates.filter(
          (item) => item.id !== templateId,
        );

        persistSavedRuntimeTemplates(nextItems);

        if (activeSavedRuntimeTemplateId === templateId) {
          setActiveSavedRuntimeTemplateId("");
          setSelectedQuickSavedTemplateId("");
          setRuntimeTemplateName("");
        }
      },
    });
  }
  function selectTemplate(templateId: string) {
    const nextTemplateOption =
      templates.find((item) => item.id === templateId) || templates[0] || null;

    const nextTemplate = hydrateTemplate(nextTemplateOption);

    setSelectedTemplateOptionId(nextTemplateOption?.id || "");
    setActiveSavedRuntimeTemplateId("");
    setSelectedQuickSavedTemplateId("");
    setRuntimeTemplateName("");
    setTemplate(applyReportTwoPreparedExecutionSummary(nextTemplate, preparedPayload));
    setProtectedPageIds(nextTemplate.pages.map((page) => page.id));
    setHiddenRuntimePageIds([]);
    setRuntimePageOrder([]);
    setActivePageId(
      resolveReportTwoEquivalentPageId(nextTemplate.pages, activePageId),
    );
    setSelectedBlockId("");
  }

  function updateTemplate(patch: Partial<StudioTemplate>) {
    setTemplate((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updatePage(pageId: string, updater: (page: StudioPage) => StudioPage) {
    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId ? updater(page) : page,
      ),
    }));
  }

  function updateBlock(blockId: string, updater: (block: StudioBlock) => StudioBlock) {
    const runtimeBlock =
      visiblePreviewTemplate.pages
        .flatMap((page) => page.blocks)
        .find((block) => block.id === blockId) || null;

    const sourceBlockId =
      cleanText((runtimeBlock as any)?.sourceBlockId) || blockId;

    setTemplate((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.id === sourceBlockId ? updater(block) : block,
        ),
      })),
    }));
  }

  function addPage() {
    const page = createPage(template.pages.length + 1);

    setTemplate((current) => ({
      ...current,
      pages: [...current.pages, page],
    }));

    setActivePageId(page.id);
    setSelectedBlockId("");
  }

  function canDeleteReportTwoPage(pageId: string) {
    const runtimePage =
      visiblePreviewTemplate.pages.find((page) => page.id === pageId) ||
      template.pages.find((page) => page.id === pageId);

    if (!runtimePage) return false;

    if (runtimePage.reportTwoVirtualPage) {
      return true;
    }

    const sourcePageId = getReportTwoSourcePageId(pageId, runtimePage);

    if (!sourcePageId) return false;
    if (protectedPageIds.includes(sourcePageId)) return false;
    if (template.pages.length <= 1) return false;

    return template.pages.some((page) => page.id === sourcePageId);
  }

  function canMoveReportTwoPage(
    pageId: string,
    direction: "previous" | "next",
  ) {
    const pageIds = visiblePreviewTemplate.pages.map((page) => page.id);
    const index = pageIds.indexOf(pageId);

    if (index < 0) return false;

    return direction === "previous"
      ? index > 0
      : index < pageIds.length - 1;
  }

  function moveReportTwoPage(
    pageId: string,
    direction: "previous" | "next",
  ) {
    if (!canMoveReportTwoPage(pageId, direction)) return;

    const pageIds = visiblePreviewTemplate.pages.map((page) => page.id);
    const index = pageIds.indexOf(pageId);
    const targetIndex = direction === "previous" ? index - 1 : index + 1;

    const nextOrder = [...pageIds];
    const [movedPageId] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, movedPageId);

    setRuntimePageOrder(nextOrder);
    setActivePageId(pageId);
  }

  function deleteReportTwoPage(pageId: string) {
    const runtimePage =
      visiblePreviewTemplate.pages.find((page) => page.id === pageId) ||
      template.pages.find((page) => page.id === pageId);

    if (!runtimePage) return;

    if (runtimePage.reportTwoVirtualPage) {
      setPopup({
        type: "confirm",
        title: "إخفاء الصفحة",
        message: "هل تريد إخفاء هذه الصفحة التلقائية من المعاينة؟",
        onConfirm: () => {
          const nextHiddenIds = [...hiddenRuntimePageIds, pageId];
          const nextVisiblePages = visiblePreviewTemplate.pages.filter(
            (p) => !nextHiddenIds.includes(p.id),
          );

          setHiddenRuntimePageIds(nextHiddenIds);
          setRuntimePageOrder((current) => current.filter((id) => id !== pageId));

          if (activePageId === pageId) {
            setActivePageId(nextVisiblePages[0]?.id || "");
            setSelectedBlockId("");
          }
        },
      });

      return;
    }

    const sourcePageId = getReportTwoSourcePageId(pageId, runtimePage);

    if (!canDeleteReportTwoPage(pageId)) {
      setPopup({ type: "alert", title: "حذف الصفحة", message: "لا يمكن حذف صفحة قادمة من قالب الاستديو الأصلي." });
      return;
    }

    setPopup({
      type: "confirm",
      title: "حذف الصفحة",
      message: "هل تريد حذف هذه الصفحة من التقرير؟",
      onConfirm: () => {
        const remainingPages = template.pages.filter(
          (p) => p.id !== sourcePageId,
        );

        setTemplate((current) => ({
          ...current,
          pages: remainingPages,
        }));

        setRuntimePageOrder((current) =>
          current.filter((id) => id !== pageId && id !== sourcePageId),
        );

        setActivePageId(remainingPages[0]?.id || "");
        setSelectedBlockId("");
      },
    });
  }

  function removeActivePage() {
    deleteReportTwoPage(activePageId);
  }

  function addBlock(kind: StudioBlockKind) {
    const signatureTargetPageId =
      kind === "signature-grid" ? getReportTwoSignatureTargetPageId(template.pages) : "";

    const targetPageId =
      signatureTargetPageId ||
      getWritableReportTwoPageId(
        activePageId,
        activePage,
        template,
      );

    const targetPage = template.pages.find((page) => page.id === targetPageId);

    if (!targetPage) return;

    const block = createBlock(kind);
    const nextTemplate = {
      ...template,
      pages: template.pages.map((page) =>
        page.id === targetPage.id
          ? {
              ...page,
              blocks: [...page.blocks, block],
            }
          : page,
      ),
    };
    const nextRuntimeTemplate = buildReportTwoRuntimeTemplate(
      nextTemplate,
      previewCase,
    );
    const runtimePageId = findReportTwoRuntimePageIdForBlock(
      nextRuntimeTemplate,
      block.id,
      targetPage.id,
    );

    setTemplate(applyReportTwoPreparedExecutionSummary(nextTemplate, preparedPayload));

    setActivePageId(runtimePageId);
    setSelectedBlockId(block.id);

    if (runtimePageId !== targetPage.id) {
      setPageSafePlacementNotice(REPORT_TWO_BLOCK_MOVED_NOTICE);
    } else {
      setPageSafePlacementNotice("");
    }
  }

  function removeSelectedBlock() {
    if (!selectedBlock || !activePage) return;

    const writablePageId = getWritableReportTwoPageId(activePageId, activePage, template);
    const sourcePage = template.pages.find((page) => page.id === writablePageId);
    if (!sourcePage) return;

    const blockExists = sourcePage.blocks.some((b) => b.id === selectedBlock.id);
    if (!blockExists) return;

    if (sourcePage.blocks.length <= 1) {
      setPopup({ type: "alert", title: "حذف البلوك", message: "لا يمكن حذف آخر بلوك داخل الصفحة." });
      return;
    }

    const remainingBlocks = sourcePage.blocks.filter(
      (block) => block.id !== selectedBlock.id,
    );

    updatePage(sourcePage.id, (page) => ({
      ...page,
      blocks: remainingBlocks,
    }));

    setSelectedBlockId(remainingBlocks[0]?.id || "");
  }

  function moveBlock(direction: "up" | "down") {
    if (!selectedBlock || !activePage) return;

    const index = activePage.blocks.findIndex(
      (block) => block.id === selectedBlock.id,
    );

    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= activePage.blocks.length) return;

    const nextBlocks = [...activePage.blocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, block);

    updatePage(activePage.id, (page) => ({
      ...page,
      blocks: nextBlocks,
    }));
  }


  function updateDynamicField(
    blockId: string,
    fieldId: string,
    patch: Partial<ReportTwoDynamicField>,
  ) {
    updateBlock(blockId, (block) => ({
      ...block,
      dynamicFields: getDynamicFieldsForBlock(block, previewCase).map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    }));
  }

  function moveDynamicField(
    blockId: string,
    fieldId: string,
    direction: "up" | "down",
  ) {
    updateBlock(blockId, (block) => {
      const fields = getDynamicFieldsForBlock(block, previewCase);
      const index = fields.findIndex((field) => field.id === fieldId);

      if (index < 0) return block;

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= fields.length) return block;

      const nextFields = [...fields];
      const [field] = nextFields.splice(index, 1);
      nextFields.splice(targetIndex, 0, field);

      return {
        ...block,
        dynamicFields: nextFields,
      };
    });
  }

  function resetDynamicFields(blockId: string) {
    updateBlock(blockId, (block) => ({
      ...block,
      dynamicFields: getReportTwoDynamicFieldsFromPreviewCase(previewCase),
    }));
  }

  function openTableEditor(block: StudioBlock) {
    setEditingTableDraft(createReportTwoTableDraft(block));
  }

  function closeTableEditor() {
    setEditingTableDraft(null);
  }

  function updateEditingTableDraft(
    updater: (draft: ReportTwoTableDraft) => ReportTwoTableDraft,
  ) {
    setEditingTableDraft((current) => (current ? updater(current) : current));
  }

  function saveEditingTable() {
    if (!editingTableDraft) return;

    updateBlock(editingTableDraft.blockId, (block) => ({
      ...block,
      title: cleanText(editingTableDraft.title) || "جدول",
      columns: normalizeReportTwoTableColumns(editingTableDraft.columns),
      rows: normalizeReportTwoTableRows(
        editingTableDraft.rows,
        editingTableDraft.columns.length,
      ),
      tableSettings: editingTableDraft.settings,
    }));

    setEditingTableDraft(null);
  }
  function updateTableColumns(value: string) {
    if (!selectedBlock) return;

    const columns = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    updateBlock(selectedBlock.id, (block) => ({
      ...block,
      columns: columns.length ? columns : ["المجال", "الإجراء", "ملاحظات"],
    }));
  }

  function updateTableRows(value: string) {
    if (!selectedBlock) return;

    const rows = value
      .split("\n")
      .map((line) => line.split("|").map((cell) => cell.trim()));

    updateBlock(selectedBlock.id, (block) => ({
      ...block,
      rows: rows.length ? rows : [["", "", ""]],
    }));
  }


  useEffect(() => {
    const items = readAllReportTwoSavedTemplates();
    setSavedRuntimeTemplates(items);
    setSavedRuntimeTemplatesLoaded(true);
  }, [serviceSlugForSavedTemplates]);

  useEffect(() => {
    if (runtimeMode !== "edit") {
      setPendingDraftSnapshot(null);
      return;
    }

    if (draftRestored) return;

    const snapshot = parseReportTwoDraftSnapshot(
      window.localStorage.getItem(reportTwoDraftStorageKey),
    );

    if (snapshot) {
      setPendingDraftSnapshot(snapshot);
      return;
    }

    setDraftRestored(true);
    // استعادة مسودة report-2
  }, [draftRestored, reportTwoDraftStorageKey, runtimeMode]);

  useEffect(() => {
    if (!draftRestored) return;

    const timer = window.setTimeout(() => {
      const snapshot = createReportTwoDraftSnapshot();
      const serialized = JSON.stringify(snapshot);

      if (lastDraftSerializedRef.current !== serialized) {
        const previous = parseReportTwoDraftSnapshot(
          lastDraftSerializedRef.current,
        );

        if (previous && !restoringDraftRef.current) {
          setUndoSnapshots((current) => [previous, ...current].slice(0, 20));
        }

        window.localStorage.setItem(reportTwoDraftStorageKey, serialized);
        lastDraftSerializedRef.current = serialized;
        setLastAutoSavedAt(snapshot.savedAt);
      }

      restoringDraftRef.current = false;
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    draftRestored,
    reportTwoDraftStorageKey,
    selectedTemplateOptionId,
    activeSavedRuntimeTemplateId,
    runtimeTemplateName,
    template,
    headerValues,
    headerAlignments,
    logoSettings,
    hiddenRuntimePageIds,
    runtimePageOrder,
    activePageId,
    selectedBlockId,
    finalCheckConfirmedAt,
  ]);
  const reportTwoLayoutGridClass = [
    "mx-auto grid max-w-[1760px] gap-4 transition-all",
    runtimeMode === "preview"
      ? "xl:grid-cols-[minmax(0,1fr)]"
      : rightSidebarCollapsed && leftSidebarCollapsed
        ? "xl:grid-cols-[minmax(0,1fr)]"
        : rightSidebarCollapsed
          ? "xl:grid-cols-[minmax(0,1fr)_300px]"
          : leftSidebarCollapsed
            ? "xl:grid-cols-[280px_minmax(0,1fr)]"
            : "xl:grid-cols-[280px_minmax(0,1fr)_300px]",
  ].join(" ");

  const reportTwoPreviewModeClass =
    runtimeMode === "preview"
      ? "report-two-preview-focus"
      : rightSidebarCollapsed && leftSidebarCollapsed
      ? "report-two-preview-focus"
      : rightSidebarCollapsed || leftSidebarCollapsed
        ? "report-two-preview-wide"
        : "report-two-preview-normal";

  if (!templates.length) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950" dir="rtl">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-100 bg-white p-7 text-center shadow-sm">
          <p className="text-sm font-black text-amber-600">
            لا توجد قوالب
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            انشر قالبًا من استديو الأدمن أولًا.
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 transition-colors dark:bg-slate-950" dir="rtl">
      {runtimeMode === "preview" ? (
        <div className="report-two-sidebar-toolbar mx-auto mb-3 flex max-w-[1900px] flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-black/30">
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">
              المعاينة الجاهزة
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              راجع التقرير ثم احفظ نسخة ثابتة وحمّل ملف PDF مباشرة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveAndDownloadReportTwoSnapshot()}
              disabled={reportTwoApprovalSubmitting || reportTwoPdfExporting}
              className="rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {reportTwoApprovalSubmitting
                ? "جاري الحفظ..."
                : reportTwoPdfExporting
                  ? "جاري التحميل..."
                  : "حفظ وتحميل"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRuntimeMode("edit");
                syncReportTwoStudioUrl("edit");
              }}
              className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              تعديل قبل الحفظ
            </button>

            <button
              type="button"
              onClick={() => router.push(buildReportTwoPrepareUrl())}
              className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
            >
              العودة لاختيار الحقول
            </button>
          </div>
        </div>
      ) : null}
      {runtimeMode !== "preview" ? (
      <div className="report-two-sidebar-toolbar mx-auto mb-3 flex max-w-[1900px] flex-wrap items-center justify-between gap-2 rounded-[1.5rem] border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-black/30">
        <div className="text-xs font-black text-slate-500 dark:text-slate-400">
          تحكم سريع بمساحة العمل
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRightSidebarCollapsed((current) => !current)}
            className={[
              "rounded-2xl px-4 py-2 text-xs font-black transition",
              rightSidebarCollapsed
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {rightSidebarCollapsed ? "فتح اليمين" : "طي اليمين"}
          </button>

          <button
            type="button"
            onClick={() => setLeftSidebarCollapsed((current) => !current)}
            className={[
              "rounded-2xl px-4 py-2 text-xs font-black transition",
              leftSidebarCollapsed
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {leftSidebarCollapsed ? "فتح اليسار" : "طي اليسار"}
          </button>

          <button
            type="button"
            onClick={() => {
              setRightSidebarCollapsed(true);
              setLeftSidebarCollapsed(true);
            }}
            className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
          >
            تركيز المعاينة
          </button>

          <button
            type="button"
            onClick={() => {
              setRightSidebarCollapsed(false);
              setLeftSidebarCollapsed(false);
            }}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            إظهار الكل
          </button>
        </div>
      </div>
      ) : null}
      
      
      <div className={reportTwoLayoutGridClass}>
        {runtimeMode !== "preview" && !rightSidebarCollapsed ? (
        <aside className="space-y-4">
          <ReportTwoCollapsibleCard id="control" title="تحكم القالب">

            <p className="text-sm font-black text-emerald-700">
              report-2
            </p>

            <h1 className="mt-2 text-xl font-black text-slate-950">
              تحكم القالب
            </h1>

            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
              هذا تحكم Runtime للتقرير فقط، وليس استديو نشر القوالب.
            </p>

            <div className="mt-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-3">
              <h3 className="text-xs font-black text-slate-950">
                حفظ قالب Runtime
              </h3>

              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                احفظ تعديلاتك الحالية لهذه الخدمة لاستخدامها لاحقًا.
              </p>

              <input
                value={runtimeTemplateName}
                onChange={(event) => setRuntimeTemplateName(event.target.value)}
                placeholder="مثال: قالب النشاط النهائي"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-emerald-600"
              />

              <button
                type="button"
                onClick={saveCurrentRuntimeTemplate}
                className="mt-2 w-full rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                {activeSavedRuntimeTemplateId ? "تحديث القالب المحفوظ" : "حفظ القالب الحالي"}
              </button>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-slate-950">
                  قوالبي المحفوظة
                </h3>

                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                  {savedRuntimeTemplates.length}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {savedRuntimeTemplates.length ? (
                  savedRuntimeTemplates.map((item) => {
                    const active = item.id === activeSavedRuntimeTemplateId;

                    return (
                      <article
                        key={item.id}
                        className={[
                          "rounded-2xl border bg-white p-3 transition",
                          active
                            ? "border-emerald-500 ring-2 ring-emerald-100"
                            : "border-slate-100",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => applySavedRuntimeTemplate(item.id)}
                          className="w-full text-right"
                        >
                          <p className="text-xs font-black text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-1 text-[10px] font-bold text-slate-400" dir="ltr">
                            {new Date(item.updatedAt).toLocaleString("ar-SA")}
                          </p>
                        </button>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => applySavedRuntimeTemplate(item.id)}
                            className="flex-1 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700"
                          >
                            تطبيق
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSavedRuntimeTemplate(item.id)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-black text-red-600"
                          >
                            حذف
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-white px-3 py-3 text-center text-[11px] font-bold text-slate-400">
                    لا توجد قوالب محفوظة لهذه الخدمة حتى الآن.
                  </p>
                )}
              </div>
            </div>
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="template" title="القالب">

            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              القالب
            </h2>

            <select
              value={selectedTemplateOptionId}
              onChange={(event) => selectTemplate(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
            >
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="design" title="التصميم">

            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              التصميم
            </h2>

            <div className="mt-3 grid gap-2">
              {reportDesignTemplates.map((design) => {
                const active = template.designTemplateId === design.id;

                return (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() =>
                      updateTemplate({
                        designTemplateId: design.id,
                      })
                    }
                    className={[
                      "rounded-2xl border px-3 py-3 text-right transition",
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <p className="text-xs font-black">{design.name}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500">
                      {design.description}
                    </p>
                  </button>
                );
              })}
            </div>
          
</ReportTwoCollapsibleCard>
        </aside>
        ) : null}

        <section className="space-y-3">

                    
          {pageSafePlacementNotice ? (
            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 shadow-sm">
              <span>{pageSafePlacementNotice}</span>

              <button
                type="button"
                onClick={() => setPageSafePlacementNotice("")}
                className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200"
              >
                إخفاء
              </button>
            </div>
          ) : null}

          {runtimeMode !== "preview" ? (
<section className="report-two-productivity-card grid w-full items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-[128px] flex-col justify-between rounded-[1.5rem] border border-emerald-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                الحفظ التلقائي والتراجع
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                يتم حفظ تعديلاتك تلقائيًا حتى لا تضيع، ويمكنك الرجوع عن آخر تعديل.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
              آخر حفظ: {formatReportTwoSavedAt(lastAutoSavedAt)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={undoReportTwoLastChange}
              className="rounded-2xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white transition hover:bg-slate-800"
            >
              رجوع عن آخر تعديل
              {undoSnapshots.length ? ` (${undoSnapshots.length})` : ""}
            </button>

            <button
              type="button"
              onClick={() => saveReportTwoDraftNow(true)}
              className="rounded-2xl bg-emerald-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-800"
            >
              حفظ الآن
            </button>

            <button
              type="button"
              onClick={openReportTwoFinalWizard}
              className="rounded-2xl bg-indigo-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-indigo-800"
            >
              فحص نهائي قبل الاعتماد
            </button>
            {!approvedSnapshot ? (
              <button
                type="button"
                disabled={reportTwoApprovalSubmitting}
                onClick={approveReportTwoSnapshot}
                className="rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {reportTwoApprovalSubmitting ? "جاري الاعتماد..." : "اعتماد التقرير"}
              </button>
            ) : (
              <>
                <a
                  href={approvedSnapshot.previewUrl}
                  className="rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                >
                  معاينة التقرير
                </a>

                <button
                  type="button"
                  disabled={reportTwoPdfExporting}
                  onClick={exportReportTwoPdf}
                  className="rounded-2xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {reportTwoPdfExporting ? "جاري التحميل..." : "تحميل PDF"}
                </button>
              </>
            )}

            {approvedSnapshot ? (
              <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                تم اعتماد التقرير
              </span>
            ) : null}

            {finalCheckConfirmedAt ? (
              <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
                جاهز منذ {formatReportTwoSavedAt(finalCheckConfirmedAt)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[128px] flex-col justify-between rounded-[1.5rem] border border-emerald-100 bg-white p-3 shadow-sm">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            تطبيق قالب محفوظ
          </h2>

          <p className="mt-1 text-xs font-bold text-slate-500">
            اختر قالبًا محفوظًا لهذه الخدمة وطبقه مباشرة.
          </p>

          <div className="mt-3 flex gap-2">
            <select
              value={selectedQuickSavedTemplateId}
              onChange={(event) =>
                setSelectedQuickSavedTemplateId(event.target.value)
              }
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none focus:border-emerald-600"
            >
              <option value="">
                {!savedRuntimeTemplatesLoaded
                  ? "جاري تحميل القوالب..."
                  : savedRuntimeTemplates.length
                    ? "اختر قالبًا محفوظًا"
                    : "لا توجد قوالب محفوظة"}
              </option>

              {savedRuntimeTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedQuickSavedTemplateId}
              onClick={() => applySavedRuntimeTemplate(selectedQuickSavedTemplateId)}
              className="rounded-2xl bg-emerald-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              تطبيق
            </button>
          </div>
        </div>
      </section>
          ) : null}
<section ref={reportTwoPreviewExportRef} data-report-two-snapshot-source="preview" className={["report-two-a4-host", reportTwoPreviewModeClass, "rounded-[2rem] border border-slate-200 bg-slate-100 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30"].join(" ")}>
            <style>{`
              .report-two-a4-host {
                overflow-x: hidden;
              }

              .report-two-a4-host .report-design-logo-control-style {
                display: flex;
                flex-direction: column;
                align-items: center;
              }

              .report-two-a4-host.report-two-preview-normal .pdf-report-page {
                zoom: 0.72;
              }

              .report-two-a4-host.report-two-preview-wide .pdf-report-page {
                zoom: 0.86;
              }

              .report-two-a4-host.report-two-preview-focus .pdf-report-page {
                zoom: 0.98;
              }

              @media (max-width: 1500px) {
                .report-two-a4-host.report-two-preview-normal .pdf-report-page {
                  zoom: 0.66;
                }

                .report-two-a4-host.report-two-preview-wide .pdf-report-page {
                  zoom: 0.78;
                }

                .report-two-a4-host.report-two-preview-focus .pdf-report-page {
                  zoom: 0.9;
                }
              }

              .report-two-a4-host .pdf-report-page {
                position: relative !important;
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                margin-left: auto !important;
                margin-right: auto !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                border: 1.5px solid #64748b !important;
                outline: 6px solid rgba(15, 23, 42, 0.05) !important;
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16) !important;
                aspect-ratio: 210 / 297 !important;
              }

              .report-two-a4-host .pdf-report-page::before {
                display: none !important;
              }
              .report-two-a4-host .pdf-report-page::after {
                display: none !important;
              }

              @media print {
                @page {
                  size: A4;
                  margin: 0;
                }

                .report-two-a4-host {
                  padding: 0 !important;
                  background: #ffffff !important;
                  border: 0 !important;
                  box-shadow: none !important;
                }

                .report-two-a4-host .pdf-report-page {
                  zoom: 1 !important;
                  margin: 0 !important;
                  border: 0 !important;
                  outline: 0 !important;
                  box-shadow: none !important;
                }

                .report-two-a4-host .pdf-report-page::before,
                .report-two-a4-host .pdf-report-page::after {
                  display: none !important;
                }
              }
            `}</style>

            <ReportDesignRenderer
              suppressAutoEvidencePages
              chromeLayout="split"
              designId={template.designTemplateId || "ministry-form"}
              template={signedVisiblePreviewTemplate}
              activePage={activePage}
              activePageId={activePage?.id || activePageId}
              context={editableRuntimeContext}
              previewCase={previewCase}
              onActivePageChange={(pageId) => {
                if (activePageId === pageId) return;

                setActivePageId(pageId);

                const sourcePageId = getReportTwoSourcePageId(
                  pageId,
                  visiblePreviewTemplate.pages.find((p) => p.id === pageId),
                );
                const selectedExists = selectedBlockId && template.pages
                  .flatMap((p) => p.blocks)
                  .some((b) => b.id === selectedBlockId);
                if (!selectedExists) {
                  setSelectedBlockId("");
                }
              }}
              onAddPage={runtimeMode === "preview" ? () => undefined : addPage}
              onMovePage={
                runtimeMode === "preview" ? () => undefined : moveReportTwoPage
              }
              onDeletePage={
                runtimeMode === "preview" ? () => undefined : deleteReportTwoPage
              }
              canMovePage={
                runtimeMode === "preview" ? () => false : canMoveReportTwoPage
              }
              canDeletePage={
                runtimeMode === "preview" ? () => false : canDeleteReportTwoPage
              }
            />
          </section>

          <section
            ref={reportTwoPdfStackExportRef}
            aria-hidden="true"
            data-report-two-snapshot-source="print-stack"
            className="report-two-a4-host report-two-pdf-stack-export-root"
            style={{
              position: "fixed",
              top: 0,
              left: "-10000px",
              width: "210mm",
              minHeight: "297mm",
              background: "#ffffff",
              pointerEvents: "none",
              zIndex: -1,
            }}
          >
            <ReportDesignRenderer
              suppressAutoEvidencePages
              renderMode="stack"
              chromeLayout="split"
              designId={template.designTemplateId || "ministry-form"}
              template={signedVisiblePreviewTemplate}
              activePage={activePage}
              activePageId={activePage?.id || activePageId}
              context={editableRuntimeContext}
              previewCase={previewCase}
              onActivePageChange={() => undefined}
              onAddPage={() => undefined}
              onMovePage={() => undefined}
              onDeletePage={() => undefined}
              canMovePage={() => false}
              canDeletePage={() => false}
            />
          </section>
        </section>

        {runtimeMode !== "preview" && !leftSidebarCollapsed ? (
        <aside className="space-y-4">
          <ReportTwoCollapsibleCard id="logo" title="شعار التقرير">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  شعار التقرير
                </h2>
                <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  غيّر الشعار، حجمه، وطريقة عرضه داخل الترويسة.
                </p>
              </div>

              <button
                type="button"
                onClick={resetReportTwoLogoSettings}
                className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-200"
              >
                استعادة
              </button>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-center rounded-2xl bg-[#1d343f] p-4">
                <img
                  src={activeLogoSettings.url}
                  alt="معاينة الشعار"
                  className="max-w-full object-contain"
                  style={{
                    width: `${activeLogoSettings.width}px`,
                    height: `${activeLogoSettings.height}px`,
                    objectFit: activeLogoSettings.fit,
                    filter:
                      activeLogoSettings.filter === "invert"
                        ? "brightness(0) invert(1)"
                        : "none",
                  }}
                />
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                  رابط الشعار
                </span>

                <input
                  value={activeLogoSettings.url}
                  onChange={(event) =>
                    updateReportTwoLogoSettings({
                      url: event.target.value,
                    })
                  }
                  placeholder="/uploads/school-logos/MOE.png"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-black outline-none focus:border-emerald-600"
                  dir="ltr"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                  رفع شعار للمعاينة
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadReportTwoLogo(event.target.files?.[0] || null)
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] font-black text-slate-500">
                    العرض
                  </span>

                  <input
                    type="number"
                    min={24}
                    max={240}
                    value={activeLogoSettings.width}
                    onChange={(event) =>
                      updateReportTwoLogoSettings({
                        width: normalizeReportTwoLogoNumber(
                          Number(event.target.value),
                          96,
                          24,
                          240,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black text-slate-500">
                    الارتفاع
                  </span>

                  <input
                    type="number"
                    min={20}
                    max={160}
                    value={activeLogoSettings.height}
                    onChange={(event) =>
                      updateReportTwoLogoSettings({
                        height: normalizeReportTwoLogoNumber(
                          Number(event.target.value),
                          56,
                          20,
                          160,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateReportTwoLogoSettings({
                      fit: "contain",
                    })
                  }
                  className={[
                    "rounded-2xl px-3 py-2 text-[11px] font-black transition",
                    activeLogoSettings.fit === "contain"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  ].join(" ")}
                >
                  احتواء
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateReportTwoLogoSettings({
                      fit: "cover",
                    })
                  }
                  className={[
                    "rounded-2xl px-3 py-2 text-[11px] font-black transition",
                    activeLogoSettings.fit === "cover"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  ].join(" ")}
                >
                  تعبئة
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateReportTwoLogoSettings({
                      filter: "invert",
                    })
                  }
                  className={[
                    "rounded-2xl px-3 py-2 text-[11px] font-black transition",
                    activeLogoSettings.filter === "invert"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  ].join(" ")}
                >
                  أبيض للهيدر
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateReportTwoLogoSettings({
                      filter: "none",
                    })
                  }
                  className={[
                    "rounded-2xl px-3 py-2 text-[11px] font-black transition",
                    activeLogoSettings.filter === "none"
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  ].join(" ")}
                >
                  عادي
                </button>
              </div>
            </div>
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="header" title="ترويسة التقرير">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  ترويسة التقرير
                </h2>
                <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  عدّل قيم أعلى الصفحة أو عبئها ديناميكيًا من بيانات الحالة.
                </p>
              </div>

              <button
                type="button"
                onClick={resetReportTwoHeaderValues}
                className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-200"
              >
                استعادة
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {reportTwoHeaderFields.map((field) => (
                <article
                  key={field.key}
                  className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {field.label}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        {field.hint}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <div className="flex items-center rounded-full border border-slate-200 bg-white p-1">
                        {reportTwoHeaderAlignOptions.map((option) => {
                          const active =
                            activeHeaderAlignments[field.key] === option.value;

                          return (
                            <button
                              key={`${field.key}-${option.value}`}
                              type="button"
                              onClick={() =>
                                updateReportTwoHeaderAlign(field.key, option.value)
                              }
                              title={option.title}
                              className={[
                                "inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black transition",
                                active
                                  ? "bg-emerald-700 text-white"
                                  : "text-slate-500 hover:bg-slate-100",
                                option.value === "left" ? "scale-x-[-1]" : "",
                              ].join(" ")}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      <select
                        value=""
                        onChange={(event) => {
                          if (!event.target.value) return;

                          fillReportTwoHeaderValueFromContext(
                            field.key,
                            event.target.value,
                          );

                          event.currentTarget.value = "";
                        }}
                        className="max-w-[118px] rounded-full border border-emerald-100 bg-white px-3 py-2 text-[10px] font-black text-emerald-700 outline-none"
                      >
                        <option value="">ربط ديناميكي</option>
                        {reportTwoHeaderBindingOptions.map(([key, label]) => (
                          <option key={`${field.key}-${key}`} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={activeHeaderValues[field.key]}
                    onChange={(event) =>
                      updateReportTwoHeaderValue(field.key, event.target.value)
                    }
                    rows={2}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black leading-6 outline-none focus:border-emerald-600"
                  />
                </article>
              ))}
            </div>
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="page-settings" title="إعدادات الصفحة">

            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              إعدادات الصفحة
            </h2>

            {activePage ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    اسم الصفحة
                  </span>

                  <input
                    value={activePage.title}
                    onChange={(event) =>
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    نوع الصفحة
                  </span>

                  <select
                    value={activePage.kind}
                    onChange={(event) =>
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        kind: event.target.value as StudioPageKind,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
                  >
                    <option value="content">محتوى</option>
                    <option value="recommendations">توصيات</option>
                    <option value="evidence">شواهد</option>
                    <option value="approval">اعتماد</option>
                    <option value="custom">مخصص</option>
                  </select>
                </label>
              </div>
            ) : null}
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="add-block" title="إضافة بلوك داخل الصفحة">

            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              إضافة بلوك داخل الصفحة
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["section-text", "فقرة"],
                ["bullet-list", "قائمة"],
                ["dynamic-fields", "حقول"],
                ["evidence-gallery", "شواهد"],
                ["report-one-table", "جدول"],
                ["signature-grid", "تواقيع"],
                ["closing-note", "خاتمة"],
              ].map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addBlock(kind as StudioBlockKind)}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                >
                  + {label}
                </button>
              ))}
            </div>
          
</ReportTwoCollapsibleCard>

          <ReportTwoCollapsibleCard id="page-blocks" title="بلوكات الصفحة">

            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              بلوكات الصفحة
            </h2>

            <div className="mt-3 space-y-2">
              {(activePage?.blocks || []).map((block, index) => {
                const active = block.id === selectedBlockId;

                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedBlockId(block.id)}
                    className={[
                      "w-full rounded-2xl border px-3 py-3 text-right text-xs font-black transition",
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {index + 1}. {block.title} · {getBlockKindName(block.kind)}
                  </button>
                );
              })}
            </div>
          
</ReportTwoCollapsibleCard>

          {selectedBlock && editableActivePage?.blocks.some((b) => b.id === selectedBlock.id) ? (
            <ReportTwoCollapsibleCard id="edit-block" title="تعديل البلوك">

              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  تعديل البلوك
                </h2>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveBlock("up")}
                    className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-black"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveBlock("down")}
                    className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-black"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const writablePageId = getWritableReportTwoPageId(activePageId, activePage, template);
                      const sourcePage = template.pages.find((p) => p.id === writablePageId);
                      if (sourcePage && sourcePage.blocks.length <= 1) {
                        removeSelectedBlock();
                        return;
                      }
                      setPopup({
                        type: "confirm",
                        title: "حذف البلوك",
                        message: "هل أنت متأكد من حذف هذا البلوك؟",
                        onConfirm: removeSelectedBlock,
                      });
                    }}
                    className="rounded-xl bg-red-50 px-2 py-1 text-xs font-black text-red-600"
                  >
                    حذف البلوك
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                    عنوان البلوك
                  </span>

                  <input
                    value={selectedBlock.title}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedBlock.showTitle !== false}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        showTitle: event.target.checked,
                      }))
                    }
                  />
                  إظهار العنوان
                </label>

                {isReportTwoDynamicFieldsBlock(selectedBlock) ? (
                  <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-900">
                          2. الحقول المختارة
                        </h3>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                          اختر أي حقل تريد عرضه، وعدّل الاسم والقيمة مباشرة.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => resetDynamicFields(selectedBlock.id)}
                        className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-emerald-700 shadow-sm"
                      >
                        تعبئة من الحالة
                      </button>
                    </div>

                    <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {getDynamicFieldsForBlock(selectedBlock, previewCase).map((field, index) => (
                        <article
                          key={`${selectedBlock.id}-${field.id}-${index}`}
                          className={[
                            "rounded-2xl border p-3 transition",
                            field.visible
                              ? "border-emerald-200 bg-white"
                              : "border-slate-200 bg-slate-50 opacity-70",
                          ].join(" ")}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-[11px] font-black text-slate-600">
                              <input
                                type="checkbox"
                                checked={field.visible}
                                onChange={(event) =>
                                  updateDynamicField(selectedBlock.id, field.id, {
                                    visible: event.target.checked,
                                  })
                                }
                              />
                              عرض في التقرير
                            </label>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveDynamicField(selectedBlock.id, field.id, "up")}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() => moveDynamicField(selectedBlock.id, field.id, "down")}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600"
                              >
                                ↓
                              </button>
                            </div>
                          </div>

                          <label className="block">
                            <span className="text-[11px] font-black text-slate-500">
                              اسم الحقل
                            </span>

                            <input
                              value={field.label}
                              onChange={(event) =>
                                updateDynamicField(selectedBlock.id, field.id, {
                                  label: event.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-emerald-600"
                            />
                          </label>

                          <label className="mt-2 block">
                            <span className="text-[11px] font-black text-slate-500">
                              القيمة
                            </span>

                            <textarea
                              value={field.value}
                              onChange={(event) =>
                                updateDynamicField(selectedBlock.id, field.id, {
                                  value: event.target.value,
                                })
                              }
                              rows={2}
                              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-6 outline-none focus:border-emerald-600"
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
                {selectedBlock.kind !== "dynamic-fields" &&
                selectedBlock.kind !== "evidence-gallery" &&
                selectedBlock.kind !== "report-one-table" &&
                selectedBlock.kind !== "signature-grid" ? (
                  <label className="block">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                      المحتوى
                    </span>

                    <textarea
                      value={selectedBlock.content}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          content: event.target.value,
                          autoFilledFromExecutionSummary: false,
                        }))
                      }
                      rows={7}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-emerald-600"
                    />
                  </label>
                ) : null}
                {selectedBlock.kind === "signature-grid" ? (() => {
                  const allSignatures = getReportTwoSignatureCardsFromPayload(preparedPayload);
                  const orderedSignatures = getReportTwoOrderedSignatureCards(allSignatures, selectedBlock);
                  const hiddenKeys = getReportTwoSignatureHiddenKeys(selectedBlock);
                  const allKeys = allSignatures.map((signature) => signature.key);

                  return (
                    <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-3">
                      <h3 className="text-xs font-black text-slate-900">
                        ترتيب تواقيع الاعتماد
                      </h3>

                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                        يظهر هذا البلوك في آخر صفحة فوق الفوتر. رتّب التواقيع أو أخفِ أي توقيع لا تحتاجه.
                      </p>

                      <div className="mt-3 space-y-2">
                        {orderedSignatures.map((signature, index) => {
                          const hidden = hiddenKeys.has(signature.key);

                          return (
                            <div
                              key={signature.key}
                              className={[
                                "rounded-2xl border bg-white p-3",
                                hidden ? "border-slate-200 opacity-60" : "border-emerald-100",
                              ].join(" ")}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-black text-slate-950">
                                    {signature.label}
                                  </div>
                                  <div className="mt-1 text-[10px] font-bold text-slate-500">
                                    {signature.signerName || "بدون اسم"} · {signature.signerTitle || "بدون مسمى"}
                                  </div>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() =>
                                      updateBlock(selectedBlock.id, (block) => ({
                                        ...block,
                                        signatureOrder: moveReportTwoSignatureOrder(
                                          (block as any).signatureOrder,
                                          allKeys,
                                          signature.key,
                                          -1,
                                        ),
                                      }))
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 disabled:opacity-40"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={index === orderedSignatures.length - 1}
                                    onClick={() =>
                                      updateBlock(selectedBlock.id, (block) => ({
                                        ...block,
                                        signatureOrder: moveReportTwoSignatureOrder(
                                          (block as any).signatureOrder,
                                          allKeys,
                                          signature.key,
                                          1,
                                        ),
                                      }))
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-600 disabled:opacity-40"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateBlock(selectedBlock.id, (block) => ({
                                        ...block,
                                        hiddenSignatureKeys: toggleReportTwoSignatureHiddenKey(
                                          (block as any).hiddenSignatureKeys,
                                          signature.key,
                                        ),
                                      }))
                                    }
                                    className="rounded-xl bg-slate-950 px-2 py-1 text-[10px] font-black text-white"
                                  >
                                    {hidden ? "إظهار" : "إخفاء"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })() : null}

                {selectedBlock.kind === "report-one-table" ? (
                  <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-900">
                          تحرير الجدول
                        </h3>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                          افتح محرر الجدول لتعديل الأعمدة والخلايا والإعدادات.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openTableEditor(selectedBlock)}
                        className="rounded-full bg-emerald-700 px-4 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-800"
                      >
                        تحرير الجدول
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-base font-black text-slate-950">
                          {normalizeReportTwoTableColumns(selectedBlock.columns).length}
                        </div>
                        <div className="mt-1 text-[10px] font-black text-slate-500">
                          أعمدة
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-base font-black text-slate-950">
                          {normalizeReportTwoTableRows(
                            selectedBlock.rows,
                            normalizeReportTwoTableColumns(selectedBlock.columns).length,
                          ).length}
                        </div>
                        <div className="mt-1 text-[10px] font-black text-slate-500">
                          صفوف
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-base font-black text-slate-950">
                          {countReportTwoFilledCells(
                            normalizeReportTwoTableRows(
                              selectedBlock.rows,
                              normalizeReportTwoTableColumns(selectedBlock.columns).length,
                            ),
                          )}
                        </div>
                        <div className="mt-1 text-[10px] font-black text-slate-500">
                          خلايا
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {selectedBlock.kind === "evidence-gallery" ? (
                  <div className="space-y-3 rounded-[1.5rem] bg-slate-50 p-3">
                    <label className="block">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                        عدد الشواهد
                      </span>

                      <select
                        value={selectedBlock.evidenceLayout || "TWO_PER_PAGE"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            evidenceLayout: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black outline-none focus:border-emerald-600"
                      >
                        <option value="ONE_PER_PAGE">شاهد واحد</option>
                        <option value="TWO_PER_PAGE">شاهدان</option>
                        <option value="GRID_2X2">أربعة 2×2</option>
                        <option value="ATTACHMENT_LIST">قائمة ملفات</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                        طريقة الصورة
                      </span>

                      <select
                        value={selectedBlock.evidenceFit || "contain"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            evidenceFit: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black outline-none focus:border-emerald-600"
                      >
                        <option value="contain">احتواء</option>
                        <option value="cover">قص وتعبئة</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedBlock.evidenceShowCaptions)}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            evidenceShowCaptions: event.target.checked,
                          }))
                        }
                      />
                      إظهار التسميات
                    </label>
                  </div>
                ) : null}
              </div>
            
</ReportTwoCollapsibleCard>
          ) : (
            <ReportTwoCollapsibleCard id="edit-block" title="تعديل البلوك">
              <p className="py-8 text-center text-xs font-black text-slate-400">
                اختر بلوكًا من بلوكات الصفحة لتعديل إعداداته.
              </p>
            </ReportTwoCollapsibleCard>
          )}
        </aside>
        ) : null}
      </div>

      {reportTwoActionModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {reportTwoActionModal.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {reportTwoActionModal.message}
                </p>
                {reportTwoActionModal.linkHref ? (
                  <a
                    href={reportTwoActionModal.linkHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                  >
                    {reportTwoActionModal.linkLabel || "استعراض التقرير المعتمد"}
                  </a>
                ) : null}
              </div>
            </header>

            <footer className="flex flex-wrap items-center justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={closeReportTwoActionModal}
                className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                حسنًا
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {popup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">{popup.title}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">{popup.message}</p>
              </div>
            </header>

            <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              {popup.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      popup.onCancel?.();
                      closePopup();
                    }}
                    className="rounded-2xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    لا
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      popup.onConfirm?.();
                      closePopup();
                    }}
                    className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                  >
                    نعم
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closePopup}
                  className="mr-auto rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                >
                  حسناً
                </button>
              )}
            </footer>
          </section>
        </div>
      ) : null}

      {runtimeMode === "edit" && pendingDraftSnapshot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black text-emerald-700">
                  استعادة المسودة
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  توجد مسودة محفوظة
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  يوجد مسودة محفوظة لهذا التقرير. هل تريد استعادتها؟
                </p>
              </div>
            </header>

            <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setPendingDraftSnapshot(null);
                  setDraftRestored(true);
                }}
                className="rounded-2xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
              >
                لا، بداية جديدة
              </button>

              <button
                type="button"
                onClick={() => {
                  const snapshot = pendingDraftSnapshot;
                  if (!snapshot) return;
                  setPendingDraftSnapshot(null);
                  restoreReportTwoDraftSnapshot(snapshot);
                  lastDraftSerializedRef.current = JSON.stringify(snapshot);
                  setLastAutoSavedAt(snapshot.savedAt);
                  setDraftRestored(true);
                }}
                className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                نعم، استعادة المسودة
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {false ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black text-emerald-700">
                  استعادة المسودة
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  توجد مسودة محفوظة
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  يوجد مسودة محفوظة لهذا التقرير. هل تريد استعادتها؟
                </p>
              </div>
            </header>

            <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setPendingDraftSnapshot(null);
                  setDraftRestored(true);
                }}
                className="rounded-2xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
              >
                لا، بداية جديدة
              </button>

              <button
                type="button"
                onClick={() => {
                  const snapshot = pendingDraftSnapshot;
                  if (!snapshot) return;
                  setPendingDraftSnapshot(null);
                  restoreReportTwoDraftSnapshot(snapshot);
                  lastDraftSerializedRef.current = JSON.stringify(snapshot);
                  setLastAutoSavedAt(snapshot.savedAt);
                  setDraftRestored(true);
                }}
                className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                نعم، استعادة المسودة
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      {finalWizardOpen ? (
        <div
          className="final-wizard-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black text-emerald-700">
                  معالج الاعتماد
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  فحص نهائي قبل الاعتماد
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  راجع البنود التالية قبل حفظ التقرير كنسخة جاهزة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFinalWizardOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-sm font-black text-slate-500 transition hover:bg-slate-100"
              >
                ×
              </button>
            </header>

            <main className="max-h-[calc(90vh-170px)] overflow-y-auto px-6 py-5">
              <div className="grid gap-3 md:grid-cols-2">
                {finalCheckItems.map((item) => (
                  <article
                    key={item.id}
                    className={[
                      "rounded-[1.5rem] border p-4",
                      item.passed
                        ? "border-emerald-100 bg-emerald-50"
                        : item.required
                          ? "border-red-100 bg-red-50"
                          : "border-amber-100 bg-amber-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={[
                            "text-sm font-black",
                            item.passed
                              ? "text-emerald-800"
                              : item.required
                                ? "text-red-700"
                                : "text-amber-800",
                          ].join(" ")}
                        >
                          {item.passed ? "✓ " : item.required ? "× " : "! "}
                          {item.label}
                        </p>

                        <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500">
                        {item.required ? "مطلوب" : "اختياري"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              {finalCheckBlockingItems.length ? (
                <div className="mt-5 rounded-[1.5rem] border border-red-100 bg-red-50 p-4">
                  <h3 className="text-sm font-black text-red-700">
                    عناصر يجب إصلاحها قبل الاعتماد
                  </h3>

                  <ul className="mt-3 space-y-2 text-xs font-bold leading-6 text-red-700">
                    {finalCheckBlockingItems.map((item) => (
                      <li key={item.id}>• {item.label}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                  <h3 className="text-sm font-black text-emerald-800">
                    التقرير جاهز من ناحية البنود المطلوبة
                  </h3>

                  <p className="mt-2 text-xs font-bold leading-6 text-emerald-700">
                    تأكد بصريًا من المعاينة ثم ضع علامة التأكيد.
                  </p>
                </div>
              )}

              <label className="mt-5 flex items-center gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={finalChecklistConfirmed}
                  onChange={(event) =>
                    setFinalChecklistConfirmed(event.target.checked)
                  }
                />
                راجعت المعاينة والشواهد والحقول، والتقرير جاهز للاعتماد.
              </label>
            </main>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <div className="text-xs font-bold text-slate-500">
                {finalCheckPassed
                  ? "كل البنود المطلوبة جاهزة."
                  : "أصلح البنود المطلوبة ثم أعد الفحص."}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fixAllReportTwoSmartAlerts}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                >
                  إصلاح سريع للتنبيهات
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRightSidebarCollapsed(true);
                    setLeftSidebarCollapsed(true);
                  }}
                  className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
                >
                  تركيز المعاينة
                </button>

                <button
                  type="button"
                  disabled={!finalCheckPassed}
                  onClick={confirmReportTwoFinalWizard}
                  className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  تأكيد الجاهزية
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
      {editingTableDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="flex h-[88vh] w-full max-w-[1220px] min-h-0 overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <main className="flex min-w-0 flex-1 flex-col">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    تحرير الجدول
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    عدّل الأعمدة والخلايا بنفس نمط محرر التقارير الرسمي.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeTableEditor}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-sm font-black text-slate-500 transition hover:bg-slate-100"
                >
                  ×
                </button>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_270px]">
                <section className="flex min-h-0 flex-col">
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        محتوى الجدول
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        مساحة الجدول قابلة للتمرير أفقيًا ورأسيًا عند زيادة الأعمدة والصفوف.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeTableEditor}
                        className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200"
                      >
                        إلغاء
                      </button>

                      <button
                        type="button"
                        onClick={saveEditingTable}
                        className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800"
                      >
                        حفظ الجدول
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden p-5">
                    <div className="h-full overflow-auto rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3 [scrollbar-color:#64748b_#e2e8f0] [scrollbar-width:thin]">
                      <div
                        className={[
                          "w-max min-w-[900px] overflow-hidden border border-emerald-100 bg-white shadow-sm",
                          editingTableDraft.settings.rounded
                            ? "rounded-[1.4rem]"
                            : "rounded-md",
                        ].join(" ")}
                      >
                        <div
                          className="grid border-b border-emerald-100"
                          style={{
                            gridTemplateColumns: `54px repeat(${editingTableDraft.columns.length}, minmax(210px, 1fr))`,
                          }}
                        >
                          <div className="bg-emerald-700 px-3 py-3 text-center text-xs font-black text-white">
                            #
                          </div>

                          {editingTableDraft.columns.map((column, columnIndex) => (
                            <div
                              key={`column-${columnIndex}`}
                              className="flex items-center gap-2 border-r border-emerald-100 bg-emerald-700 px-3 py-2"
                            >
                              <input
                                value={column}
                                onChange={(event) =>
                                  updateEditingTableDraft((draft) =>
                                    updateReportTwoTableColumn(
                                      draft,
                                      columnIndex,
                                      event.target.value,
                                    ),
                                  )
                                }
                                className="min-w-0 flex-1 rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-center text-xs font-black text-slate-800 outline-none focus:border-emerald-500"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  updateEditingTableDraft((draft) =>
                                    removeReportTwoTableColumn(draft, columnIndex),
                                  )
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-black text-rose-500 transition hover:bg-rose-100"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>

                        {editingTableDraft.rows.map((row, rowIndex) => (
                          <div
                            key={`row-${rowIndex}`}
                            className="grid border-b border-emerald-100 last:border-b-0"
                            style={{
                              gridTemplateColumns: `54px repeat(${editingTableDraft.columns.length}, minmax(210px, 1fr))`,
                            }}
                          >
                            <div className="flex flex-col items-center justify-center gap-2 bg-emerald-50 px-2 py-3">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                                {rowIndex + 1}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateEditingTableDraft((draft) =>
                                    removeReportTwoTableRow(draft, rowIndex),
                                  )
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-xs font-black text-rose-500 transition hover:bg-rose-100"
                              >
                                ×
                              </button>
                            </div>

                            {editingTableDraft.columns.map((_, columnIndex) => (
                              <div
                                key={`cell-${rowIndex}-${columnIndex}`}
                                className={[
                                  "border-r border-emerald-100 p-3",
                                  editingTableDraft.settings.highlightFirstColumn &&
                                  columnIndex === 0
                                    ? "bg-emerald-50"
                                    : editingTableDraft.settings.stripedRows &&
                                        rowIndex % 2 === 1
                                      ? "bg-slate-50"
                                      : "bg-white",
                                ].join(" ")}
                              >
                                <textarea
                                  value={row[columnIndex] || ""}
                                  onChange={(event) =>
                                    updateEditingTableDraft((draft) =>
                                      updateReportTwoTableCell(
                                        draft,
                                        rowIndex,
                                        columnIndex,
                                        event.target.value,
                                      ),
                                    )
                                  }
                                  rows={3}
                                  placeholder="محتوى الخلية"
                                  className={[
                                    "w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-bold leading-6 text-slate-700 outline-none transition focus:border-emerald-500",
                                    editingTableDraft.settings.compact
                                      ? "min-h-[72px]"
                                      : "min-h-[94px]",
                                  ].join(" ")}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="min-h-0 overflow-y-auto border-r border-slate-100 bg-slate-50 p-5">
                  <div className="space-y-4">
                    <label className="block rounded-2xl border border-slate-100 bg-white p-4">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                        عنوان الجدول
                      </span>

                      <input
                        value={editingTableDraft.title}
                        onChange={(event) =>
                          updateEditingTableDraft((draft) =>
                            updateReportTwoTableTitle(draft, event.target.value),
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black outline-none focus:border-emerald-600"
                      />
                    </label>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h3 className="text-sm font-black text-slate-900">
                        إعدادات التصميم
                      </h3>

                      <div className="mt-3 space-y-2">
                        {([
                          ["highlightHeader", "تظليل أول صف"],
                          ["highlightFirstColumn", "تظليل أول عمود"],
                          ["stripedRows", "ألوان متناوبة"],
                          ["rounded", "زوايا منحنية"],
                          ["repeatHeader", "تكرار رأس الجدول"],
                          ["compact", "جدول مضغوط"],
                        ] as Array<["highlightHeader" | "highlightFirstColumn" | "stripedRows" | "rounded" | "repeatHeader" | "compact", string]>).map(
                          ([key, label]) => (
                            <label
                              key={key}
                              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
                            >
                              <span>{label}</span>

                              <input
                                type="checkbox"
                                checked={editingTableDraft.settings[key]}
                                onChange={(event) =>
                                  updateEditingTableDraft((draft) =>
                                    updateReportTwoTableSetting(
                                      draft,
                                      key,
                                      event.target.checked,
                                    ),
                                  )
                                }
                              />
                            </label>
                          ),
                        )}
                      </div>

                      <div className="mt-4">
                        <h4 className="mb-2 text-xs font-black text-slate-700">
                          لون الجدول
                        </h4>

                        <div className="flex flex-wrap gap-2">
                          {([
                            ["light-gray", "رمادي فاتح"],
                            ["soft-blue", "أزرق هادئ"],
                            ["green", "أخضر"],
                            ["none", "بدون لون"],
                          ] as Array<[string, string]>).map(
                            ([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  updateEditingTableDraft((draft) =>
                                    updateReportTwoTableSetting(
                                      draft,
                                      "colorTheme",
                                      value,
                                    ),
                                  )
                                }
                                className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                                  editingTableDraft.settings.colorTheme ===
                                  value
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {label}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateEditingTableDraft((draft) =>
                            addReportTwoTableRow(draft),
                          )
                        }
                        className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                      >
                        + إضافة صف
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateEditingTableDraft((draft) =>
                            addReportTwoTableColumn(draft),
                          )
                        }
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-50"
                      >
                        + إضافة عمود
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h3 className="text-sm font-black text-slate-900">
                        ملخص الجدول
                      </h3>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-lg font-black text-slate-950">
                            {editingTableDraft.columns.length}
                          </div>
                          <div className="mt-1 text-[10px] font-black text-slate-500">
                            أعمدة
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-lg font-black text-slate-950">
                            {editingTableDraft.rows.length}
                          </div>
                          <div className="mt-1 text-[10px] font-black text-slate-500">
                            صفوف
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-lg font-black text-slate-950">
                            {countReportTwoFilledCells(editingTableDraft.rows)}
                          </div>
                          <div className="mt-1 text-[10px] font-black text-slate-500">
                            خلايا
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </main>
          </section>
        </div>
      ) : null}
    </main>
  );
}
