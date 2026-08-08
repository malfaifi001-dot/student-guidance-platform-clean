import { filterPrivateReportValues } from "@/lib/report-engine/report-private-fields";
import { isStudentIdentityField } from "@/lib/workflow-values/structured-value-metadata";
import { getValidPreviewEvidences } from "./report-evidence-data";
import type { FinalReportValueItem, PreviewCaseData } from "./report-types";

function findSavedEvidenceGalleryBlock(template: any) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];

  for (const page of pages) {
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
    const block = blocks.find((item: any) => item?.kind === "evidence-gallery");

    if (block) {
      return block;
    }
  }

  return null;
}
export function normalizeFinalReportTemplate(
  template: any,
  editorialBlocks: Record<string, string>,
  previewCaseData: PreviewCaseData | null,
) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];
  const savedEvidenceBlock = findSavedEvidenceGalleryBlock(template);
  const hasEvidence = getValidPreviewEvidences(previewCaseData).length > 0;

  return {
    ...template,
    pages: pages.flatMap((page: any, pageIndex: number) => {
      if (!hasEvidence && page?.kind === "evidence") {
        return [];
      }

      const pageBlocks = Array.isArray(page?.blocks) ? page.blocks : [];

      const normalizedBlocks = pageBlocks
        .map((block: any, blockIndex: number) =>
          normalizeFinalReportBlock(template, block, blockIndex, editorialBlocks),
        )
        .filter((block: any) => hasEvidence || block.kind !== "evidence-gallery");

      const shouldAddEvidenceBlock =
        hasEvidence &&
        page?.kind === "evidence" &&
        !savedEvidenceBlock &&
        !normalizedBlocks.some((block: any) => block.kind === "evidence-gallery");

      return [{
        ...page,
        id: page?.id || "final-page-" + (pageIndex + 1),
        title: page?.title || "صفحة " + (pageIndex + 1),
        kind: page?.kind || "content",
        blocks: shouldAddEvidenceBlock
          ? [
              ...normalizedBlocks,
              {
                id: "auto-evidence-gallery-" + (pageIndex + 1),
                kind: "evidence-gallery",
                title: "الشواهد والمرفقات",
                content: "",
                variant: "card",
                align: "right",
                showTitle: true,
                placement: "flow",
                evidenceLayout: "GRID_2X2",
                evidenceFit: "contain",
                evidenceAspectRatio: "LANDSCAPE_4_3",
                evidenceShowCaptions: true,
                evidenceAutoCreatePages: true,
                evidenceEmptyBehavior: "message",
              },
            ]
          : normalizedBlocks,
      }];
    }),
  };
}

function normalizeFinalReportBlock(
  template: any,
  block: any,
  index: number,
  editorialBlocks: Record<string, string>,
) {
  const settings = block?.settings || {};
  const textLibrary = settings.textLibrary || {};

  const rawKind =
    settings.smartBlockKind ||
    block?.smartBlockKind ||
    block?.kind ||
    "paragraph";

  const blockId = block?.id || "final-block-" + (index + 1);

  const editedContent = getFinalEditedBlockContent(
    block,
    blockId,
    editorialBlocks,
  );

  const normalizedKind = normalizeFinalBlockKind(rawKind);

  const resolvedContent =
    editedContent ||
    resolveFinalBlockContent({
      template,
      block,
      settings,
      textLibrary,
      rawKind,
    });

  return {
    ...block,
    id: blockId,
    originalKind: rawKind,
    kind: normalizedKind,
    finalFieldGroup: settings.fieldGroup || rawKind,
    title:
      block?.customTitle ||
      block?.title ||
      settings.title ||
      getDefaultFinalBlockTitle(rawKind),
    content: resolvedContent,
    variant: block?.variant || settings.style || "card",
    align: block?.align || settings.align || "right",
    showTitle:
      typeof block?.showTitle === "boolean"
        ? block.showTitle
        : settings.showTitle !== false,
    showMeta:
      typeof block?.showMeta === "boolean"
        ? block.showMeta
        : settings.showMeta !== false,
    placement: block?.placement || settings.placement || "flow",
    snippetId:
      block?.snippetId ||
      settings.snippetId ||
      textLibrary.snippetId ||
      null,

    fieldKeys:
      block?.fieldKeys ||
      settings.fieldKeys ||
      settings.selectedFieldKeys ||
      settings.workflowFieldKeys ||
      [],

    evidenceLayout:
      block?.evidenceLayout || settings.evidenceLayout || "GRID_2X2",
    evidenceFit: block?.evidenceFit || settings.evidenceFit || "contain",
    evidenceAspectRatio:
      block?.evidenceAspectRatio ||
      settings.evidenceAspectRatio ||
      "LANDSCAPE_4_3",
    evidenceShowCaptions:
      typeof block?.evidenceShowCaptions === "boolean"
        ? block.evidenceShowCaptions
        : settings.evidenceShowCaptions !== false,
    evidenceAutoCreatePages:
      typeof block?.evidenceAutoCreatePages === "boolean"
        ? block.evidenceAutoCreatePages
        : settings.evidenceAutoCreatePages !== false,
    evidenceEmptyBehavior:
      block?.evidenceEmptyBehavior ||
      settings.evidenceEmptyBehavior ||
      "message",
  };
}

export function buildFinalReportContext(
  previewCaseData: PreviewCaseData | null,
  identity: Record<string, any>,
) {
  const data = (previewCaseData || {}) as any;
  const student = data.student || data.caseEntry?.student || {};
  const service = data.service || data.caseEntry?.service || {};

  const caseTitle =
    data.title ||
    data.caseEntry?.title ||
    data.values?.reportTitle ||
    data.values?.caseTitle ||
    "تقرير رسمي";

  const serviceName =
    data.serviceName ||
    service.name ||
    data.caseEntry?.service?.name ||
    "";

  const studentName =
    student.name ||
    student.fullName ||
    data.studentName ||
    "";
  const validEvidenceCount = getValidPreviewEvidences(data).length;

  const context: Record<string, string> = {
    "case.id": data.caseId || data.id || data.caseEntry?.id || "",
    "case.title": caseTitle,
    "case.status": data.status || data.caseEntry?.status || "",
    "case.createdAt": formatFinalDate(data.createdAt || data.caseEntry?.createdAt),
    "case.updatedAt": formatFinalDate(data.updatedAt),

    caseId: data.caseId || data.id || data.caseEntry?.id || "",
    caseTitle,
    reportTitle: caseTitle,

    "service.name": serviceName,
    "service.slug": data.serviceSlug || service.slug || data.caseEntry?.service?.slug || "",
    serviceName,
    serviceSlug: data.serviceSlug || service.slug || "",

    "student.name": studentName,
    "student.grade": student.grade || data.studentGrade || "",
    "student.classroom": student.classroom || data.studentClassroom || "",
    "student.stage": student.stage || "",
    "student.guardianName": student.guardianName || data.guardianName || "",
    "student.guardianPhone": student.guardianPhone || data.guardianPhone || "",

    studentName,
    studentGrade: student.grade || "",
    studentClassroom: student.classroom || "",
    studentStage: student.stage || "",
    guardianName: student.guardianName || "",
    guardianPhone: student.guardianPhone || "",

    "identity.schoolName": identity.schoolName || identity.school?.name || "",
    "identity.ministryName": identity.ministryName || "وزارة التعليم",
    "identity.counselorName": identity.counselorName || identity.counselor?.name || "",
    "identity.principalName":
      identity.principalName ||
      identity.schoolLeaderName ||
      identity.school?.principalName ||
      "",
    "identity.educationDepartment": identity.educationDepartment || "",
    "identity.educationOffice": identity.educationOffice || "",
    "identity.academicYear": identity.academicYear || "",
    "identity.semester": identity.semester || "",

    schoolName: identity.schoolName || identity.school?.name || "",
    ministryName: identity.ministryName || "وزارة التعليم",
    counselorName: identity.counselorName || identity.counselor?.name || "",
    principalName:
      identity.principalName ||
      identity.schoolLeaderName ||
      identity.school?.principalName ||
      "",

    "evidence.count": String(validEvidenceCount),
    evidenceCount: String(validEvidenceCount),
    evidenceCountText: formatFinalEvidenceCount(validEvidenceCount),
  };

  for (const value of collectFinalValues(data)) {
    const key = value.fieldKey || "";
    const label = value.fieldLabel || "";
    const itemValue = value.value || "";

    if (key) {
      context["field." + key] = itemValue;
      context[key] = itemValue;
    }

    if (label) {
      context["field." + label] = itemValue;
      context[label] = itemValue;
    }
  }

  if (!context.programTitle) {
    context.programTitle =
      context.program_name ||
      context["field.program_name"] ||
      context["عنوان البرنامج"] ||
      caseTitle;
  }

  if (!context.executionDate) {
    context.executionDate =
      context.gregorian_date ||
      context.execution_date ||
      context["تاريخ التنفيذ"] ||
      context["case.createdAt"];
  }

  if (!context.dayText) {
    context.dayText = context.day || context["اليوم"] || "";
  }

  if (!context.targetGroup) {
    context.targetGroup =
      context.beneficiaries ||
      context.target_group ||
      context["الفئة المستهدفة"] ||
      context["student.grade"] ||
      "";
  }

  if (!context.executionAction) {
    context.executionAction =
      context.execution_action ||
      context["الإجراء التنفيذي"] ||
      "";
  }

  if (!context.executionMechanism) {
    context.executionMechanism =
      context.execution_mechanism ||
      context["آلية التنفيذ"] ||
      "";
  }

  if (!context.performanceIndicator) {
    context.performanceIndicator =
      context.performance_indicator ||
      context["مؤشر الأداء"] ||
      "";
  }

  if (!context.evidenceSuggestion) {
    context.evidenceSuggestion =
      context.evidence_suggestion ||
      context["الشاهد المقترح"] ||
      context["الشواهد"] ||
      "";
  }

  return context;
}


function normalizeFinalBlockKind(kind: string) {
  if (kind === "cover-title") return "hero-title";
  if (kind === "paragraph") return "multi-paragraph";
  if (kind === "custom-paragraph") return "multi-paragraph";
  if (kind === "text-library") return "multi-paragraph";
  if (kind === "case-meta") return "field-list";
  if (kind === "student-summary") return "field-list";
  if (kind === "service-summary") return "field-list";
  if (kind === "field-list") return "field-list";
  if (kind === "approval-signature") return "closing-note";
  if (kind === "identity-header") return "section-text";

  return kind;
}

function getDefaultFinalBlockTitle(kind: string) {
  if (kind === "cover-title") return "عنوان التقارير";
  if (kind === "case-meta") return "بيانات الحالة";
  if (kind === "student-summary") return "بيانات الطالب/الطالبة";
  if (kind === "service-summary") return "بيانات الخدمة";
  if (kind === "field-list") return "حقول من الحالة";
  if (kind === "text-library") return "نص من مكتبة النصوص";
  if (kind === "custom-paragraph") return "فقرة مخصصة";
  if (kind === "evidence-gallery") return "الشواهد والمرفقات";
  if (kind === "approval-signature") return "الاعتماد";

  return "بلوك التقارير";
}


function getFinalEditedBlockContent(
  block: any,
  blockId: string,
  editorialBlocks: Record<string, string>,
) {
  const candidateKeys = [
    blockId,
    block?.id ? String(block.id) : "",
  ].filter(Boolean);

  for (const key of candidateKeys) {
    const value = editorialBlocks[key];

    if (!value || !String(value).trim()) {
      continue;
    }

    if (isFinalLegacyRenderedReportDump(value)) {
      continue;
    }

    return value;
  }

  return "";
}

function isFinalLegacyRenderedReportDump(value: string) {
  const text = String(value || "");

  if (!text.trim()) {
    return false;
  }

  const hasReplacementChars = /�/.test(text);
  const hasMojibakeMarks = /[ØÙÃ]/.test(text);
  const hasReportDumpLabels =
    /program_name\s*:|semester\s*:|gregorian_date\s*:|beneficiaries\s*:|execution_action\s*:|execution_mechanism\s*:|performance_indicator\s*:|selectedStudent\s*:/.test(
      text,
    );

  const hasOldArabicDump =
    text.includes("ملخص التقارير") ||
    text.includes("بيانات الحالة") ||
    text.includes("القيم المسجلة") ||
    text.includes("الشواهد:") ||
    text.includes("تقرير:");

  const tooLongForBlock = text.length > 1800;

  return (
    hasReplacementChars ||
    hasMojibakeMarks ||
    hasReportDumpLabels ||
    (hasOldArabicDump && tooLongForBlock)
  );
}


function resolveFinalBlockContent({
  template,
  block,
  settings,
  textLibrary,
  rawKind,
}: {
  template: any;
  block: any;
  settings: any;
  textLibrary: any;
  rawKind: string;
}) {
  if (rawKind === "cover-title") {
    return block?.content || settings?.content || "{{case.title}}";
  }

  if (rawKind === "custom-paragraph") {
    return block?.customContent || block?.content || settings?.content || "";
  }

  if (rawKind === "paragraph") {
    return block?.content || settings?.content || "";
  }

  if (rawKind === "text-library") {
    return resolveFinalTextLibraryContent(template, block, settings, textLibrary);
  }

  const candidateContent =
    block?.content ||
    settings?.content ||
    block?.customContent ||
    block?.defaultContent ||
    "";

  return isFinalLegacyRenderedReportDump(candidateContent)
    ? ""
    : candidateContent;
}

function resolveFinalTextLibraryContent(
  template: any,
  block: any,
  settings: any,
  textLibrary: any,
) {
  const snippets = collectFinalTextSnippets(template);
  const snippetId =
    textLibrary?.snippetId ||
    settings?.snippetId ||
    block?.snippetId ||
    "";

  if (snippetId) {
    const selected = snippets.find((snippet: any) => snippet.id === snippetId);

    if (selected) {
      return selected.content || selected.text || selected.body || "";
    }
  }

  const category =
    textLibrary?.category ||
    settings?.category ||
    block?.category ||
    "مقدمة";

  const serviceSlug =
    textLibrary?.serviceSlug ||
    settings?.serviceSlug ||
    template?.serviceSlug ||
    "";

  const matching = snippets.find((snippet: any) => {
    const matchesCategory =
      !category ||
      category === "all" ||
      snippet.category === category;

    const matchesService =
      !serviceSlug ||
      !snippet.serviceSlug ||
      snippet.serviceSlug === serviceSlug;

    return matchesCategory && matchesService;
  });

  if (matching) {
    return matching.content || matching.text || matching.body || "";
  }

  return getFinalTextLibraryFallback(category);
}

function collectFinalTextSnippets(template: any) {
  const candidates = [
    template?.snippets,
    template?.textSnippets,
    template?.textLibrary,
    template?.library?.snippets,
    template?.settings?.snippets,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getFinalTextLibraryFallback(category: string) {
  if (category === "هدف") {
    return "يهدف هذا التقارير إلى توثيق {{service.name}} للحالة {{case.title}}، وبيان أبرز البيانات والإجراءات المرتبطة بها.";
  }

  if (category === "إجراء") {
    return "تم تنفيذ الإجراءات المرتبطة بالحالة وفق البيانات المدخلة في النظام، مع توثيق ما يلزم من شواهد ومرفقات.";
  }

  if (category === "نتيجة") {
    return "تشير البيانات المدخلة إلى أن الحالة تم التعامل معها ضمن خدمة {{service.name}}، مع حفظ النتائج والتوصيات داخل التقارير.";
  }

  if (category === "توصية") {
    return "يوصى بمتابعة الحالة حسب الحاجة، وتحديث السجل عند وجود مستجدات، وربط الشواهد الداعمة بالتقارير.";
  }

  if (category === "خاتمة") {
    return "تم إعداد هذا التقارير من منصة التوجيه الطلابي اعتمادًا على بيانات الحالة والشواهد المرتبطة بها.";
  }

  return "تم إعداد هذا التقارير لخدمة {{service.name}} بناءً على بيانات الحالة {{case.title}} والشواهد المرتبطة بها.";
}

export function collectFinalValues(data: any): FinalReportValueItem[] {
  if (Array.isArray(data?.values)) {
    return data.values.map((item: any) => ({
      fieldKey: item.fieldKey || item.key || "",
      fieldLabel: item.fieldLabel || item.label || item.fieldKey || "",
      value:
        item.value === undefined || item.value === null
          ? ""
          : String(item.value),
      valueItems: Array.isArray(item.valueItems)
        ? item.valueItems.map((valueItem: unknown) => String(valueItem || "").trim()).filter(Boolean)
        : undefined,
    }));
  }

  if (data?.values && typeof data.values === "object") {
    return Object.entries(data.values).map(([key, value]) => ({
      fieldKey: key,
      fieldLabel: key,
      value:
        value === undefined || value === null
          ? ""
          : String(value),
    }));
  }

  return [];
}

export function resolveContextVariable(key: string, context: Record<string, string>) {
  const aliases: Record<string, string[]> = {
    reportTitle: ["reportTitle", "case.title", "caseTitle"],
    caseTitle: ["case.title", "caseTitle", "reportTitle"],
    serviceName: ["service.name", "serviceName"],
    studentName: ["student.name", "studentName"],
    studentGrade: ["student.grade", "studentGrade"],
    studentClassroom: ["student.classroom", "studentClassroom"],
    guardianName: ["student.guardianName", "guardianName"],
    guardianPhone: ["student.guardianPhone", "guardianPhone"],
    schoolName: ["identity.schoolName", "schoolName"],
    counselorName: ["identity.counselorName", "counselorName"],
    principalName: ["identity.principalName", "principalName"],
  };

  const lookupKeys = [
    key,
    ...(aliases[key] || []),
    key.startsWith("field.") ? key : "field." + key,
  ];

  for (const lookupKey of lookupKeys) {
    const value = context[lookupKey];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

export function getFinalFieldListItems(block: any, previewCaseData: PreviewCaseData | null) {
  const data = (previewCaseData || {}) as any;
  const values = collectFinalValues(data);
  const group = block.finalFieldGroup || block.originalKind || "";
  const selectedKeys = Array.isArray(block.fieldKeys) ? block.fieldKeys : [];

  if (group === "case-meta") {
    return [
      {
        key: "service",
        label: "الخدمة",
        value: data.serviceName || data.service?.name || data.caseEntry?.service?.name || "",
      },
      {
        key: "case-title",
        label: "الحالة",
        value: data.title || data.caseEntry?.title || "",
      },
      {
        key: "status",
        label: "الحالة الحالية",
        value: data.status || data.caseEntry?.status || "",
      },
      {
        key: "created-at",
        label: "تاريخ الإنشاء",
        value: formatFinalDate(data.createdAt || data.caseEntry?.createdAt),
      },
    ];
  }

  if (group === "student-summary") {
    const student = data.student || data.caseEntry?.student || {};

    return [
      {
        key: "student-name",
        label: "الطالب/الطالبة",
        value: student.name || student.fullName || "",
      },
      {
        key: "grade",
        label: "الصف",
        value: student.grade || "",
      },
      {
        key: "classroom",
        label: "الفصل",
        value: student.classroom || "",
      },
      {
        key: "guardian",
        label: "ولي الأمر",
        value: student.guardianName || "",
      },
    ];
  }

  if (selectedKeys.length) {
    return values
      .filter((item: FinalReportValueItem) =>
        selectedKeys.some(
          (key: string) =>
            key === item.fieldKey ||
            key === item.fieldLabel ||
            "field." + key === item.fieldKey,
        ),
      )
      .map((item: FinalReportValueItem) => ({
        key: item.fieldKey,
        label: item.fieldLabel || item.fieldKey,
        value: item.value,
        ...(Array.isArray(item.valueItems) && item.valueItems.length > 1
          ? { valueItems: item.valueItems }
          : {}),
      }));
  }

  return values.slice(0, 10).map((item: FinalReportValueItem) => ({
    key: item.fieldKey,
    label: item.fieldLabel || item.fieldKey,
    value: item.value,
    ...(Array.isArray(item.valueItems) && item.valueItems.length > 1
      ? { valueItems: item.valueItems }
      : {}),
  }));
}

function formatFinalEvidenceCount(count: number) {
  if (count <= 0) return "0 شاهد";
  if (count === 1) return "شاهد واحد";
  if (count === 2) return "شاهدان";
  if (count >= 3 && count <= 10) return count + " شواهد";

  return count + " شاهد";
}


function formatFinalDate(value?: string | null) {
  if (!value) {
    return new Date().toLocaleDateString("ar-SA");
  }

  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return String(value);
  }
}





