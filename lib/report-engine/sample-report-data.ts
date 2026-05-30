import type {
  OfficialReportData,
  ReportIdentity,
} from "./report-types";

export const sampleReportIdentity: ReportIdentity = {
  ministryLogoUrl: "/sample/report-evidence/ministry-logo.png",
  schoolLogoUrl: "/sample/report-evidence/square-evidence-1.png",

  ministryName: "وزارة التعليم",
  educationDepartment: "الإدارة العامة للتعليم بمنطقة جازان",
  educationOffice: "مكتب التعليم بفيفاء",
  schoolName: "مدرسة الملك عبدالعزيز الثانوية",

  counselorName: "محمد الفيفي",
  counselorTitle: "الموجه الطلابي",

  academicYear: "1447هـ",
  semester: "الفصل الدراسي الأول",
};

export const sampleOfficialReportData: OfficialReportData = {
  title: "تقرير تنفيذ برنامج إرشادي",
  subtitle: "تعزيز السلوك الإيجابي داخل البيئة المدرسية",

  serviceName: "البرامج الإرشادية",
  category: "البرامج الإرشادية",
  reportDate: "19 / 05 / 2026م",
  targetGroup: "جميع الطلاب المستفيدين",

  cover: {
    programTitle: "تعزيز السلوك الإيجابي",
    executionDate: "19 / 05 / 2026م",
    schoolYear: "1447هـ",
    semester: "الفصل الدراسي الأول",
    shortDescription:
      "تم تنفيذ البرنامج بهدف تعزيز السلوك الإيجابي وترسيخ القيم التربوية داخل البيئة المدرسية، مع توثيق التنفيذ بالشواهد المناسبة.",
  },

  sections: [
    {
      id: "intro",
      title: "مقدمة التقرير",
      content:
        "تم تنفيذ برنامج إرشادي بعنوان تعزيز السلوك الإيجابي داخل البيئة المدرسية، وذلك ضمن البرامج التعزيزية الموجهة للطلاب، بهدف نشر السلوكيات الإيجابية وترسيخ القيم التربوية والسلوكية داخل المدرسة.",
    },
    {
      id: "goals",
      title: "أهداف البرنامج",
      items: [
        {
          label: "الهدف الأول",
          value: "تعزيز السلوكيات الإيجابية داخل البيئة المدرسية.",
        },
        {
          label: "الهدف الثاني",
          value: "رفع مستوى الانضباط المدرسي لدى الطلاب.",
        },
        {
          label: "الهدف الثالث",
          value: "تعزيز الشراكة بين الأسرة والمدرسة.",
        },
      ],
    },
    {
      id: "procedures",
      title: "إجراءات التنفيذ",
      content:
        "شملت إجراءات التنفيذ إعداد ونشر مواد إرشادية وتثقيفية، وإرسال نشرات توعوية لأولياء الأمور، ومتابعة أثر البرنامج على سلوك الطلاب داخل البيئة التعليمية.",
    },
    {
      id: "results",
      title: "النتائج والتوصيات",
      content:
        "أسهم البرنامج في رفع مستوى الوعي بأهمية السلوك الإيجابي، ويوصى باستمرار البرامج التعزيزية وربطها بالشواهد والتقارير الدورية.",
    },
  ],

  evidences: [
    {
      id: "activity-wide-1",
      title: "شاهد عرضي 1",
      description: "صورة عرضية مناسبة للأنشطة والبرامج.",
      imageUrl: "/sample/report-evidence/activity-wide-1.jpeg",
    },
    {
      id: "activity-wide-2",
      title: "شاهد عرضي 2",
      description: "صورة عرضية لاختبار شبكة الشواهد.",
      imageUrl: "/sample/report-evidence/activity-wide-2.jpeg",
    },
    {
      id: "activity-wide-3",
      title: "شاهد عرضي 3",
      description: "صورة عرضية إضافية.",
      imageUrl: "/sample/report-evidence/activity-wide-3.jpeg",
    },
    {
      id: "activity-wide-4",
      title: "شاهد عرضي 4",
      description: "صورة عرضية إضافية لاختبار 2×2.",
      imageUrl: "/sample/report-evidence/activity-wide-4.jpeg",
    },
    {
      id: "poster-vertical-1",
      title: "شاهد طولي 1",
      description: "صورة طولية لاختبار النشرات والبوسترات.",
      imageUrl: "/sample/report-evidence/poster-vertical-1.jpeg",
    },
    {
      id: "poster-vertical-2",
      title: "شاهد طولي 2",
      description: "صورة طولية لاختبار التخطيط الرأسي.",
      imageUrl: "/sample/report-evidence/poster-vertical-2.jpeg",
    },
    {
      id: "square-evidence-1",
      title: "شاهد مربع",
      description: "تصميم مربع لاختبار المنشورات.",
      imageUrl: "/sample/report-evidence/square-evidence-1.png",
    },
    {
      id: "document-a4-1",
      title: "شاهد وثيقة A4",
      description: "صورة طولية تشبه الوثائق أو الخطابات.",
      imageUrl: "/sample/report-evidence/document-a4-1.jpg",
    },
  ],

  evidenceLayout: "grid-2x2",

  approval: {
    counselorName: "محمد الفيفي",
    principalName: "قائد المدرسة",
    date: "19 / 05 / 2026م",
  },
};



