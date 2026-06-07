import type {
  ReportTemplateBlock,
  ReportTemplateBuilderModel,
  ReportTemplatePage,
} from "@/lib/report-engine/report-template-builder-types";

const today = new Date().toISOString().slice(0, 10);

function block(
  id: string,
  kind: ReportTemplateBlock["kind"],
  title: string,
  description: string,
  fieldKey = "title",
): ReportTemplateBlock {
  return {
    id,
    kind,
    title,
    description,
    required: kind !== "evidence-gallery",
    source: {
      source: "caseValues",
      label: "بيانات ديناميكية",
      description,
      fieldKey,
    },
  } as ReportTemplateBlock;
}

function page(
  id: string,
  kind: ReportTemplatePage["kind"],
  title: string,
  description: string,
  blocks: ReportTemplateBlock[],
  coverSettings?: ReportTemplatePage["coverSettings"],
): ReportTemplatePage {
  return {
    id,
    kind,
    title,
    description,
    coverSettings,
    blocks,
  } as ReportTemplatePage;
}

export const extraOfficialReportTemplatePresets: ReportTemplateBuilderModel[] = [
  {
    id: "tpl-minimal-guidance-report",
    name: "تقرير رسمي مختصر",
    description:
      "تصميم رسمي هادئ للتقارير المختصرة، مناسب للحالات التي تحتاج صفحة غلاف ومحتوى واعتماد بدون ازدحام.",
    scope: "GLOBAL",
    status: "PUBLISHED",
    updatedAt: today,
    documentType: "REPORT",
    designPreset: "minimal-guidance-report",
    previewCaseId: "",
    pages: [
      page(
        "minimal-cover",
        "cover",
        "الغلاف الرسمي المختصر",
        "غلاف A4 رسمي بترويسة ثابتة وشعار وزارة التعليم فقط.",
        [
          block("minimal-identity", "identity-header", "الترويسة الرسمية", "هوية الوزارة والمدرسة والموجه.", "schoolName"),
          block("minimal-title", "cover-title", "عنوان التقارير", "عنوان التقارير واسم الخدمة.", "title"),
        ],
        {
          showHeader: true,
          showFooter: true,
          titlePosition: "center",
          showDescription: true,
          showMetaChips: true,
          visualStyle: "minimal",
        },
      ),
      page(
        "minimal-content",
        "narrative",
        "المحتوى الرئيسي",
        "فقرة رسمية ذكية قابلة للتحرير من الاستديو وتدعم المتغيرات.",
        [
          block("minimal-paragraph", "custom-paragraph", "نص التقارير", "نص ثابت مع متغيرات ديناميكية من Case وWorkflow.", "summary"),
          block("minimal-fields", "field-list", "البيانات المختصرة", "أهم القيم القادمة من الحالة.", "title"),
        ],
      ),
      page(
        "minimal-approval",
        "approval",
        "الاعتماد",
        "توقيع الموجه/الموجهة وقائد/قائدة المدرسة.",
        [
          block("minimal-signature", "approval-signature", "التوقيعات", "بيانات الاعتماد والتوقيع.", "counselorName"),
        ],
      ),
    ],
  } as ReportTemplateBuilderModel,

  {
    id: "tpl-evidence-rich-report",
    name: "تقرير الشواهد المصور",
    description:
      "تصميم مخصص للتقارير التي تعتمد على الصور والشواهد، مع فصل الشواهد في صفحات A4 مستقلة.",
    scope: "GLOBAL",
    status: "PUBLISHED",
    updatedAt: today,
    documentType: "REPORT",
    designPreset: "evidence-rich-report",
    previewCaseId: "",
    evidenceSettings: {
      enabled: true,
      placement: "END_PAGES",
      layout: "TWO_PER_PAGE",
      showCaptions: true,
      imageFit: "CONTAIN",
    },
    pages: [
      page(
        "evidence-cover",
        "cover",
        "غلاف تقرير الشواهد",
        "غلاف رسمي مختصر يوضح نوع التقارير وعدد الشواهد.",
        [
          block("evidence-identity", "identity-header", "الترويسة الرسمية", "هوية وزارة التعليم والمدرسة.", "schoolName"),
          block("evidence-title", "cover-title", "عنوان التقارير", "عنوان التقارير المرتبط بالحالة.", "title"),
        ],
        {
          showHeader: true,
          showFooter: true,
          titlePosition: "top",
          showDescription: true,
          showMetaChips: true,
          visualStyle: "hero",
        },
      ),
      page(
        "evidence-summary",
        "summary",
        "ملخص التنفيذ",
        "ملخص مختصر قبل الشواهد.",
        [
          block("evidence-case-meta", "case-meta", "بيانات الحالة", "بيانات الحالة والخدمة والطالب إن وجد.", "title"),
          block("evidence-text", "text-library", "نص وصفي", "نص ذكي من مكتبة النصوص.", "description"),
        ],
      ),
      page(
        "evidence-gallery-page",
        "evidence",
        "الشواهد والمرفقات",
        "صفحات شواهد مستقلة. يمكن لاحقًا ضبطها شاهد لكل صفحة أو شاهدين أو أربعة.",
        [
          block("evidence-gallery", "evidence-gallery", "معرض الشواهد", "عرض الصور والمرفقات المرتبطة بالتقارير.", "evidence"),
        ],
      ),
      page(
        "evidence-approval",
        "approval",
        "اعتماد التقارير",
        "توقيع واعتماد التقارير.",
        [
          block("evidence-signature", "approval-signature", "الاعتماد والتوقيع", "اعتماد التقارير بعد مراجعة الشواهد.", "counselorName"),
        ],
      ),
    ],
  } as ReportTemplateBuilderModel,

  {
    id: "tpl-guidance-session-report",
    name: "تقرير جلسة إرشادية",
    description:
      "تصميم مختلف لجلسات الإرشاد الفردي أو الجمعي، يركز على الهدف والأساليب والنتائج والتوصيات.",
    scope: "SERVICE",
    serviceSlug: "guidance-services",
    status: "PUBLISHED",
    updatedAt: today,
    documentType: "REPORT",
    designPreset: "guidance-session-report",
    previewCaseId: "",
    pages: [
      page(
        "session-cover",
        "cover",
        "غلاف الجلسة الإرشادية",
        "غلاف رسمي لجلسة إرشادية.",
        [
          block("session-identity", "identity-header", "الترويسة الرسمية", "هوية التقارير.", "schoolName"),
          block("session-title", "cover-title", "عنوان الجلسة", "عنوان الجلسة ونوع الخدمة.", "sessionTitle"),
        ],
        {
          showHeader: true,
          showFooter: true,
          titlePosition: "center",
          showDescription: true,
          showMetaChips: true,
          visualStyle: "official",
        },
      ),
      page(
        "session-student",
        "summary",
        "بيانات المستفيد",
        "بيانات الطالب/الطالبة أو الفئة المستهدفة.",
        [
          block("session-student-summary", "student-summary", "بيانات الطالب/الفئة", "بيانات المستفيد من الحالة.", "studentName"),
          block("session-case-meta", "case-meta", "بيانات الجلسة", "وقت الجلسة ونوع الحالة.", "caseMeta"),
        ],
      ),
      page(
        "session-body",
        "narrative",
        "تفاصيل الجلسة",
        "أهداف الجلسة والأساليب المستخدمة وتحليل مختصر.",
        [
          block("session-goals", "custom-paragraph", "أهداف الجلسة", "أهداف إرشادية قابلة للتحرير بمتغيرات.", "goals"),
          block("session-methods", "field-list", "الأساليب والنتائج", "الأساليب والنتائج من Workflow.", "results"),
        ],
      ),
      page(
        "session-results",
        "results",
        "التوصيات والمتابعة",
        "نتائج وتوصيات ومتابعة.",
        [
          block("session-recommendations", "text-library", "التوصيات", "نصوص ذكية من مكتبة النصوص.", "recommendations"),
        ],
      ),
      page(
        "session-approval",
        "approval",
        "الاعتماد",
        "توقيع واعتماد.",
        [
          block("session-signature", "approval-signature", "التوقيع", "توقيع الموجه/الموجهة.", "counselorName"),
        ],
      ),
    ],
  } as ReportTemplateBuilderModel,
];

