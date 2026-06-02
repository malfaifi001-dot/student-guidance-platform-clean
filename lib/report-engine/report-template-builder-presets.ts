import { guardianSummonsTemplatePreset } from "@/components/report-engine/guardian-summons-letter-preview";
import type {
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "./report-template-builder-types";

export const initialReportTextSnippets: ReportTextSnippet[] = [
  {
    id: "snippet-intro-positive",
    title: "مقدمة برنامج تعزيز السلوك",
    category: "مقدمة",
    serviceSlug: "guidance-programs",
    content:
      "تم تنفيذ البرنامج ضمن الجهود الإرشادية الهادفة إلى تعزيز السلوك الإيجابي وترسيخ القيم التربوية داخل البيئة المدرسية.",
  },
  {
    id: "snippet-goal-awareness",
    title: "هدف توعوي عام",
    category: "هدف",
    serviceSlug: "guidance-programs",
    content:
      "رفع مستوى الوعي لدى الطلاب بأهمية الالتزام بالقيم والسلوكيات الإيجابية داخل المدرسة.",
  },
  {
    id: "snippet-result-general",
    title: "نتيجة عامة",
    category: "نتيجة",
    content:
      "أسهمت الجهود المنفذة في تعزيز الوعي وتحسين مستوى التفاعل الإيجابي داخل البيئة التعليمية.",
  },
  {
    id: "snippet-recommendation-followup",
    title: "توصية بالمتابعة",
    category: "توصية",
    content:
      "يوصى باستمرار المتابعة وتنفيذ برامج نوعية داعمة وربطها بالشواهد والتقارير الدورية.",
  },
];

export const initialReportTemplateBuilderPresets: ReportTemplateBuilderModel[] = [
    guardianSummonsTemplatePreset,
    {
      id: "tpl-official-school-report",
      name: "قالب رسمي مدرسي",
      description:
        "قالب رسمي متعدد الصفحات مناسب للتقارير الطويلة: غلاف، ملخص، تفاصيل، شواهد، واعتماد.",
      scope: "GLOBAL",
      status: "PUBLISHED",
      updatedAt: "2026-05-30",
      previewCaseId: "sample-case-1",
      pages: [
        {
          id: "page-cover",
          kind: "cover",
          title: "صفحة الغلاف",
          description:
            "تعرض عنوان التقرير والهوية الأساسية بدون تكرار التفاصيل.",
          coverSettings: {
            showHeader: true,
            showFooter: true,
            titlePosition: "center",
            showDescription: true,
            showMetaChips: true,
            visualStyle: "official",
          },
          blocks: [
            {
              id: "cover-identity",
              kind: "identity-header",
              title: "هوية المدرسة والهيدر",
              source: {
                source: "identity",
                label: "بيانات الهوية",
                description: "شعارات وبيانات المدرسة والإدارة.",
              },
              required: false,
            },
            {
              id: "cover-title",
              kind: "cover-title",
              title: "عنوان التقرير",
              source: {
                source: "caseEntry",
                label: "بيانات الحالة",
                description: "عنوان التقرير واسم الخدمة من CaseEntry.",
                fieldKey: "programTitle",
              },
              required: false,
              settings: {
                showTitle: true,
                style: "highlight",
              },
            },
          ],
        },
        {
          id: "page-summary",
          kind: "summary",
          title: "ملخص التقرير",
          description: "يعرض بيانات مختصرة للقارئ قبل التفاصيل.",
          blocks: [
            {
              id: "summary-case-meta",
              kind: "case-meta",
              title: "بيانات التقرير",
              source: {
                source: "caseEntry",
                label: "ملخص الحالة",
                description:
                  "التاريخ، الخدمة، الفئة المستهدفة، وحالة التقرير.",
              },
              required: false,
              settings: {
                columns: 2,
                style: "card",
              },
            },
          ],
        },
        {
          id: "page-narrative",
          kind: "narrative",
          title: "تفاصيل التنفيذ",
          description: "مقدمة، أهداف، إجراءات، نتائج وتوصيات من CaseValue.",
          blocks: [
            {
              id: "narrative-paragraph",
              kind: "paragraph",
              title: "النصوص الأساسية",
              source: {
                source: "caseValues",
                label: "حقول الخدمة",
                description: "النصوص المدخلة سابقًا داخل الخدمة.",
                fieldKey: "intro",
              },
              required: false,
              settings: {
                showTitle: true,
                style: "card",
              },
            },
            {
              id: "custom-note",
              kind: "custom-paragraph",
              title: "فقرة مخصصة",
              customTitle: "ملاحظة تنظيمية",
              customContent:
                "يمكن تعديل هذه الفقرة داخل القالب أو حذفها عند عدم الحاجة.",
              source: {
                source: "custom",
                label: "نص غير مرتبط",
                description: "فقرة يكتبها الأدمن داخل القالب.",
              },
              required: false,
              settings: {
                showTitle: true,
                style: "plain",
              },
            },
          ],
        },
        {
          id: "page-evidence",
          kind: "evidence",
          title: "الشواهد والمرفقات",
          description: "صفحات مستقلة للشواهد حتى لا تتمدد صفحة A4.",
          blocks: [
            {
              id: "evidence-gallery",
              kind: "evidence-gallery",
              title: "معرض الشواهد",
              source: {
                source: "evidence",
                label: "شواهد الحالة",
                description: "يعرض الصور والملفات المرتبطة بالـ Case ID.",
              },
              required: false,
              settings: {
                evidenceLayout: "grid-2x2",
                imageFit: "cover",
                showCaptions: true,
                itemsPerPage: 4,
              },
            },
          ],
        },
        {
          id: "page-approval",
          kind: "approval",
          title: "الاعتماد والتوقيع",
          description: "صفحة رسمية ختامية للتوقيع والختم.",
          blocks: [
            {
              id: "approval-signature",
              kind: "approval-signature",
              title: "التوقيع والاعتماد",
              source: {
                source: "identity",
                label: "بيانات الاعتماد",
                description: "اسم الموجه/الموجهة وقائد/قائدة المدرسة.",
              },
              required: false,
            },
          ],
        },
      ],
    },
    {
      id: "tpl-visual-program-report",
      name: "قالب بصري للبرامج",
      description:
        "قالب مختصر وجذاب للبرامج والأنشطة، يركز على العنوان والوصف والشواهد.",
      scope: "SERVICE",
      serviceSlug: "guidance-programs",
      status: "PUBLISHED",
      updatedAt: "2026-05-30",
      previewCaseId: "sample-case-2",
      pages: [
        {
          id: "visual-main",
          kind: "cover",
          title: "صفحة النشاط",
          description: "صفحة خفيفة تحتوي العنوان والوصف وأول مجموعة شواهد.",
          coverSettings: {
            showHeader: false,
            showFooter: true,
            titlePosition: "center",
            showDescription: true,
            showMetaChips: true,
            visualStyle: "minimal",
          },
          blocks: [
            {
              id: "visual-title",
              kind: "cover-title",
              title: "عنوان البرنامج",
              source: {
                source: "caseEntry",
                label: "بيانات الحالة",
                description: "اسم البرنامج وتاريخ التنفيذ.",
                fieldKey: "programTitle",
              },
              required: false,
            },
            {
              id: "visual-evidence",
              kind: "evidence-gallery",
              title: "شواهد مختارة",
              source: {
                source: "evidence",
                label: "الشواهد",
                description: "يعرض الشواهد بشكل بصري جذاب.",
              },
              required: false,
              settings: {
                evidenceLayout: "grid-2x2",
                imageFit: "cover",
                showCaptions: false,
                itemsPerPage: 4,
              },
            },
          ],
        },
      ],
    },
  ];

