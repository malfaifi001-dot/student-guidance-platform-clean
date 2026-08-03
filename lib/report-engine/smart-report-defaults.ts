import type {
  SmartReportPayload,
  SmartReportType,
} from "@/lib/report-engine/smart-report-types";

export const smartReportTypeLabels: Record<SmartReportType, string> = {
  GENERAL_CASE_REPORT: "تقرير حالة عام",
  ACTIVITY_REPORT: "تقرير نشاط",
  MEETING_REPORT: "تقرير اجتماع",
  FAMILY_COMMUNICATION_REPORT: "تقرير تواصل الأسرة والمدرسة",
  STUDENT_FOLLOWUP_REPORT: "تقرير متابعة طالب",
  EVIDENCE_REPORT: "تقرير شواهد",
  SUMMARY_REPORT: "تقرير مختصر",
};

export const smartReportTypeDescriptions: Record<SmartReportType, string> = {
  GENERAL_CASE_REPORT: "يناسب الحالات العامة والخدمات التي لا تحتاج قالبًا خاصًا.",
  ACTIVITY_REPORT: "يناسب برامج النشاط وبطاقات التنفيذ والشواهد والتوقيعات.",
  MEETING_REPORT: "يناسب اللجان والاجتماعات ومحاضر التوصيات.",
  FAMILY_COMMUNICATION_REPORT: "يناسب توثيق التواصل مع ولي الأمر ونتائجه.",
  STUDENT_FOLLOWUP_REPORT: "يناسب متابعة الطلبة والمواقف اليومية الطارئة والإجراءات والنتائج.",
  EVIDENCE_REPORT: "يركز على عرض الشواهد والمرفقات بطريقة منظمة.",
  SUMMARY_REPORT: "تقرير مختصر يصلح للأرشفة والطباعة السريعة.",
};

export const defaultSmartReportPayload: SmartReportPayload = {
  reportType: "ACTIVITY_REPORT",
  languageMode: "MALE",
  title: "التطوع الطلابي",
  identity: {
    ministryName: "وزارة التعليم",
    educationDepartment: "الإدارة العامة للتعليم",
    educationOffice: "مكتب التعليم",
    schoolName: "مدرسة عنوان المتوسطة والثانوية",
    schoolLogoUrl: "/uploads/school-logos/MOE.png",
    academicYear: "1447",
    currentSemester: "الفصل الدراسي الثاني",
  },
  caseInfo: {
    id: "CASE-ID",
    title: "التطوع الطلابي",
    status: "جاهز",
    createdAt: "2026-06-17",
    issuedAt: "2026-06-17",
    issuedBy: "عادل الفيفي",
  },
  service: {
    slug: "activity-programs-citizenship-life",
    name: "المواطنة والحياة",
  },
  student: null,
  primaryFields: [
    {
      key: "execution_date",
      label: "تاريخ التنفيذ / اليوم",
      value: "2026-06-17 - الإثنين",
      importance: "PRIMARY",
    },
    {
      key: "semester",
      label: "الفصل الدراسي",
      value: "الفصل الدراسي الثاني",
      importance: "PRIMARY",
    },
    {
      key: "executor",
      label: "المعلم المنفذ",
      value: "عادل الفيفي",
      importance: "PRIMARY",
    },
    {
      key: "target_group",
      label: "الفئة المستهدفة",
      value: "ثالث ثانوي",
      importance: "PRIMARY",
    },
    {
      key: "execution_method",
      label: "طريقة التنفيذ",
      value: "ينفذه رائد النشاط",
      importance: "PRIMARY",
    },
    {
      key: "week",
      label: "الأسبوع",
      value: "5",
      importance: "PRIMARY",
    },
  ],
  detailFields: [],
  narrative: {
    title: "وصف التنفيذ",
    body:
      "تم تنفيذ برنامج النشاط الطلابي «التطوع الطلابي»، ضمن مجال المواطنة والحياة. ونُفذ البرنامج خلال الفصل الدراسي الثاني، وتولى التنفيذ المعلم المنفذ عادل الفيفي. وكان تاريخ التنفيذ 2026-06-17. واستهدف البرنامج ثالث ثانوي. وجرى التنفيذ وفق آلية: ينفذه رائد النشاط. وتم توثيق النشاط من خلال 4 شواهد/مرفقات محفوظة في الحالة.",
  },
  evidence: {
    layout: "GRID_2X2",
    items: [
      {
        id: "evidence-1",
        title: "شاهد 1",
        caption: "صورة من تنفيذ النشاط",
        type: "IMAGE",
      },
      {
        id: "evidence-2",
        title: "شاهد 2",
        caption: "صورة من تنفيذ النشاط",
        type: "IMAGE",
      },
      {
        id: "evidence-3",
        title: "شاهد 3",
        caption: "صورة من تنفيذ النشاط",
        type: "IMAGE",
      },
      {
        id: "evidence-4",
        title: "شاهد 4",
        caption: "صورة من تنفيذ النشاط",
        type: "IMAGE",
      },
    ],
  },
  signatures: [
    {
      key: "principal",
      label: "مدير المدرسة",
      signerName: "مسعود السعيدي",
      signerTitle: "مدير المدرسة",
      required: false,
    },
    {
      key: "activity_leader",
      label: "رائد النشاط",
      signerName: "عادل الفيفي",
      signerTitle: "رائد النشاط",
      required: true,
    },
    {
      key: "teacher",
      label: "توقيع المعلم المنفذ",
      signerName: "عادل الفيفي",
      signerTitle: "المعلم المنفذ",
      required: true,
    },
  ],
  readiness: {
    status: "READY",
    percentage: 100,
    missingItems: [],
    notes: [],
  },
};
