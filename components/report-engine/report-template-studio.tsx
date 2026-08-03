"use client";

import { filterPrivateReportValues } from "@/lib/report-engine/report-private-fields";
import { filterValidReportEvidenceItems } from "@/lib/report-engine/report-evidence-utils";

import { workflowUploadServices } from "@/lib/constants/services";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_REPORT_HEADER_SETTINGS,
  ReportDesignRenderer,
  normalizeReportHeaderSettings,
  reportDesignTemplates,
  type ReportDesignId,
  type ReportHeaderSettings,
} from "@/components/report-engine/design-renderers/report-design-renderer";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type TemplateScope = "GLOBAL" | "SERVICE" | "WORKFLOW" | "LOCATION";
type PageKind = "content" | "recommendations" | "evidence" | "approval" | "custom";


type BlockKind =
  | "hero-title"
  | "meta-strip"
  | "plain-text"
  | "section-text"
  | "multi-paragraph"
  | "highlight-note"
  | "bullet-list"
  | "dynamic-fields"
  | "evidence-gallery"
  | "closing-note";

type BlockVariant =
  | "hero"
  | "plain"
  | "card"
  | "soft"
  | "highlight"
  | "outline"
  | "quote";
type BlockPlacement =
  | "flow"
  | "top"
  | "middle"
  | "bottom"
  | "top-right"
  | "top-center"
  | "top-left"
  | "middle-right"
  | "middle-center"
  | "middle-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left";

type TextSource = "manual" | "library" | "workflow";

type EvidenceLayout = "ONE_PER_PAGE" | "TWO_PER_PAGE" | "GRID_2X2" | "ATTACHMENT_LIST";
type EvidenceFit = "contain" | "cover";
type EvidenceEmptyBehavior = "hide" | "message";
type EvidenceAspectRatio = "LANDSCAPE_4_3" | "LANDSCAPE_16_9" | "PORTRAIT_3_4" | "SQUARE_1_1";

type StudioTextSnippet = {
  id: string;
  title: string;
  category: "مقدمة" | "هدف" | "إجراء" | "نتيجة" | "توصية" | "خاتمة";
  content: string;
};

type StudioBlock = {
  id: string;
  kind: BlockKind;
  title: string;
  content: string;
  variant: BlockVariant;
  source: TextSource;
  snippetId?: string;
  boundFieldKey?: string;
  hideWhenMissing?: boolean;
  showTitle: boolean;
  showMeta: boolean;
  align: "right" | "center";
  placement: BlockPlacement;
  titleFontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  contentFontSize?: "xs" | "sm" | "base" | "lg" | "xl";
  fieldLabelFontSize?: "xs" | "sm" | "base" | "lg";
  fieldValueFontSize?: "xs" | "sm" | "base" | "lg" | "xl";
  evidenceLayout?: EvidenceLayout;
  evidenceFit?: EvidenceFit;
  evidenceAspectRatio?: EvidenceAspectRatio;
  evidenceShowCaptions?: boolean;
  evidenceAutoCreatePages?: boolean;
  evidenceEmptyBehavior?: EvidenceEmptyBehavior;
  evidenceStartIndex?: number;
};

type StudioPage = {
  id: string;
  kind: PageKind;
  title: string;
  description: string;
  blocks: StudioBlock[];
};

type StudioTemplate = {
  id: string;
  name: string;
  description: string;
  status: TemplateStatus;
  designTemplateId?: ReportDesignId;
  scope: TemplateScope;
  serviceSlug?: string;
  workflowSlug?: string;
  locationKey?: string;
  previewCaseId: string;
  documentType: "REPORT";
  updatedAt: string;
  designConfig: {
    header: ReportHeaderSettings;
  };
  pages: StudioPage[];
};

type WorkflowFieldOption = {
  key: string;
  label: string;
  type?: string;
  source?: string;
  stepTitle?: string;
  isRequired?: boolean;
  required?: boolean;
};

type PreviewCaseValue = {
  fieldKey?: string | null;
  fieldLabel?: string | null;
  value?: string | null;
};

type PreviewCaseData = {
  found?: boolean;
  caseId?: string;
  serviceSlug?: string;
  serviceName?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    name?: string;
    nationalId?: string;
    grade?: string;
    classroom?: string;
    stage?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
  values?: PreviewCaseValue[];
  evidences?: Array<{
    id?: string;
    title?: string;
    fileUrl?: string;
    imageUrl?: string;
    caption?: string;
  }>;
};

const SERVICE_OPTIONS = workflowUploadServices.map((service) => ({
  slug: service.slug,
  name: service.title,
}));

const statusLabels: Record<TemplateStatus, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const scopeLabels: Record<TemplateScope, string> = {
  GLOBAL: "عام لكل المنصة",
  SERVICE: "موجه لخدمة",
  WORKFLOW: "موجه لـ Workflow",
  LOCATION: "موجه لمكان محدد",
};

const pageKindLabels: Record<PageKind, string> = {
  content: "محتوى",
  recommendations: "توصيات",
  evidence: "شواهد",
  approval: "اعتماد",
  custom: "مخصصة",
};

const textSnippets: StudioTextSnippet[] = [
  {
    id: "intro-official",
    title: "مقدمة رسمية مختصرة",
    category: "مقدمة",
    content:
      "بناءً على ما تم رصده في {{service.name}}، تم إعداد هذا التقارير لتوثيق الإجراء المتخذ وبيان أبرز النتائج والتوصيات.",
  },
  {
    id: "meeting-summary",
    title: "صياغة اجتماع",
    category: "إجراء",
    content:
      "تم عقد اجتماع {{field.meetingName}} بتاريخ {{field.meetingDate}}، وذلك لمناقشة {{field.discussionTopic}} واتخاذ ما يلزم من توصيات.",
  },
  {
    id: "student-followup",
    title: "صياغة متابعة طالب",
    category: "إجراء",
    content:
      "تمت متابعة حالة الطالب/الطالبة {{student.name}} في الصف {{student.grade}}، وجرى توثيق الإجراء وفق البيانات المسجلة في الحالة.",
  },
  {
    id: "result-positive",
    title: "نتيجة إيجابية",
    category: "نتيجة",
    content:
      "أسهمت الجهود المنفذة في تعزيز الوعي وتحسين مستوى التفاعل الإيجابي داخل البيئة التعليمية.",
  },
  {
    id: "recommendation-general",
    title: "توصية عامة",
    category: "توصية",
    content:
      "يوصى بمتابعة الحالة خلال الفترة القادمة، وتوثيق أي مستجدات، والتنسيق مع الأطراف ذات العلاقة عند الحاجة.",
  },
  {
    id: "closing-official",
    title: "خاتمة رسمية",
    category: "خاتمة",
    content:
      "جرى إعداد هذا التقارير من خلال منصة التوجيه الطلابي، وفق البيانات المدخلة والمعتمدة في الحالة.",
  },
];

const blockLibrary: Array<{
  kind: BlockKind;
  title: string;
  description: string;
  defaultContent: string;
  defaultVariant: BlockVariant;
  defaultAlign?: "right" | "center";
}> = [
  {
    kind: "hero-title",
    title: "عنوان رئيسي في المنتصف",
    description: "عنوان كبير للتقرير أو النموذج، مع تاريخ ومعد التقارير اختياريًا.",
    defaultContent: "{{case.title}}",
    defaultVariant: "hero",
    defaultAlign: "center",
  },
  {
    kind: "meta-strip",
    title: "بيانات مختصرة تحت العنوان",
    description: "تاريخ، معد التقارير، الخدمة، رقم الحالة.",
    defaultContent:
      "التاريخ: {{case.createdAt}}\nالمعد: {{identity.counselorName}}\nالخدمة: {{service.name}}\nرقم الحالة: {{case.id}}",
    defaultVariant: "soft",
  },
  {
    kind: "plain-text",
    title: "فقرة بدون عنوان",
    description: "نص عادي داخل التقارير بدون عنوان ظاهر.",
    defaultContent:
      "اكتب هنا نصًا رسميًا، أو اختر نصًا من مكتبة النصوص. يمكنك استخدام متغيرات مثل {{case.title}} و {{student.name}}.",
    defaultVariant: "plain",
  },
  {
    kind: "section-text",
    title: "بلوك نص مع عنوان",
    description: "عنوان صغير وتحته فقرة رسمية.",
    defaultContent:
      "تم توثيق هذا الجزء بناءً على البيانات المدخلة في الحالة، ويمكن ربط النص بمتغيرات ديناميكية من Workflow.",
    defaultVariant: "card",
  },
  {
    kind: "multi-paragraph",
    title: "نص فقرات متعددة",
    description: "مناسب للوصف التفصيلي أو دراسة الحالة أو محاور الاجتماع.",
    defaultContent:
      "الفقرة الأولى: يتم هنا عرض وصف مختصر للسياق العام.\n\nالفقرة الثانية: يتم هنا توضيح الإجراء أو المعالجة أو التوصيات.",
    defaultVariant: "outline",
  },
  {
    kind: "highlight-note",
    title: "بلوك مميز للنتيجة",
    description: "مربع بصري هادئ لإظهار نتيجة أو ملاحظة مهمة.",
    defaultContent:
      "أسهمت الجهود المنفذة في تعزيز الوعي وتحسين مستوى التفاعل الإيجابي داخل البيئة التعليمية.",
    defaultVariant: "highlight",
  },
  {
    kind: "bullet-list",
    title: "قائمة نقاط",
    description: "مناسب للأهداف أو الإجراءات أو التوصيات.",
    defaultContent:
      "تعزيز الوعي لدى الفئة المستهدفة\nتوثيق الإجراءات المتخذة\nمتابعة النتائج خلال الفترة القادمة",
    defaultVariant: "card",
  },
  {
    kind: "dynamic-fields",
    title: "حقول ديناميكية من الحالة",
    description: "يعرض أهم قيم Case ID وWorkflow بشكل مرتب.",
    defaultContent:
      "هذا البلوك يعرض بيانات الحالة والطالب والحقول المتاحة عند اختبار Case ID.",
    defaultVariant: "soft",
  },
  {
    kind: "evidence-gallery",
    title: "الشواهد والمرفقات",
    description: "يعرض الشواهد المرتبطة بالحالة. إذا زادت الشواهد عن سعة الصفحة يتم إنشاء صفحات إضافية.",
    defaultContent:
      "يعرض هذا البلوك الشواهد المرتبطة بـ Case ID. لا تظهر الشواهد إلا إذا أضفت هذا البلوك.",
    defaultVariant: "card",
  },
  {
    kind: "closing-note",
    title: "خاتمة واعتماد",
    description: "خاتمة رسمية ومساحة اعتماد خفيفة.",
    defaultContent:
      "تم إعداد التقارير واعتماده وفق البيانات المتاحة في منصة التوجيه الطلابي.",
    defaultVariant: "quote",
  },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(kind: BlockKind): StudioBlock {
  const item = blockLibrary.find((block) => block.kind === kind) || blockLibrary[2];

  return {
    id: makeId(kind),
    kind: item.kind,
    title: item.title,
    content: item.defaultContent,
    variant: item.defaultVariant,
    source: "manual",
    boundFieldKey: undefined,
    hideWhenMissing: false,
    showTitle: item.kind !== "plain-text" && item.kind !== "hero-title",
    showMeta: item.kind === "hero-title" || item.kind === "meta-strip",
    align: item.defaultAlign || "right",
    placement: item.kind === "hero-title" ? "middle-center" : "flow",
    titleFontSize: "base",
    contentFontSize: "base",
    fieldLabelFontSize: "sm",
    fieldValueFontSize: "base",
    evidenceLayout: item.kind === "evidence-gallery" ? "TWO_PER_PAGE" : undefined,
    evidenceFit: item.kind === "evidence-gallery" ? "contain" : undefined,
    evidenceAspectRatio: item.kind === "evidence-gallery" ? "LANDSCAPE_4_3" : undefined,
    evidenceShowCaptions: item.kind === "evidence-gallery" ? true : undefined,
    evidenceAutoCreatePages: item.kind === "evidence-gallery" ? true : undefined,
    evidenceEmptyBehavior: item.kind === "evidence-gallery" ? "message" : undefined,
  };
}

function createPage(kind: PageKind, index: number): StudioPage {
  const presets: Record<PageKind, Omit<StudioPage, "id" | "blocks"> & { blockKinds: BlockKind[] }> = {
    content: {
      kind: "content",
      title: index === 1 ? "صفحة العنوان والمحتوى" : `صفحة محتوى ${index}`,
      description: "صفحة A4 رسمية تحتوي بلوكات نصية ذكية.",
      blockKinds: index === 1 ? ["hero-title", "meta-strip", "section-text"] : ["section-text"],
    },
    recommendations: {
      kind: "recommendations",
      title: "التوصيات والنتائج",
      description: "صفحة مخصصة لعرض النتائج والتوصيات.",
      blockKinds: ["highlight-note", "bullet-list"],
    },
    evidence: {
      kind: "evidence",
      title: "الشواهد والمرفقات",
      description: "صفحة مستقلة لعرض الشواهد وتقسيمها تلقائيًا على صفحات A4 عند كثرتها.",
      blockKinds: ["evidence-gallery"],
    },
    approval: {
      kind: "approval",
      title: "الاعتماد والتوقيع",
      description: "صفحة ختامية للاعتماد.",
      blockKinds: ["closing-note"],
    },
    custom: {
      kind: "custom",
      title: `صفحة مخصصة ${index}`,
      description: "صفحة مخصصة يمكن بناؤها بالبلوكات.",
      blockKinds: ["plain-text"],
    },
  };

  const preset = presets[kind];

  return {
    id: makeId(`page-${kind}`),
    kind: preset.kind,
    title: preset.title,
    description: preset.description,
    blocks: preset.blockKinds.map(createBlock),
  };
}

function createInitialTemplate(): StudioTemplate {
  return {
    id: "official-smart-template",
    name: "القالب الرسمي الذكي",
    description:
      "قالب رسمي متعدد الصفحات بهوية ثابتة، يتم بناء محتواه من بلوكات نصية ذكية ومتغيرات ديناميكية.",
    status: "DRAFT",
    designTemplateId: "ministry-form",
    scope: "GLOBAL",
    previewCaseId: "",
    documentType: "REPORT",
    updatedAt: "غير محفوظ",
    designConfig: {
      header: { ...DEFAULT_REPORT_HEADER_SETTINGS },
    },
    pages: [createPage("content", 1)],
  };
}

function buildRuntimeContext(template: StudioTemplate, previewCase: PreviewCaseData | null) {
  const values: Record<string, string> = {};

  for (const item of previewCase?.values || []) {
    if (item.fieldKey) {
      values[`field.${item.fieldKey}`] = item.value || "";
    }
  }

  return {
    "identity.ministryName": "وزارة التعليم",
    "identity.educationDepartment": "الإدارة العامة للتعليم",
    "identity.educationOffice": "مكتب التعليم",
    "identity.schoolName": "اسم المدرسة",
    "identity.counselorName": "اسم الموجه/الموجهة",
    "identity.principalName": "اسم مدير/مديرة المدرسة",

    "template.name": template.name,
    "template.description": template.description,

    "case.id": previewCase?.caseId || "CASE-ID",
    "case.title": previewCase?.title || "عنوان التقارير",
    "case.status": previewCase?.status || "مسودة",
    "case.createdAt": formatDate(previewCase?.createdAt) || "1447/01/01 هـ",
    "case.updatedAt": formatDate(previewCase?.updatedAt) || "1447/01/01 هـ",

    "service.name": previewCase?.serviceName || getServiceName(template.serviceSlug) || "الخدمة الإرشادية",
    "service.slug": previewCase?.serviceSlug || template.serviceSlug || "general",

    "student.name": previewCase?.student?.name || "اسم الطالب/الطالبة",
    "student.grade": previewCase?.student?.grade || "الصف",
    "student.classroom": previewCase?.student?.classroom || "الفصل",
    "student.stage": previewCase?.student?.stage || "المرحلة",
    "student.guardianName": previewCase?.student?.guardianName || "اسم ولي الأمر",
    "student.guardianPhone": previewCase?.student?.guardianPhone || "رقم ولي الأمر",

    "evidence.count": String(
      filterValidReportEvidenceItems(previewCase?.evidences || [], {
        allowSampleEvidence: !previewCase?.caseId,
      }).length,
    ),

    ...values,
  };
}



function getServiceName(slug?: string) {
  return SERVICE_OPTIONS.find((service) => service.slug === slug)?.name || "";
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderText(text: string, context: Record<string, string>) {
  return text.replace(/{{\s*([^}]+)\s*}}/g, (_, key: string) => {
    const cleanKey = key.trim();
    return context[cleanKey] || `{{${cleanKey}}}`;
  });
}

function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractUsedWorkflowFieldKeys(template: StudioTemplate) {
  const keys = new Set<string>();
  const regex = /{{\s*field\.([^}\s]+)\s*}}/g;

  for (const page of template.pages) {
    for (const block of page.blocks) {
      const content = `${block.title}\n${block.content}`;
      let match = regex.exec(content);

      while (match) {
        keys.add(match[1]);
        match = regex.exec(content);
      }
    }
  }

  return keys;
}

function groupWorkflowFields(fields: WorkflowFieldOption[]) {
  const groups = new Map<string, WorkflowFieldOption[]>();

  for (const field of fields) {
    const groupName = field.stepTitle || "حقول عامة";
    const current = groups.get(groupName) || [];
    current.push(field);
    groups.set(groupName, current);
  }

  return Array.from(groups.entries()).map(([stepTitle, items]) => ({
    stepTitle,
    fields: items,
  }));
}

function parseSavedTemplateJson(item: any) {
  const raw = item?.templateJson ?? item?.content ?? null;

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw;
  }

  return null;
}

function hydrateStudioTemplateFromSavedItem(item: any): StudioTemplate {
  const templateJson = parseSavedTemplateJson(item) || {};
  const smartStudio = templateJson?.smartStudio || {};
  const fallback = createInitialTemplate();

  const pages =
    Array.isArray(smartStudio?.pages) && smartStudio.pages.length
      ? smartStudio.pages
      : Array.isArray(templateJson?.pages) && templateJson.pages.length
        ? templateJson.pages.map((page: any, pageIndex: number) => ({
            id: page.id || makeId("page-loaded"),
            kind:
              page.kind === "approval"
                ? "approval"
                : page.kind === "evidence"
                  ? "evidence"
                  : pageIndex === 0
                    ? "content"
                    : "custom",
            title: page.title || `صفحة ${pageIndex + 1}`,
            description: page.description || "صفحة مستوردة من قالب محفوظ.",
            blocks: Array.isArray(page.blocks)
              ? page.blocks.map((block: any) => ({
                  id: block.id || makeId("block-loaded"),
                  kind:
                    block.settings?.smartBlockKind ||
                    block.source?.fieldKey ||
                    "section-text",
                  title: block.title || block.customTitle || "بلوك",
                  content:
                    block.customContent ||
                    block.content ||
                    block.source?.description ||
                    "",
                  variant: block.settings?.style || "card",
                  source:
                    block.source?.source === "library" ||
                    block.source?.source === "workflow"
                      ? block.source.source
                      : "manual",
                  snippetId: block.settings?.snippetId || undefined,
                  boundFieldKey: block.settings?.boundFieldKey || undefined,
                  hideWhenMissing: Boolean(block.settings?.hideWhenMissing),
                  showTitle: block.settings?.showTitle !== false,
                  showMeta: Boolean(block.settings?.showMeta),
                  align: block.settings?.align || "right",
                  placement: block.settings?.placement || "flow",
                  titleFontSize: block.settings?.titleFontSize || block.titleFontSize || "base",
                  contentFontSize: block.settings?.contentFontSize || block.contentFontSize || "base",
                  fieldLabelFontSize: block.settings?.fieldLabelFontSize || block.fieldLabelFontSize || "sm",
                  fieldValueFontSize: block.settings?.fieldValueFontSize || block.fieldValueFontSize || "base",
                  evidenceLayout: block.settings?.evidenceLayout || undefined,
                  evidenceFit: block.settings?.evidenceFit || undefined,
                  evidenceAspectRatio: block.settings?.evidenceAspectRatio || "LANDSCAPE_4_3",
                  evidenceShowCaptions: block.settings?.evidenceShowCaptions !== false,
                  evidenceAutoCreatePages: block.settings?.evidenceAutoCreatePages !== false,
                  evidenceEmptyBehavior: block.settings?.evidenceEmptyBehavior || "message",
                }))
              : [createBlock("section-text")],
          }))
        : fallback.pages;

  return {
    ...fallback,
    id: templateJson.id || item?.id || fallback.id,
    designTemplateId:
      templateJson.designTemplateId ||
      smartStudio.designTemplateId ||
      "ministry-form",
    name: item?.name || templateJson.name || fallback.name,
    description:
      item?.description || templateJson.description || fallback.description,
    status:
      templateJson.status === "PUBLISHED" ||
      templateJson.status === "ARCHIVED" ||
      templateJson.status === "DRAFT"
        ? templateJson.status
        : item?.isActive === false
          ? "ARCHIVED"
          : "DRAFT",
    scope:
      templateJson.scope ||
      templateJson?.workflowBinding?.scope ||
      (item?.serviceSlug ? "SERVICE" : "GLOBAL"),
    serviceSlug:
      item?.serviceSlug ||
      templateJson.serviceSlug ||
      templateJson?.workflowBinding?.serviceSlug ||
      undefined,
    workflowSlug:
      templateJson.workflowSlug ||
      templateJson?.workflowBinding?.workflowSlug ||
      undefined,
    locationKey:
      templateJson.locationKey ||
      templateJson?.workflowBinding?.locationKey ||
      undefined,
    previewCaseId: templateJson.previewCaseId || "",
    updatedAt:
      item?.updatedAt ||
      templateJson.updatedAt ||
      new Date().toISOString().slice(0, 10),
    designConfig: {
      header: normalizeReportHeaderSettings(
        templateJson?.designConfig?.header ??
          smartStudio?.designConfig?.header ??
          DEFAULT_REPORT_HEADER_SETTINGS,
      ),
    },
    pages,
  } as StudioTemplate;
}

export function ReportTemplateStudio() {
  const [template, setTemplate] = useState<StudioTemplate>(() => createInitialTemplate());
  const [activePageId, setActivePageId] = useState(() => template.pages[0]?.id || "");
  const [selectedBlockId, setSelectedBlockId] = useState(() => template.pages[0]?.blocks[0]?.id || "");
  const [savedTemplateId, setSavedTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingCase, setTestingCase] = useState(false);
  const [previewCase, setPreviewCase] = useState<PreviewCaseData | null>(null);
  const [workflowFields, setWorkflowFields] = useState<WorkflowFieldOption[]>([]);
  const [workflowMessage, setWorkflowMessage] = useState("اختر خدمة أو Workflow لعرض الحقول المتاحة.");
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const activePage = useMemo(
    () => template.pages.find((page) => page.id === activePageId) || template.pages[0],
    [template.pages, activePageId],
  );

  const selectedBlock = useMemo(
    () =>
      activePage?.blocks.find((block) => block.id === selectedBlockId) ||
      template.pages.flatMap((page) => page.blocks).find((block) => block.id === selectedBlockId) ||
      null,
    [activePage?.blocks, selectedBlockId, template.pages],
  );

  const runtimeContext = useMemo(
    () => buildRuntimeContext(template, previewCase),
    [template, previewCase],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadTemplateFromQuery() {
      const params = new URLSearchParams(window.location.search);
      const templateId = params.get("templateId");

      if (!templateId) return;

      try {
        const cached = sessionStorage.getItem("template-studio-selected");

        if (cached) {
          const cachedItem = JSON.parse(cached);

          if (String(cachedItem?.id || "") === templateId) {
            const hydrated = hydrateStudioTemplateFromSavedItem(cachedItem);

            if (!isMounted) return;

            setTemplate(hydrated);
            setSavedTemplateId(templateId);
            setActivePageId(hydrated.pages[0]?.id || "");
            setSelectedBlockId(hydrated.pages[0]?.blocks[0]?.id || "");
            sessionStorage.removeItem("template-studio-selected");

            setFeedback({
              type: "success",
              message: "تم فتح القالب المحفوظ داخل الاستديو.",
            });

            return;
          }
        }

        const response = await fetch(
          `/api/dashboard/report-templates/${encodeURIComponent(templateId)}`,
          { cache: "no-store" },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || result?.message || "تعذر تحميل القالب.");
        }

        const item = result?.template || result?.data || result;
        const hydrated = hydrateStudioTemplateFromSavedItem(item);

        if (!isMounted) return;

        setTemplate(hydrated);
        setSavedTemplateId(templateId);
        setActivePageId(hydrated.pages[0]?.id || "");
        setSelectedBlockId(hydrated.pages[0]?.blocks[0]?.id || "");
        setFeedback({
          type: "success",
          message: "تم تحميل القالب المحفوظ داخل الاستديو.",
        });
      } catch (error) {
        if (!isMounted) return;

        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "تعذر فتح القالب من المكتبة.",
        });
      }
    }

    loadTemplateFromQuery();

    return () => {
      isMounted = false;
    };
  }, []);

  const usedWorkflowFieldKeys = useMemo(
    () => extractUsedWorkflowFieldKeys(template),
    [template],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadWorkflowFields() {
      if (template.scope === "GLOBAL" || template.scope === "LOCATION") {
        setWorkflowFields([]);
        setWorkflowMessage("هذا القالب غير مربوط بخدمة أو Workflow حاليًا.");
        return;
      }

      if (!template.serviceSlug) {
        setWorkflowFields([]);
        setWorkflowMessage("اختر الخدمة أولًا حتى تظهر حقول الـ Workflow المرتبطة بها.");
        return;
      }

      try {
        setLoadingWorkflow(true);

        const response = await fetch(
          `/api/admin/report-templates/workflow-fields?serviceSlug=${encodeURIComponent(
            template.serviceSlug,
          )}`,
          { cache: "no-store" },
        );

        const result = await response.json();

        if (!isMounted) return;

        setWorkflowFields(Array.isArray(result?.fields) ? result.fields : []);
        setWorkflowMessage(
          result?.message ||
            "تم جلب الحقول المتاحة. اختر المتغيرات المناسبة وأدرجها في البلوكات.",
        );
      } catch {
        if (!isMounted) return;

        setWorkflowFields([]);
        setWorkflowMessage("تعذر جلب حقول الـ Workflow. يمكن الاستمرار بالنصوص اليدوية مؤقتًا.");
      } finally {
        if (isMounted) {
          setLoadingWorkflow(false);
        }
      }
    }

    loadWorkflowFields();

    return () => {
      isMounted = false;
    };
  }, [template.scope, template.serviceSlug, template.workflowSlug]);

  function updateTemplate(next: Partial<StudioTemplate>) {
    setTemplate((current) => ({
      ...current,
      ...next,
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  function updatePage(pageId: string, updater: (page: StudioPage) => StudioPage) {
    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      pages: current.pages.map((page) => (page.id === pageId ? updater(page) : page)),
    }));
  }

  function updateBlock(blockId: string, updater: (block: StudioBlock) => StudioBlock) {
    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      pages: current.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) =>
          block.id === blockId ? updater(block) : block,
        ),
      })),
    }));
  }

  function addPage(kind: PageKind) {
    const page = createPage(kind, template.pages.length + 1);

    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      pages: [...current.pages, page],
    }));

    setActivePageId(page.id);
    setSelectedBlockId(page.blocks[0]?.id || "");
  }

  function removeActivePage() {
    if (!activePage || template.pages.length <= 1) {
      return;
    }

    const remainingPages = template.pages.filter((page) => page.id !== activePage.id);

    setTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString().slice(0, 10),
      pages: remainingPages,
    }));

    setActivePageId(remainingPages[0]?.id || "");
    setSelectedBlockId(remainingPages[0]?.blocks[0]?.id || "");
  }

  function addBlock(kind: BlockKind) {
    if (!activePage) return;

    const block = createBlock(kind);

    updatePage(activePage.id, (page) => ({
      ...page,
      blocks: [...page.blocks, block],
    }));

    setSelectedBlockId(block.id);
  }

  function removeSelectedBlock() {
    if (!selectedBlock || !activePage || activePage.blocks.length <= 1) {
      return;
    }

    const remaining = activePage.blocks.filter((block) => block.id !== selectedBlock.id);

    updatePage(activePage.id, (page) => ({
      ...page,
      blocks: remaining,
    }));

    setSelectedBlockId(remaining[0]?.id || "");
  }

  function moveBlock(direction: "up" | "down") {
    if (!selectedBlock || !activePage) return;

    const index = activePage.blocks.findIndex((block) => block.id === selectedBlock.id);
    if (index === -1) return;

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

  function applySnippet(snippetId: string) {
    if (!selectedBlock) return;

    const snippet = textSnippets.find((item) => item.id === snippetId);
    if (!snippet) return;

    updateBlock(selectedBlock.id, (block) => ({
      ...block,
      source: "library",
      snippetId,
      title: block.title || snippet.title,
      content: snippet.content,
    }));
  }

  function insertVariable(variable: string) {
    if (!selectedBlock) {
      setFeedback({
        type: "info",
        message: "اختر بلوكًا أولًا حتى يتم إدراج المتغير داخله.",
      });
      return;
    }

    updateBlock(selectedBlock.id, (block) => ({
      ...block,
      content: `${block.content}${block.content.trim() ? " " : ""}${variable}`,
    }));
  }

  async function runCaseTest() {
    const caseId = template.previewCaseId.trim();

    if (!caseId) {
      setPreviewCase(null);
      setFeedback({
        type: "info",
        message: "لم يتم إدخال Case ID. سيتم عرض بيانات تجريبية داخل المعاينة.",
      });
      return;
    }

    try {
      setTestingCase(true);

      const response = await fetch(
        `/api/admin/report-templates/preview-case?caseId=${encodeURIComponent(
          caseId,
        )}`,
        { cache: "no-store" },
      );

      const result = await response.json();

      setPreviewCase(result?.data || null);
      setFeedback({
        type: result?.data ? "success" : "info",
        message:
          result?.message ||
          "تم تنفيذ الاختبار. إذا لم توجد حالة فعلية ستبقى المعاينة على بيانات تجريبية.",
      });
    } catch {
      setPreviewCase(null);
      setFeedback({
        type: "error",
        message: "تعذر اختبار Case ID. راجع الرقم أو جرّب لاحقًا.",
      });
    } finally {
      setTestingCase(false);
    }
  }

  function toReportTemplateJson(status: TemplateStatus) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      scope: template.scope,
      serviceSlug: template.serviceSlug || undefined,
      workflowSlug: template.workflowSlug || undefined,
      locationKey: template.locationKey || undefined,
      status,
      documentType: template.documentType,
      designTemplateId: template.designTemplateId || "ministry-form",
      designPreset: "official-smart-multi-page",
      designConfig: template.designConfig,
      previewCaseId: template.previewCaseId,
      updatedAt: new Date().toISOString().slice(0, 10),
      officialLayout: {
        pageSize: "A4",
        ministryLogoOnly: true,
        headerLocked: true,
        identityLocked: true,
        multiPage: true,
      },
      workflowBinding: {
        scope: template.scope,
        serviceSlug: template.serviceSlug || null,
        workflowSlug: template.workflowSlug || null,
        locationKey: template.locationKey || null,
        fields: workflowFields,
        usedFieldKeys: Array.from(usedWorkflowFieldKeys),
      },
      pages: template.pages.map((page) => ({
        id: page.id,
        kind: page.kind === "approval" ? "approval" : page.kind === "evidence" ? "evidence" : "narrative",
        title: page.title,
        description: page.description,
        blocks: page.blocks.map((block) => ({
          id: block.id,
          kind: "custom-paragraph",
          title: block.title,
          customTitle: block.showTitle ? block.title : "",
          customContent: block.content,
          required: false,
          source: {
            source: block.source,
            label: block.source === "library" ? "مكتبة النصوص" : "كتابة مباشرة",
            description: "بلوك من الاستديو الرسمي الذكي متعدد الصفحات",
            fieldKey: block.kind,
          },
          settings: {
            smartBlockKind: block.kind,
            style: block.variant,
            showTitle: block.showTitle,
            showMeta: block.showMeta,
            align: block.align,
            placement: block.placement || "flow",
            titleFontSize: block.titleFontSize || "base",
            contentFontSize: block.contentFontSize || "base",
            fieldLabelFontSize: block.fieldLabelFontSize || "sm",
            fieldValueFontSize: block.fieldValueFontSize || "base",
            evidenceLayout: block.evidenceLayout || null,
            evidenceFit: block.evidenceFit || null,
            evidenceAspectRatio: block.evidenceAspectRatio || "LANDSCAPE_4_3",
            evidenceShowCaptions: block.evidenceShowCaptions !== false,
            evidenceAutoCreatePages: block.evidenceAutoCreatePages !== false,
            evidenceEmptyBehavior: block.evidenceEmptyBehavior || "message",
            snippetId: block.snippetId || null,
          },
        })),
      })),
      smartStudio: {
        version: 2,
        mode: "multi-page-workflow-aware",
        designTemplateId: template.designTemplateId || "ministry-form",
        designConfig: template.designConfig,
        pages: template.pages,
      },
    };
  }

  async function saveTemplate(nextStatus: TemplateStatus = template.status) {
    try {
      setSaving(true);

      const templateJson = toReportTemplateJson(nextStatus);

      const payload = {
        name: template.name || "القالب الرسمي الذكي",
        description: template.description || "قالب رسمي ذكي متعدد الصفحات.",
        serviceSlug:
          template.scope === "SERVICE" || template.scope === "WORKFLOW"
            ? template.serviceSlug || null
            : null,
        type: "SCHOOL",
        content: JSON.stringify(templateJson),
        templateJson,
        genderAware: true,
        isActive: nextStatus !== "ARCHIVED",
      };

      const response = savedTemplateId
        ? await fetch(`/api/dashboard/report-templates/${savedTemplateId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/dashboard/report-templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "تعذر حفظ القالب.");
      }

      const nextSavedId =
        result?.template?.id || result?.data?.id || result?.id || savedTemplateId;

      if (nextSavedId) {
        setSavedTemplateId(nextSavedId);
      }

      setTemplate((current) => ({
        ...current,
        status: nextStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
      }));

      setFeedback({
        type: "success",
        message:
          nextStatus === "PUBLISHED"
            ? "تم حفظ القالب ونشره بنجاح."
            : "تم حفظ مسودة القالب بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء حفظ القالب.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f6]" dir="rtl">
      <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1640px] flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              استديو القوالب الرسمي
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              قالب رسمي ذكي متعدد الصفحات
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
              الهوية ثابتة، والصفحات والبلوكات هي منطقة التحكم. عند ربط القالب
              بخدمة أو Workflow ستظهر خريطة الحقول المتاحة حتى تعرف ماذا تستخدم
              داخل التقارير.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {statusLabels[template.status]}
            </span>

            <a
              href="/dashboard/admin/report-templates/designs"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
            >
              معرض التصاميم
            </a>

            <a
              href="/dashboard/admin/report-templates/library"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              مكتبة القوالب
            </a>

            <button
              type="button"
              onClick={() => saveTemplate("DRAFT")}
              disabled={saving}
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
            >
              حفظ مسودة
            </button>

            <button
              type="button"
              onClick={() => saveTemplate("PUBLISHED")}
              disabled={saving}
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
            >
              حفظ ونشر
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1640px] gap-5 px-6 py-6 xl:grid-cols-[315px_minmax(0,1fr)_390px]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  صفحات القالب
                </h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  تنقل بين الصفحات بالاسم بدل السكرول الطويل.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {template.pages.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {template.pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedBlockId(page.blocks[0]?.id || "");
                  }}
                  className={[
                    "w-full rounded-2xl border p-3 text-right transition",
                    page.id === activePageId
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-black text-slate-400">
                    صفحة {index + 1} · {pageKindLabels[page.kind]}
                  </span>
                  <strong className="mt-1 block text-xs font-black text-slate-900">
                    {page.title}
                  </strong>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <select
                onChange={(event) => {
                  const value = event.target.value as PageKind;
                  if (value) {
                    addPage(value);
                    event.target.value = "";
                  }
                }}
                className="w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-900 outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  + إضافة صفحة
                </option>
                <option value="content">صفحة محتوى</option>
                <option value="recommendations">صفحة توصيات ونتائج</option>
                <option value="evidence">صفحة شواهد</option>
                <option value="approval">صفحة اعتماد</option>
                <option value="custom">صفحة مخصصة</option>
              </select>

              <button
                type="button"
                onClick={removeActivePage}
                disabled={template.pages.length <= 1}
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                حذف الصفحة الحالية
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              مكتبة البلوكات
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              تتم إضافة البلوك داخل الصفحة المحددة فقط.
            </p>

            <div className="mt-4 space-y-2">
              {blockLibrary.map((block) => (
                <button
                  key={block.kind}
                  type="button"
                  onClick={() => addBlock(block.kind)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <strong className="text-xs font-black text-slate-900">
                    {block.title}
                  </strong>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {block.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              بلوكات الصفحة الحالية
            </h2>

            <div className="mt-4 space-y-2">
              {activePage?.blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={[
                    "w-full rounded-2xl border p-3 text-right transition",
                    block.id === selectedBlockId
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-black text-slate-400">
                    بلوك {index + 1}
                  </span>
                  <strong className="mt-1 block text-xs font-black text-slate-900">
                    {block.title}
                  </strong>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => moveBlock("up")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                أعلى
              </button>

              <button
                type="button"
                onClick={() => moveBlock("down")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                أسفل
              </button>
            </div>

            <button
              type="button"
              onClick={removeSelectedBlock}
              disabled={!activePage || activePage.blocks.length <= 1}
              className="mt-2 w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف البلوك المحدد
            </button>
          </section>
        </aside>

        <section className="space-y-5">
          <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900">إعدادات القالب والربط</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  اضغط لعرض أو إخفاء اسم القالب، التوجيه، الخدمة، Workflow، و Case ID.
                </p>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                فتح / إخفاء
              </span>
            </summary>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  اسم القالب
                </span>
                <input
                  value={template.name}
                  onChange={(event) => updateTemplate({ name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  التوجيه
                </span>
                <select
                  value={template.scope}
                  onChange={(event) =>
                    updateTemplate({
                      scope: event.target.value as TemplateScope,
                      serviceSlug:
                        event.target.value === "GLOBAL" ||
                        event.target.value === "LOCATION"
                          ? undefined
                          : template.serviceSlug,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                >
                  <option value="GLOBAL">عام</option>
                  <option value="SERVICE">خدمة</option>
                  <option value="WORKFLOW">Workflow</option>
                  <option value="LOCATION">مكان محدد</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  Case ID للاختبار
                </span>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={template.previewCaseId}
                    onChange={(event) =>
                      updateTemplate({ previewCaseId: event.target.value })
                    }
                    placeholder="اختياري"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />

                  <button
                    type="button"
                    onClick={runCaseTest}
                    disabled={testingCase}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    اختبار
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  وصف القالب
                </span>
                <input
                  value={template.description}
                  onChange={(event) =>
                    updateTemplate({ description: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-600"
                />
              </label>

              {template.scope === "SERVICE" || template.scope === "WORKFLOW" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    الخدمة
                  </span>
                  <select
                    value={template.serviceSlug || ""}
                    onChange={(event) =>
                      updateTemplate({ serviceSlug: event.target.value || undefined })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="">اختر الخدمة</option>
                    {SERVICE_OPTIONS.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {template.scope === "WORKFLOW" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    Workflow
                  </span>
                  <input
                    value={template.workflowSlug || ""}
                    onChange={(event) =>
                      updateTemplate({ workflowSlug: event.target.value })
                    }
                    placeholder="guardian-summons"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              ) : null}

              {template.scope === "LOCATION" ? (
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    مكان الاستخدام
                  </span>
                  <input
                    value={template.locationKey || ""}
                    onChange={(event) =>
                      updateTemplate({ locationKey: event.target.value })
                    }
                    placeholder="reports.issue"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              ) : null}
            </div>

            


            {feedback ? (
              <div
                className={[
                  "mt-4 rounded-2xl px-4 py-3 text-sm font-bold leading-7",
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : feedback.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-50 text-slate-600",
                ].join(" ")}
              >
                {feedback.message}
              </div>
            ) : null}
          </details>

          <WorkflowAwarenessPanel
            template={template}
            fields={workflowFields}
            loading={loadingWorkflow}
            message={workflowMessage}
            usedFieldKeys={usedWorkflowFieldKeys}
            onInsertVariable={insertVariable}
          />

          


          <details
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            dir="rtl"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  معرض التصاميم الحقيقية
                </p>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  التصميم المحدد:{" "}
                  {reportDesignTemplates.find(
                    (design) =>
                      design.id ===
                      (template.designTemplateId || "ministry-form"),
                  )?.name || "نموذج الوزارة الرسمي"}
                </p>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                فتح / إخفاء
              </span>
            </summary>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs font-bold leading-6 text-slate-500">
                هذه ليست ألوان فقط؛ كل تصميم يرسم الصفحة بطريقة مختلفة. اختر
                التصميم وستتغير بنية المعاينة مباشرة.
              </p>

              <select
                value={template.designTemplateId || "ministry-form"}
                onChange={(event) =>
                  updateTemplate({
                    designTemplateId: event.target.value as ReportDesignId,
                  })
                }
                className="min-w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
              >
                {reportDesignTemplates.map((design) => (
                  <option key={design.id} value={design.id}>
                    {design.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {reportDesignTemplates.map((design) => {
                const active = (template.designTemplateId || "ministry-form") === design.id;

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
                      "rounded-2xl border p-3 text-right transition",
                      active
                        ? design.activeCardClass
                        : design.cardClass,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-black text-slate-900">
                        {design.name}
                      </strong>

                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600">
                        {design.badge}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">
                      {design.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </details>

          <HeaderSettingsPanel
            settings={template.designConfig.header}
            onChange={(header) =>
              updateTemplate({
                designConfig: {
                  ...template.designConfig,
                  header: normalizeReportHeaderSettings(header),
                },
              })
            }
          />

          <OfficialPagePreview
            template={template}
            activePage={activePage}
            activePageId={activePageId}
            context={runtimeContext}
            previewCase={previewCase}
            onActivePageChange={(pageId) => {
              const page = template.pages.find((item) => item.id === pageId);
              setActivePageId(pageId);
              setSelectedBlockId(page?.blocks[0]?.id || "");
            }}
            onAddPage={() => addPage("content")}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              إعدادات الصفحة
            </h2>

            {activePage ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    نوع الصفحة
                  </span>
                  <select
                    value={activePage.kind}
                    onChange={(event) =>
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        kind: event.target.value as PageKind,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="content">محتوى</option>
                    <option value="recommendations">توصيات</option>
                    <option value="evidence">شواهد</option>
                    <option value="approval">اعتماد</option>
                    <option value="custom">مخصصة</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    وصف الصفحة
                  </span>
                  <textarea
                    value={activePage.description}
                    onChange={(event) =>
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              إعدادات البلوك
            </h2>

            {selectedBlock ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-500">
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBlock.showTitle}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          showTitle: event.target.checked,
                        }))
                      }
                    />
                    إظهار العنوان
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBlock.showMeta}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          showMeta: event.target.checked,
                        }))
                      }
                    />
                    إظهار معلومات
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    مصدر النص
                  </span>
                  <select
                    value={selectedBlock.source}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        source: event.target.value as TextSource,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="manual">كتابة مباشرة</option>
                    <option value="library">مكتبة النصوص</option>
                    <option value="workflow">حقل من Workflow</option>
                  </select>
                </label>

                {selectedBlock.source === "library" ? (
                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      اختر نصًا من المكتبة
                    </span>
                    <select
                      value={selectedBlock.snippetId || ""}
                      onChange={(event) => applySnippet(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="">اختر النص</option>
                      {textSnippets.map((snippet) => (
                        <option key={snippet.id} value={snippet.id}>
                          {snippet.category} - {snippet.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {workflowFields.length ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-900">
                      ربط البلوك بحقل Workflow
                    </p>

                    <p className="mt-1 text-[11px] font-bold leading-6 text-emerald-800">
                      استخدم هذا الربط إذا كان ظهور البلوك يعتمد على قيمة معينة
                      من الحالة. مثل: نتيجة التواصل، مؤشر الأداء، سبب الإشعار.
                    </p>

                    <label className="mt-3 block">
                      <span className="text-xs font-black text-slate-500">
                        الحقل المسؤول عن هذا البلوك
                      </span>

                      <select
                        value={selectedBlock.boundFieldKey || ""}
                        onChange={(event) => {
                          const fieldKey = event.target.value;

                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            boundFieldKey: fieldKey || undefined,
                            content:
                              block.source === "workflow" && fieldKey
                                ? `{{field.${fieldKey}}}`
                                : block.content,
                          }));
                        }}
                        className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="">بدون ربط مباشر</option>
                        {workflowFields.map((field, fieldIndex) => (
                          <option key={`${field.stepTitle || "field"}-${field.key}-${fieldIndex}`} value={field.key}>
                            {field.stepTitle ? `${field.stepTitle} - ` : ""}
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedBlock.hideWhenMissing)}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            hideWhenMissing: event.target.checked,
                          }))
                        }
                      />
                      لا تعرض هذا البلوك إذا لم توجد قيمة في الحقل المرتبط
                    </label>
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    نص البلوك
                  </span>
                  <textarea
                    value={selectedBlock.content}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        content: event.target.value,
                      }))
                    }
                    rows={8}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-600"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      التصميم
                    </span>
                    <select
                      value={selectedBlock.variant}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          variant: event.target.value as BlockVariant,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="hero">عنوان كبير</option>
                      <option value="plain">نص عادي</option>
                      <option value="card">بطاقة</option>
                      <option value="soft">هادئ</option>
                      <option value="highlight">مميز</option>
                      <option value="outline">إطار فقط</option>
                      <option value="quote">خاتمة</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black text-slate-500">
                      المحاذاة
                    </span>
                    <select
                      value={selectedBlock.align}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({
                          ...block,
                          align: event.target.value as "right" | "center",
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="right">يمين</option>
                      <option value="center">وسط</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="text-xs font-black text-slate-900">
                    إعدادات حجم الخط
                  </h3>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-black text-slate-500">
                        عنوان البلوك
                      </span>
                      <select
                        value={selectedBlock.titleFontSize || "base"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            titleFontSize: event.target.value as any,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="xs">صغير جدًا</option>
                        <option value="sm">صغير</option>
                        <option value="base">عادي</option>
                        <option value="lg">كبير</option>
                        <option value="xl">كبير جدًا</option>
                        <option value="2xl">عنوان كبير</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black text-slate-500">
                        المحتوى
                      </span>
                      <select
                        value={selectedBlock.contentFontSize || "base"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            contentFontSize: event.target.value as any,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="xs">صغير جدًا</option>
                        <option value="sm">صغير</option>
                        <option value="base">عادي</option>
                        <option value="lg">كبير</option>
                        <option value="xl">كبير جدًا</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black text-slate-500">
                        عنوان الحقل
                      </span>
                      <select
                        value={selectedBlock.fieldLabelFontSize || "sm"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            fieldLabelFontSize: event.target.value as any,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="xs">صغير جدًا</option>
                        <option value="sm">صغير</option>
                        <option value="base">عادي</option>
                        <option value="lg">كبير</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black text-slate-500">
                        قيمة الحقل
                      </span>
                      <select
                        value={selectedBlock.fieldValueFontSize || "base"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            fieldValueFontSize: event.target.value as any,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="xs">صغير جدًا</option>
                        <option value="sm">صغير</option>
                        <option value="base">عادي</option>
                        <option value="lg">كبير</option>
                        <option value="xl">كبير جدًا</option>
                      </select>
                    </label>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">
                    موضع البلوك داخل الصفحة
                  </span>

                  <select
                    value={selectedBlock.placement || "flow"}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, (block) => ({
                        ...block,
                        placement: event.target.value as BlockPlacement,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="flow">حسب الترتيب الطبيعي</option>

                    <option value="top">أعلى الصفحة</option>
                    <option value="middle">وسط الصفحة</option>
                    <option value="bottom">أسفل الصفحة</option>

                    <option value="top-right">أعلى يمين</option>
                    <option value="top-center">أعلى وسط</option>
                    <option value="top-left">أعلى يسار</option>

                    <option value="middle-right">وسط يمين</option>
                    <option value="middle-center">وسط الصفحة - محدد</option>
                    <option value="middle-left">وسط يسار</option>

                    <option value="bottom-right">أسفل يمين</option>
                    <option value="bottom-center">أسفل وسط</option>
                    <option value="bottom-left">أسفل يسار</option>
                  </select>

                  <p className="mt-2 text-[11px] font-bold leading-6 text-slate-500">
                    استخدم الموضع الثابت للعنوان أو الفقرة المهمة. يمكنك اختيار موضع عام مثل أعلى/وسط/أسفل، أو موضع دقيق مثل أعلى يمين أو أسفل وسط. إذا وضعت أكثر من بلوك في نفس المكان قد تتداخل.
                  </p>
                </label>

                {selectedBlock.kind === "evidence-gallery" ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-black text-emerald-900">
                      إعدادات عرض الشواهد
                    </p>

                    <p className="mt-1 text-[11px] font-bold leading-6 text-emerald-800">
                      القالب هو الذي يقرر كيف تظهر الشواهد. إذا زاد عدد الشواهد
                      عن سعة الصفحة، يتم إنشاء صفحات شواهد إضافية تلقائيًا.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          طريقة العرض
                        </span>

                        <select
                          value={selectedBlock.evidenceLayout || "TWO_PER_PAGE"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceLayout: event.target.value as EvidenceLayout,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="ONE_PER_PAGE">شاهد واحد في الصفحة</option>
                          <option value="TWO_PER_PAGE">شاهدان في الصفحة</option>
                          <option value="GRID_2X2">4 شواهد في الصفحة</option>
                          <option value="ATTACHMENT_LIST">قائمة مرفقات فقط</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          عرض الصورة
                        </span>

                        <select
                          value={selectedBlock.evidenceFit || "contain"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceFit: event.target.value as EvidenceFit,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="contain">احتواء كامل</option>
                          <option value="cover">تعبئة الإطار</option>
                        </select>
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <span className="text-xs font-black text-slate-500">
                        أبعاد الصورة المتوقعة
                      </span>

                      <select
                        value={selectedBlock.evidenceAspectRatio || "LANDSCAPE_4_3"}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            evidenceAspectRatio: event.target.value as EvidenceAspectRatio,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="LANDSCAPE_4_3">أفقي 4:3 - تصوير عادي</option>
                        <option value="LANDSCAPE_16_9">أفقي عريض 16:9</option>
                        <option value="PORTRAIT_3_4">طولي 3:4</option>
                        <option value="SQUARE_1_1">مربع 1:1</option>
                      </select>

                      <p className="mt-2 text-[11px] font-bold leading-6 text-slate-500">
                        هذا لا يجبر الموجه على قص الصورة، لكنه يحدد مساحة عرض الشاهد داخل التقارير حتى تظهر المعاينة بنفس تصورك.
                      </p>
                    </label>

                    <div className="mt-3 grid gap-2">
                      <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBlock.evidenceAutoCreatePages !== false}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceAutoCreatePages: event.target.checked,
                            }))
                          }
                        />
                        إنشاء صفحات إضافية تلقائيًا عند زيادة عدد الشواهد
                      </label>

                      <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedBlock.evidenceShowCaptions !== false}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceShowCaptions: event.target.checked,
                            }))
                          }
                        />
                        إظهار التعليقات وأسماء الشواهد
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-500">
                          إذا لا توجد شواهد
                        </span>

                        <select
                          value={selectedBlock.evidenceEmptyBehavior || "message"}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) => ({
                              ...block,
                              evidenceEmptyBehavior: event.target.value as EvidenceEmptyBehavior,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                        >
                          <option value="message">إظهار رسالة لا توجد شواهد</option>
                          <option value="hide">إخفاء البلوك بالكامل</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">
                  المتغيرات العامة: {"{{case.title}}"}، {"{{service.name}}"}،{" "}
                  {"{{student.name}}"}، {"{{identity.counselorName}}"}.
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                اختر بلوكًا من الصفحة الحالية لتعديله.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <h3 className="text-sm font-black text-emerald-900">
              الهوية ثابتة
            </h3>

            <p className="mt-2 text-xs font-bold leading-7 text-emerald-800">
              مكان الترويسة، شعار وزارة التعليم، الإطار العام، الحواف، والفوتر
              جزء من التصميم الرسمي ولا يتم تعديلها من الاستديو.
            </p>

            <div className="mt-3 rounded-2xl bg-white p-3 text-xs font-black text-emerald-700">
              التوجيه الحالي: {scopeLabels[template.scope]}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function WorkflowAwarenessPanel({
  template,
  fields,
  loading,
  message,
  usedFieldKeys,
  onInsertVariable,
}: {
  template: StudioTemplate;
  fields: WorkflowFieldOption[];
  loading: boolean;
  message: string;
  usedFieldKeys: Set<string>;
  onInsertVariable: (variable: string) => void;
}) {
  const groups = groupWorkflowFields(fields);
  const usedCount = fields.filter((field) => usedFieldKeys.has(field.key)).length;
  const [expanded, setExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  if (!panelOpen) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-right transition hover:bg-emerald-50"
        >
          <div>
            <p className="text-sm font-black text-emerald-700">خريطة الربط مع Workflow</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              مخفية حاليًا حتى لا تزحم المعاينة. اضغط لعرض الحقول والخطوات.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
              {fields.length} حقول
            </span>
            <span className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white">
              عرض
            </span>
          </div>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-700">
            خريطة الربط مع Workflow
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            اعرف الحقول قبل بناء التقارير
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            عند ربط القالب بخدمة أو Workflow، تظهر لك خطواته وحقوله. الحقول
            المستخدمة داخل النصوص تظهر بعلامة مستخدم، والبقية تظل واضحة حتى لا
            تنساها أثناء بناء التقارير.
          </p>
        </div>

        <div className="grid min-w-64 grid-cols-3 gap-2 text-center">
          <Metric label="الحقول" value={`${fields.length}`} />
          <Metric label="المستخدم" value={`${usedCount}`} />
          <Metric label="الحالة" value={loading ? "جلب" : "جاهز"} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-6 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-50"
          >
            {expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          </button>

          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            إخفاء اللوحة
          </button>
        </div>
      </div>

      {expanded && (template.scope === "GLOBAL" || template.scope === "LOCATION") ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
          هذا القالب غير موجه لخدمة أو Workflow حاليًا. إذا أردت ظهور الحقول،
          اختر التوجيه "خدمة" أو "Workflow" وحدد الخدمة.
        </div>
      ) : null}

      {expanded && groups.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {groups.map((group, groupIndex) => (
            <div
              key={group.stepTitle}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-900">
                  {groupIndex + 1}. {group.stepTitle}
                </h3>

                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                  {group.fields.length} حقول
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {group.fields.map((field, fieldIndex) => {
                  const used = usedFieldKeys.has(field.key);
                  const variable = `{{field.${field.key}}}`;

                  return (
                    <div
                      key={`${field.stepTitle || "field"}-${field.key}-${fieldIndex}`}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {field.label}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-slate-400">
                            {variable}
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[10px] font-black",
                            used
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {used ? "مستخدم" : "غير مستخدم"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInsertVariable(variable)}
                        className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100"
                      >
                        إدراج المتغير في البلوك المحدد
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function HeaderSettingsPanel({
  settings,
  onChange,
}: {
  settings: ReportHeaderSettings;
  onChange: (settings: ReportHeaderSettings) => void;
}) {
  type NumericHeaderKey =
    | "heightPx"
    | "paddingTopPx"
    | "paddingBottomPx"
    | "paddingInlinePx"
    | "itemGapPx"
    | "logoSizePx"
    | "headerFontSizePx"
    | "titleFontSizePx"
    | "subtitleFontSizePx"
    | "lineHeight";

  function updateNumber(key: NumericHeaderKey, value: string) {
    onChange({
      ...settings,
      [key]: Number(value),
    });
  }

  const numberControls: Array<{
    key: Exclude<NumericHeaderKey, "lineHeight">;
    label: string;
    max: number;
  }> = [
    { key: "heightPx", label: "ارتفاع الترويسة", max: 420 },
    { key: "paddingTopPx", label: "مسافة علوية", max: 160 },
    { key: "paddingBottomPx", label: "مسافة سفلية", max: 160 },
    { key: "paddingInlinePx", label: "مسافة يمين/يسار", max: 180 },
    { key: "itemGapPx", label: "الفجوة بين عناصر الترويسة", max: 100 },
    { key: "logoSizePx", label: "حجم الشعار", max: 240 },
    { key: "headerFontSizePx", label: "حجم خط الترويسة", max: 48 },
    { key: "titleFontSizePx", label: "حجم خط العنوان", max: 72 },
    {
      key: "subtitleFontSizePx",
      label: "حجم خط العنوان الفرعي",
      max: 48,
    },
  ];

  return (
    <details
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      dir="rtl"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            إعدادات الترويسة
          </h2>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            القيمة 0 تحافظ على إعداد التصميم الأصلي لضمان توافق القوالب القديمة.
          </p>
        </div>

        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          فتح / إخفاء
        </span>
      </summary>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {numberControls.map((control) => (
          <label key={control.key} className="block">
            <span className="text-xs font-black text-slate-600">
              {control.label}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={control.max}
                step={1}
                value={settings[control.key]}
                onChange={(event) =>
                  updateNumber(control.key, event.target.value)
                }
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] font-black text-slate-400">px</span>
            </div>
          </label>
        ))}

        <label className="block">
          <span className="text-xs font-black text-slate-600">سماكة الخط</span>
          <select
            value={settings.fontWeight}
            onChange={(event) =>
              onChange({
                ...settings,
                fontWeight: event.target
                  .value as ReportHeaderSettings["fontWeight"],
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          >
            <option value="inherit">حسب التصميم</option>
            <option value="400">عادي 400</option>
            <option value="500">متوسط 500</option>
            <option value="600">شبه عريض 600</option>
            <option value="700">عريض 700</option>
            <option value="800">عريض جدًا 800</option>
            <option value="900">أسود 900</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black text-slate-600">
            تباعد الأسطر
          </span>
          <input
            type="number"
            min={0}
            max={3}
            step={0.05}
            value={settings.lineHeight}
            onChange={(event) =>
              updateNumber("lineHeight", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black text-slate-600">نوع الخط</span>
          <select
            value={settings.fontFamily}
            onChange={(event) =>
              onChange({
                ...settings,
                fontFamily: event.target
                  .value as ReportHeaderSettings["fontFamily"],
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
          >
            <option value="inherit">حسب التصميم</option>
            <option value="Cairo">Cairo</option>
            <option value="Arial">Arial</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_REPORT_HEADER_SETTINGS })}
        className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
      >
        استعادة إعدادات التصميم الأصلية
      </button>
    </details>
  );
}

function OfficialPagePreview({
  template,
  activePage,
  activePageId,
  context,
  previewCase,
  onActivePageChange,
  onAddPage,
}: {
  template: StudioTemplate;
  activePage?: StudioPage;
  activePageId: string;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  onActivePageChange: (pageId: string) => void;
  onAddPage: () => void;
}) {
  return (
    <ReportDesignRenderer
      designId={template.designTemplateId || "ministry-form"}
      template={template}
      activePage={activePage}
      activePageId={activePageId}
      context={context}
      previewCase={previewCase}
      onActivePageChange={onActivePageChange}
      onAddPage={onAddPage}
    />
  );
}

function PreviewBlock({
  block,
  context,
  previewCase,
}: {
  block: StudioBlock;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
}) {
  const rendered = renderText(block.content, context);
  const textAlign = block.align === "center" ? "text-center" : "text-right";

  if (block.hideWhenMissing && block.boundFieldKey) {
    const fieldValue = String(context[`field.${block.boundFieldKey}`] || "").trim();

    if (!fieldValue) {
      return null;
    }
  }

  if (block.kind === "hero-title") {
    return (
      <section className="flex flex-col items-center justify-center py-5 text-center">
        <p className="text-xs font-black text-emerald-700">
          {context["service.name"]}
        </p>
        <h1 className="mx-auto mt-3 max-w-[145mm] text-3xl font-black leading-[1.7] text-slate-950">
          {rendered}
        </h1>
        {block.showMeta ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-black text-slate-500">
            <span className="rounded-full bg-emerald-50 px-3 py-1">
              {context["case.createdAt"]}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {context["identity.counselorName"]}
            </span>
          </div>
        ) : null}
      </section>
    );
  }

  if (block.kind === "meta-strip") {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="grid gap-2 md:grid-cols-2">
          {splitLines(rendered).map((line) => (
            <div
              key={line}
              className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              {line}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "bullet-list") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <ul className="space-y-2">
          {splitLines(rendered).map((line) => (
            <li key={line} className="flex gap-2 text-sm leading-7 text-slate-700">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.kind === "multi-paragraph") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <div className="space-y-3">
          {splitParagraphs(rendered).map((paragraph) => (
            <p key={paragraph} className="text-sm leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "dynamic-fields") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {getWorkflowDynamicFieldCards(previewCase).map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
            >
              <p className="text-[11px] font-black text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {value || "غير متوفر"}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "evidence-gallery") {
    const hasSelectedCase = Boolean(previewCase?.caseId);
    const realEvidences = filterValidReportEvidenceItems(
      previewCase?.evidences || [],
      { allowSampleEvidence: !hasSelectedCase },
    );
    const perPage = getEvidencePerPage(block);
    const startIndex = block.evidenceStartIndex || 0;

    if (!realEvidences.length && hasSelectedCase) {
      return null;
    }

    if (!realEvidences.length && block.evidenceEmptyBehavior === "hide") {
      return null;
    }

    const placeholderEvidences = createEvidencePlaceholders(perPage, startIndex);
    const sourceEvidences = realEvidences.length ? realEvidences : placeholderEvidences;
    const visibleEvidences = sourceEvidences.slice(startIndex, startIndex + perPage);
    const hiddenCount = Math.max(realEvidences.length - (startIndex + perPage), 0);
    const isPlaceholderMode = !realEvidences.length;

    if (block.evidenceLayout === "ATTACHMENT_LIST") {
      return (
        <section className={getBlockClass(block.variant, textAlign)}>
          {block.showTitle ? <BlockTitle title={block.title} /> : null}

          <div className="space-y-2">
            {visibleEvidences.map((evidence, index) => (
              <div
                key={evidence.id || evidence.fileUrl || String(index)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                <span>
                  {evidence.caption || evidence.title || "مرفق " + (startIndex + index + 1)}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                  {isPlaceholderMode ? "معاينة" : "شاهد"}
                </span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}

        <div className={getEvidenceGridClass(block)}>
          {visibleEvidences.map((evidence, index) => {
            const imageUrl = evidence.imageUrl || evidence.fileUrl || "";

            return (
              <figure
                key={evidence.id || imageUrl || String(index)}
                className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {imageUrl && !isPlaceholderMode ? (
                  <img
                    src={imageUrl}
                    alt={evidence.title || "شاهد " + (startIndex + index + 1)}
                    className={getEvidenceImageClass(block) + " bg-slate-50"}
                  />
                ) : (
                  <div className={getEvidenceImageHeightClass(block) + " flex w-full flex-col items-center justify-center bg-slate-50 text-center"}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                      📎
                    </div>
                    <p className="mt-3 text-xs font-black text-slate-500">
                      {isPlaceholderMode ? "مساحة شاهد للمعاينة" : "شاهد بدون صورة"}
                    </p>
                  </div>
                )}

                {block.evidenceShowCaptions !== false ? (
                  <figcaption className="max-h-12 overflow-hidden border-t border-slate-100 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                    {evidence.caption || evidence.title || "شاهد " + (startIndex + index + 1)}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>

        {hiddenCount > 0 && block.evidenceAutoCreatePages === false ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            يوجد {hiddenCount} شاهد إضافي. سيتم نقله إلى صفحة شواهد إضافية حتى لا يتمدد إطار A4.
          </p>
        ) : null}

        {isPlaceholderMode ? (
          <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            هذه مربعات معاينة فقط. عند اختبار Case ID يحتوي شواهد، سيتم عرض الشواهد الفعلية هنا.
          </p>
        ) : null}
      </section>
    );
  }

  if (block.kind === "closing-note") {
    return (
      <section className={getBlockClass(block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} /> : null}
        <p className="text-sm leading-8 text-slate-700">{rendered}</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-400">
              الموجه/الموجهة الطلابية
            </p>
            <p className="mt-4 text-sm font-black text-slate-800">
              {context["identity.counselorName"]}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black text-slate-400">
              مدير/مديرة المدرسة
            </p>
            <p className="mt-4 text-sm font-black text-slate-800">
              {context["identity.principalName"]}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={getBlockClass(block.variant, textAlign)}>
      {block.showTitle ? <BlockTitle title={block.title} /> : null}
      <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
        {rendered}
      </p>
    </section>
  );
}


function createEvidencePlaceholders(
  count: number,
  startIndex: number,
): NonNullable<PreviewCaseData["evidences"]> {
  return Array.from({ length: count }).map((_, index) => {
    const evidenceNumber = startIndex + index + 1;

    return {
      id: "placeholder-evidence-" + evidenceNumber,
      title: "شاهد تجريبي " + evidenceNumber,
      caption: "مكان الشاهد داخل التقارير",
      fileUrl: "",
      imageUrl: "",
    };
  });
}

function getEvidencePerPage(block: any) {
  return getSmartEvidencePerPage(block);
}

function getSmartEvidencePerPage(block: any) {
  const layout = String(block?.evidenceLayout || "TWO_PER_PAGE");
  const ratio = String(block?.evidenceAspectRatio || "LANDSCAPE_4_3");
  const fit = String(block?.evidenceFit || "contain");

  if (layout === "ATTACHMENT_LIST") return 10;
  if (layout === "ONE_PER_PAGE") return 1;
  if (layout === "TWO_PER_PAGE") return 2;

  /*
    GRID_2X2 is a maximum capacity, not a forced capacity.
    The system must keep every evidence card inside the A4 frame.
    Portrait images are tall, so 4 cards can overflow the page.
  */
  if (layout === "GRID_2X2") {
    if (ratio === "PORTRAIT_3_4") return 2;
    if (ratio === "SQUARE_1_1" && fit === "cover") return 4;
    if (ratio === "SQUARE_1_1") return 4;
    if (ratio === "LANDSCAPE_16_9") return 4;
    return 4;
  }

  return 2;
}

function getEvidenceGridClass(block: any) {
  const perPage = getEvidencePerPage(block);

  if (block.evidenceLayout === "ATTACHMENT_LIST") {
    return "grid gap-2";
  }

  if (perPage <= 1) {
    return "grid gap-3";
  }

  return "grid gap-3 md:grid-cols-2";
}


function getEvidenceAspectRatioClass(block: StudioBlock) {
  switch (block.evidenceAspectRatio || "LANDSCAPE_4_3") {
    case "LANDSCAPE_16_9":
      return "aspect-video";
    case "PORTRAIT_3_4":
      return "aspect-[3/4]";
    case "SQUARE_1_1":
      return "aspect-square";
    case "LANDSCAPE_4_3":
    default:
      return "aspect-[4/3]";
  }
}

function getEvidenceImageHeightClass(block: any) {
  const perPage = getEvidencePerPage(block);
  const ratio = block.evidenceAspectRatio || "LANDSCAPE_4_3";

  /*
    Fixed heights are intentional:
    they keep evidence inside the printable A4 area.
    Extra evidence must go to a new Evidence Page instead of stretching A4.
  */
  if (perPage <= 1) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[185mm]";
      case "SQUARE_1_1":
        return "h-[160mm]";
      case "LANDSCAPE_16_9":
        return "h-[122mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[138mm]";
    }
  }

  if (perPage === 2) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[92mm]";
      case "SQUARE_1_1":
        return "h-[82mm]";
      case "LANDSCAPE_16_9":
        return "h-[58mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[66mm]";
    }
  }

  switch (ratio) {
    case "SQUARE_1_1":
      return "h-[56mm]";
    case "LANDSCAPE_16_9":
      return "h-[42mm]";
    case "PORTRAIT_3_4":
      return "h-[82mm]";
    case "LANDSCAPE_4_3":
    default:
      return "h-[48mm]";
  }
}

function getEvidenceImageClass(block: any) {
  const fit = block.evidenceFit === "cover" ? "object-cover" : "object-contain";
  return `${getEvidenceImageHeightClass(block)} w-full ${fit}`;
}

function EmptyEvidenceMessage() {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
      <p className="text-sm font-black text-emerald-800">
        لا توجد شواهد مرتبطة بالـ Case ID الحالي
      </p>

      <p className="mt-2 text-xs font-bold leading-6 text-emerald-700">
        هذا البلوك لن يعرض أي مرفقات في التقارير النهائي إلا إذا كانت الحالة تحتوي على شواهد.
      </p>
    </div>
  );
}

function BlockTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-base font-black text-slate-950">
      {title}
    </h3>
  );
}

function getPlacementClass(placement: BlockPlacement) {
  const fullCenteredBase = "absolute left-0 right-0 w-full";
  const centeredBase = "absolute left-1/2 w-full max-w-[78%] -translate-x-1/2";
  const sideBase = "absolute w-full max-w-[58%]";

  const classes: Record<BlockPlacement, string> = {
    flow: "",

    // الخيارات العامة: تبقى بعرضها الطبيعي الكامل مثل وضع الترتيب الطبيعي
    top: `${fullCenteredBase} top-0`,
    middle: `${fullCenteredBase} top-1/2 -translate-y-1/2`,
    bottom: `${fullCenteredBase} bottom-0`,

    // الخيارات الدقيقة: يمين/وسط/يسار بعرض مخصص حتى لا تملأ الصفحة كاملة
    "top-right": `${sideBase} right-0 top-0`,
    "top-center": `${centeredBase} top-0`,
    "top-left": `${sideBase} left-0 top-0`,

    "middle-right": `${sideBase} right-0 top-1/2 -translate-y-1/2`,
    "middle-center": `${centeredBase} top-1/2 -translate-y-1/2`,
    "middle-left": `${sideBase} left-0 top-1/2 -translate-y-1/2`,

    "bottom-right": `${sideBase} bottom-0 right-0`,
    "bottom-center": `${centeredBase} bottom-0`,
    "bottom-left": `${sideBase} bottom-0 left-0`,
  };

  return classes[placement];
}

function getBlockClass(variant: BlockVariant, textAlign: string) {
  const base = `break-inside-avoid ${textAlign}`;

  const classes: Record<BlockVariant, string> = {
    hero: `${base} py-5`,
    plain: `${base} px-1 py-2`,
    card: `${base} rounded-3xl border border-slate-200 bg-white p-5 shadow-sm`,
    soft: `${base} rounded-3xl border border-emerald-100 bg-emerald-50 p-5`,
    highlight: `${base} rounded-3xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white p-5`,
    outline: `${base} rounded-3xl border border-dashed border-slate-300 bg-white p-5`,
    quote: `${base} rounded-3xl border border-slate-200 bg-slate-50 p-5`,
  };

  return classes[variant];
}







type WorkflowDynamicFieldCard = {
  key: string;
  label: string;
  value: string;
};

const WORKFLOW_DYNAMIC_FIELD_LABELS: Record<string, string> = {
  activity_domain: "مجال النشاط",
  activity_program_scouting: "برنامج النشاط الكشفي",
  activity_program: "برنامج النشاط",
  semester: "الفصل الدراسي",
  term: "الفصل الدراسي",
  execution_mode: "طريقة التنفيذ",
  execution_method: "طريقة التنفيذ",
  planned_sessions: "عدد اللقاءات المخططة",
  sessions_count: "عدد اللقاءات",
  start_week: "أسبوع البداية",
  week: "الأسبوع",
  start_day: "يوم البداية",
  start_date: "تاريخ البداية",
  end_week: "أسبوع النهاية",
  end_day: "يوم النهاية",
  end_date: "تاريخ النهاية",
  target_class: "الفئة المستهدفة",
  target_group: "الفئة المستهدفة",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  community_partnership_count: "عدد الشراكات المجتمعية",
  parents_participated: "مشاركة أولياء الأمور",
};

const WORKFLOW_DYNAMIC_VALUE_LABELS: Record<string, string> = {
  scouting: "النشاط الكشفي",
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",

  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  term_3: "الفصل الدراسي الثالث",
  semester_1: "الفصل الدراسي الأول",
  semester_2: "الفصل الدراسي الثاني",
  semester_3: "الفصل الدراسي الثالث",

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
  true: "نعم",
  false: "لا",
};

function cleanWorkflowDynamicText(value: unknown) {
  return String(value ?? "").trim();
}

function isTechnicalWorkflowText(value: string) {
  return /^[a-z0-9_/-]+$/i.test(value) && /[a-z_]/i.test(value);
}

function translateWorkflowDynamicLabel(key: unknown, label: unknown) {
  const cleanKey = cleanWorkflowDynamicText(key);
  const cleanLabel = cleanWorkflowDynamicText(label);

  if (cleanLabel && cleanLabel !== cleanKey && !isTechnicalWorkflowText(cleanLabel)) {
    return cleanLabel;
  }

  return WORKFLOW_DYNAMIC_FIELD_LABELS[cleanKey] || cleanLabel || cleanKey;
}

function translateWorkflowDynamicValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => translateWorkflowDynamicValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      translateWorkflowDynamicValue(record.label) ||
      translateWorkflowDynamicValue(record.name) ||
      translateWorkflowDynamicValue(record.value) ||
      translateWorkflowDynamicValue(record.key) ||
      ""
    );
  }

  const text = cleanWorkflowDynamicText(value);
  const normalized = text.toLowerCase();

  if (WORKFLOW_DYNAMIC_VALUE_LABELS[normalized]) {
    return WORKFLOW_DYNAMIC_VALUE_LABELS[normalized];
  }

  const programMatch = /^program[_-](\d+)$/i.exec(text);
  if (programMatch) {
    return `برنامج النشاط رقم ${Number(programMatch[1])}`;
  }

  return text;
}

function getWorkflowDynamicFieldCards(previewCase: any): WorkflowDynamicFieldCard[] {
  return (previewCase?.values || [])
    .map((item: any, index: number) => {
      const key = cleanWorkflowDynamicText(item.fieldKey);
      const label = translateWorkflowDynamicLabel(
        item.fieldKey,
        item.fieldLabel || `حقل ${index + 1}`,
      );
      const value = translateWorkflowDynamicValue(item.value);

      return {
        key: key || label || `workflow-field-${index + 1}`,
        label,
        value,
      };
    })
    .filter((item: any) => item.label && item.value);
}
