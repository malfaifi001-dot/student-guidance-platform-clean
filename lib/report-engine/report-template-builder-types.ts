export type ReportTemplateScope =
  | "GLOBAL"
  | "SERVICE"
  | "WORKFLOW"
  | "SUB_WORKFLOW";

export type ReportTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ReportDocumentType =
  | "REPORT"
  | "LETTER"
  | "CERTIFICATE"
  | "MINUTES"
  | "FORM"
  | "NOTICE";

export type ReportDesignPreset =
  | "official-school-report"
  | "visual-program-report"
  | "guardian-summons-letter-v1";

export type ReportPageKind =
  | "cover"
  | "summary"
  | "narrative"
  | "results"
  | "evidence"
  | "approval"
  | "letter";

export type ReportBlockKind =
  | "identity-header"
  | "cover-title"
  | "case-meta"
  | "student-summary"
  | "service-summary"
  | "paragraph"
  | "field-list"
  | "text-library"
  | "custom-paragraph"
  | "evidence-gallery"
  | "approval-signature";

export type ReportDataSource =
  | "identity"
  | "caseEntry"
  | "caseValues"
  | "student"
  | "service"
  | "evidence"
  | "textLibrary"
  | "custom"
  | "computed";

export type ReportBlockSource = {
  source: ReportDataSource;
  label: string;
  description: string;
  fieldKey?: string;
};

export type ReportBlockSettings = {
  showTitle?: boolean;
  style?: "plain" | "card" | "highlight";
  columns?: 1 | 2;
  evidenceLayout?: "grid-2x2" | "two-columns" | "stacked" | "one-per-page";
  imageFit?: "contain" | "cover";
  showCaptions?: boolean;
  itemsPerPage?: 1 | 2 | 4;
};

export type ReportCoverSettings = {
  showHeader?: boolean;
  showFooter?: boolean;
  titlePosition?: "center" | "top";
  showDescription?: boolean;
  showMetaChips?: boolean;
  visualStyle?: "official" | "minimal" | "hero";
};

export type ReportTemplateBlock = {
  id: string;
  kind: ReportBlockKind;
  title: string;
  source: ReportBlockSource;
  required: boolean;

  customTitle?: string;
  customContent?: string;

  settings?: ReportBlockSettings;
};

export type ReportTemplatePage = {
  id: string;
  kind: ReportPageKind;
  title: string;
  description: string;
  blocks: ReportTemplateBlock[];
  coverSettings?: ReportCoverSettings;
};

export type ReportTemplateBuilderModel = {
  id: string;
  name: string;
  description: string;
  scope: ReportTemplateScope;
  serviceSlug?: string;
  status: ReportTemplateStatus;
  pages: ReportTemplatePage[];
  updatedAt: string;
  previewCaseId?: string;

  documentType?: ReportDocumentType;
  designPreset?: ReportDesignPreset;
  workflowSlug?: string;
  subWorkflowKey?: string;
};

export type ReportTextSnippet = {
  id: string;
  title: string;
  category:
    | "مقدمة"
    | "هدف"
    | "إجراء"
    | "نتيجة"
    | "توصية"
    | "خاتمة";
  serviceSlug?: string;
  content: string;
};

export type ReportIdentitySettings = {
  ministryName: string;
  educationDepartment: string;
  educationOffice: string;
  schoolName: string;
  schoolLeaderName: string;
  counselorName: string;
  academicYear: string;
  semester: string;
  ministryLogoUrl: string;
  schoolLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: "Tajawal" | "Cairo" | "Arial";
};

export type ReportTemplateValidationIssue = {
  id: string;
  severity: "success" | "warning" | "error";
  title: string;
  description: string;
};

export type ReportTemplateValidationResult = {
  canPublish: boolean;
  score: number;
  issues: ReportTemplateValidationIssue[];
};

export const DEFAULT_REPORT_IDENTITY_SETTINGS: ReportIdentitySettings = {
  ministryName: "وزارة التعليم",
  educationDepartment: "الإدارة العامة للتعليم",
  educationOffice: "مكتب التعليم",
  schoolName: "اسم المدرسة",
  schoolLeaderName: "قائد/قائدة المدرسة",
  counselorName: "الموجه/الموجهة الطلابية",
  academicYear: "1447هـ",
  semester: "الفصل الدراسي الأول",
  ministryLogoUrl: "/sample/report-evidence/ministry-logo.png",
  schoolLogoUrl: "/sample/report-evidence/square-evidence-1.png",
  primaryColor: "#0f5132",
  secondaryColor: "#d9e7df",
  fontFamily: "Tajawal",
};

export const REPORT_WORKFLOW_FIELD_OPTIONS = [
  {
    key: "programTitle",
    label: "عنوان البرنامج",
    source: "caseValues" as const,
  },
  {
    key: "executionDate",
    label: "تاريخ التنفيذ",
    source: "caseValues" as const,
  },
  {
    key: "intro",
    label: "مقدمة التقرير",
    source: "caseValues" as const,
  },
  {
    key: "goals",
    label: "أهداف البرنامج",
    source: "caseValues" as const,
  },
  {
    key: "procedures",
    label: "إجراءات التنفيذ",
    source: "caseValues" as const,
  },
  {
    key: "results",
    label: "النتائج",
    source: "caseValues" as const,
  },
  {
    key: "recommendations",
    label: "التوصيات",
    source: "caseValues" as const,
  },
  {
    key: "targetGroup",
    label: "الفئة المستهدفة",
    source: "caseValues" as const,
  },
  {
    key: "guardianName",
    label: "اسم ولي الأمر",
    source: "caseValues" as const,
  },
  {
    key: "studentName",
    label: "اسم الطالب",
    source: "caseValues" as const,
  },
  {
    key: "studentClass",
    label: "الصف / الفصل",
    source: "caseValues" as const,
  },
  {
    key: "summonsDay",
    label: "يوم الحضور",
    source: "caseValues" as const,
  },
  {
    key: "summonsHijriDate",
    label: "تاريخ الحضور هجري",
    source: "caseValues" as const,
  },
  {
    key: "summonsTime",
    label: "ساعة الحضور",
    source: "caseValues" as const,
  },
  {
    key: "summonsPeriod",
    label: "الفترة",
    source: "caseValues" as const,
  },
  {
    key: "summonsReason",
    label: "سبب الاستدعاء",
    source: "caseValues" as const,
  },
];

export const REPORT_SERVICE_OPTIONS = [
  {
    slug: "guidance-programs",
    name: "البرامج الإرشادية",
  },
  {
    slug: "student-follow-up",
    name: "متابعة الطلاب",
  },
  {
    slug: "family-school-communication",
    name: "التواصل بين الأسرة والمدرسة",
  },
  {
    slug: "committees-meetings",
    name: "اللجان والاجتماعات",
  },
  {
    slug: "student-guidance-services",
    name: "الخدمات الإرشادية",
  },
];

export const REPORT_BLOCK_LIBRARY: ReportTemplateBlock[] = [
  {
    id: "block-identity-header",
    kind: "identity-header",
    title: "هوية المدرسة والهيدر",
    source: {
      source: "identity",
      label: "بيانات الهوية",
      description: "شعار الوزارة، شعار المدرسة، الإدارة، المكتب، واسم المدرسة.",
    },
    required: false,
    settings: {
      style: "plain",
    },
  },
  {
    id: "block-cover-title",
    kind: "cover-title",
    title: "عنوان الغلاف",
    source: {
      source: "caseEntry",
      label: "بيانات الحالة",
      description: "عنوان التقرير واسم الخدمة وتاريخ التنفيذ من CaseEntry.",
      fieldKey: "programTitle",
    },
    required: false,
    settings: {
      showTitle: true,
      style: "highlight",
    },
  },
  {
    id: "block-case-meta",
    kind: "case-meta",
    title: "بيانات التقرير",
    source: {
      source: "caseEntry",
      label: "ملخص الحالة",
      description: "تاريخ الإنشاء، الخدمة، الحالة، والفئة المستهدفة.",
    },
    required: false,
    settings: {
      columns: 2,
      style: "card",
    },
  },
  {
    id: "block-student-summary",
    kind: "student-summary",
    title: "بيانات الطالب/الطالبة",
    source: {
      source: "student",
      label: "بيانات نور",
      description:
        "اسم الطالب/الطالبة، الصف، الفصل، المرحلة، وولي الأمر عند توفره.",
    },
    required: false,
    settings: {
      columns: 2,
      style: "card",
    },
  },
  {
    id: "block-service-summary",
    kind: "service-summary",
    title: "ملخص الخدمة",
    source: {
      source: "service",
      label: "بيانات الخدمة",
      description: "اسم الخدمة ونوعها وربطها بالتقرير.",
    },
    required: false,
    settings: {
      style: "card",
    },
  },
  {
    id: "block-paragraph",
    kind: "paragraph",
    title: "فقرة من بيانات الحالة",
    source: {
      source: "caseValues",
      label: "حقول الخدمة",
      description:
        "مقدمة، وصف، إجراءات، نتائج، أو توصيات محفوظة داخل CaseValue.",
      fieldKey: "intro",
    },
    required: false,
    settings: {
      showTitle: true,
      style: "card",
    },
  },
  {
    id: "block-field-list",
    kind: "field-list",
    title: "قائمة حقول مختصرة",
    source: {
      source: "caseValues",
      label: "حقول مختارة",
      description: "عرض مجموعة حقول من الخدمة على شكل قائمة منظمة.",
      fieldKey: "goals",
    },
    required: false,
    settings: {
      columns: 2,
      style: "card",
    },
  },
  {
    id: "block-text-library",
    kind: "text-library",
    title: "نص جاهز من المكتبة",
    source: {
      source: "textLibrary",
      label: "مكتبة النصوص",
      description: "نص محفوظ مسبقًا مثل مقدمة، هدف، توصية، أو خاتمة.",
    },
    required: false,
    settings: {
      showTitle: true,
      style: "highlight",
    },
  },
  {
    id: "block-custom-paragraph",
    kind: "custom-paragraph",
    title: "فقرة مخصصة",
    customTitle: "عنوان الفقرة",
    customContent: "اكتب محتوى هذه الفقرة داخل القالب.",
    source: {
      source: "custom",
      label: "نص غير مرتبط",
      description:
        "عنوان ومحتوى يكتبه الأدمن داخل القالب ولا يعتمد على CaseValue.",
    },
    required: false,
    settings: {
      showTitle: true,
      style: "card",
    },
  },
  {
    id: "block-evidence-gallery",
    kind: "evidence-gallery",
    title: "الشواهد والمرفقات",
    source: {
      source: "evidence",
      label: "شواهد الحالة",
      description: "الصور والملفات المرتبطة بالحالة أو الخدمة.",
    },
    required: false,
    settings: {
      evidenceLayout: "grid-2x2",
      imageFit: "cover",
      showCaptions: true,
      itemsPerPage: 4,
    },
  },
  {
    id: "block-approval-signature",
    kind: "approval-signature",
    title: "الاعتماد والتوقيع",
    source: {
      source: "identity",
      label: "بيانات الاعتماد",
      description: "اسم الموجه/الموجهة، قائد/قائدة المدرسة، التاريخ، والتوقيع.",
    },
    required: false,
    settings: {
      style: "highlight",
    },
  },
];

export type GeneratedReportSnapshot = {
  id: string;
  templateId: string;
  templateName: string;
  templateStatus: ReportTemplateStatus;
  templateSnapshot: ReportTemplateBuilderModel;
  reportDataSnapshot: {
    previewCaseId?: string;
    generatedFrom: "sample" | "case";
    note: string;
  };
  generatedAt: string;
  generatedBy: string;
};
