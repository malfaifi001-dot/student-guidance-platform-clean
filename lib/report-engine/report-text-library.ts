import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

export type ReportTextTemplate = {
  id: string;
  title: string;
  description: string;
  narrativeTitle: string;
  body: string;
};

export type ReportTextTemplateCategory = {
  id: string;
  title: string;
  description: string;
  templates: ReportTextTemplate[];
};

export const REPORT_TEXT_LIBRARY: ReportTextTemplateCategory[] = [
  {
    id: "general",
    title: "نصوص عامة",
    description: "نصوص مختصرة تصلح لمعظم البرامج والأنشطة.",
    templates: [
      {
        id: "general-smart",
        title: "صيغة ذكية عامة",
        description: "مناسبة لمعظم تقارير النشاط.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ «{activityTitle}» ضمن مجال «{activityDomain}»، مستهدفًا «{targetGroup}»، من خلال «{executionMethod}» وبمشاركة «{beneficiaryCount}» مستفيدًا. واشتمل التنفيذ على أنشطة تفاعلية وتطبيقية مناسبة لطبيعة البرنامج، بما يسهم في تحقيق أهداف النشاط وتعزيز مشاركة المستفيدين. وتم توثيق التنفيذ بالشواهد المرفقة.",
      },
      {
        id: "general-short",
        title: "مختصر جدًا",
        description: "نص سريع ومباشر.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ «{activityTitle}» ضمن مجال «{activityDomain}»، مستهدفًا «{targetGroup}». واشتمل التنفيذ على أنشطة مناسبة لطبيعة البرنامج، بما يسهم في تحقيق أهداف النشاط وتعزيز مشاركة المستفيدين. وتم توثيق التنفيذ بالشواهد المرفقة.",
      },
      {
        id: "general-official",
        title: "صيغة رسمية",
        description: "مناسبة للتقارير النهائية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "نُفذ برنامج «{activityTitle}» وفق الخطة المعتمدة لمجال «{activityDomain}»، مستهدفًا «{targetGroup}». وقد تضمن التنفيذ إجراءات وأنشطة مناسبة لطبيعة البرنامج، أسهمت في تحقيق الأهداف المحددة وتعزيز تفاعل المستفيدين، مع توثيق التنفيذ بالشواهد اللازمة.",
      },
    ],
  },
  {
    id: "awareness",
    title: "برامج توعوية وإرشادية",
    description: "للتوعية، الإرشاد، المحاضرات، واللقاءات التوجيهية.",
    templates: [
      {
        id: "awareness-program",
        title: "برنامج توعوي",
        description: "مناسب للبرامج التثقيفية والتوعوية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ برنامج توعوي بعنوان «{activityTitle}» بهدف رفع الوعي لدى «{targetGroup}» حول موضوع البرنامج. تضمن التنفيذ عرضًا مبسطًا، ومناقشة تفاعلية، وتوجيهات عملية تساعد المستفيدين على فهم الموضوع وتطبيق السلوكيات الإيجابية المرتبطة به.",
      },
      {
        id: "guidance-meeting",
        title: "لقاء إرشادي",
        description: "مناسب للقاءات الطلابية والتوجيهية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ لقاء إرشادي بعنوان «{activityTitle}» استهدف «{targetGroup}»، وتناول أبرز الجوانب المرتبطة بالموضوع من خلال الحوار والمناقشة وتقديم التوجيهات المناسبة. وهدف اللقاء إلى دعم الطلاب وتعزيز السلوك الإيجابي لديهم.",
      },
      {
        id: "lecture",
        title: "محاضرة",
        description: "مناسب للمحاضرات والعروض المعرفية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ محاضرة بعنوان «{activityTitle}» بهدف تقديم معلومات منظمة حول موضوع البرنامج، وتضمنت عرضًا للمفاهيم الأساسية، وأمثلة توضيحية، وتوجيهات عملية تناسب احتياج الفئة المستهدفة.",
      },
    ],
  },
  {
    id: "skills",
    title: "ورش ومهارات",
    description: "للورش، التدريب، والبرامج المهارية.",
    templates: [
      {
        id: "workshop",
        title: "ورشة عمل",
        description: "مناسب للورش التطبيقية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ ورشة عمل بعنوان «{activityTitle}» بمشاركة «{targetGroup}»، وركزت على تنمية مهارات المشاركين من خلال الشرح العملي، والتطبيق المباشر، والمناقشة الجماعية. وقد ساعدت الورشة على تعزيز الفهم وتطبيق المهارة في مواقف واقعية.",
      },
      {
        id: "skills-program",
        title: "برنامج مهاري",
        description: "مناسب لتنمية المهارات.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ برنامج مهاري بعنوان «{activityTitle}» بهدف إكساب الطلاب مهارات عملية مرتبطة بطبيعة البرنامج. تضمن البرنامج تدريبًا تطبيقيًا ومشاركة مباشرة من الطلاب، بما يعزز قدرتهم على ممارسة المهارة بثقة وفاعلية.",
      },
      {
        id: "competition",
        title: "مسابقة أو تحدي",
        description: "للمسابقات والتحديات الطلابية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ مسابقة بعنوان «{activityTitle}» بهدف تحفيز الطلاب على المشاركة والتفاعل، وتعزيز روح التنافس الإيجابي. تضمنت المسابقة أسئلة أو مهامًا مناسبة لمستوى المشاركين، وأسهمت في تنمية المعرفة والمهارات المرتبطة بمجال النشاط.",
      },
    ],
  },
  {
    id: "activities",
    title: "أنشطة ومناسبات",
    description: "للأنشطة الثقافية والرياضية والكشفية والمناسبات.",
    templates: [
      {
        id: "culture-art",
        title: "نشاط ثقافي أو فني",
        description: "للأعمال الثقافية والفنية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ نشاط ثقافي/فني بعنوان «{activityTitle}» بهدف تنمية الذائقة الثقافية والإبداعية لدى الطلاب. وقد أتاح النشاط للمشاركين التعبير عن أفكارهم ومواهبهم من خلال أعمال أو مشاركات مناسبة لطبيعة النشاط.",
      },
      {
        id: "sports-health",
        title: "نشاط رياضي أو صحي",
        description: "للبرامج الرياضية والصحية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ نشاط رياضي/صحي بعنوان «{activityTitle}» بهدف تعزيز الوعي الصحي واللياقة البدنية لدى الطلاب. اشتمل النشاط على مشاركة عملية وتوجيهات مرتبطة بالصحة والسلامة، وأسهم في تعزيز السلوك الصحي الإيجابي.",
      },
      {
        id: "scouting",
        title: "نشاط كشفي",
        description: "للبرامج الكشفية.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ نشاط كشفي بعنوان «{activityTitle}» بهدف تنمية روح المسؤولية والعمل الجماعي والانضباط لدى الطلاب. تضمن النشاط ممارسات كشفية وتطبيقات عملية تساعد على بناء الشخصية وتعزيز قيم التعاون والخدمة.",
      },
      {
        id: "occasion",
        title: "مناسبة وطنية أو عالمية",
        description: "للأيام والمناسبات.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ فعالية «{activityTitle}» بهدف تعزيز الانتماء والقيم المرتبطة بالمناسبة لدى الطلاب. اشتملت الفعالية على مشاركات طلابية وأنشطة توعوية وتثقيفية مناسبة، وتم توثيق التنفيذ بالشواهد المرفقة.",
      },
      {
        id: "community-service",
        title: "خدمة مجتمعية",
        description: "للعمل التطوعي والمبادرات.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ برنامج خدمة مجتمعية بعنوان «{activityTitle}» بهدف تعزيز المسؤولية المجتمعية لدى الطلاب، وتنمية روح المبادرة والعمل التطوعي. تضمن البرنامج مشاركة عملية تخدم المجتمع المدرسي أو المحلي وفق أهداف النشاط.",
      },
    ],
  },
  {
    id: "assignment",
    title: "تكليفات المعلمين",
    description: "عند تنفيذ النشاط من معلم مكلف.",
    templates: [
      {
        id: "teacher-assignment",
        title: "تنفيذ معلم مكلف",
        description: "مناسب لتقرير رائد النشاط بعد اعتماد تكليف المعلم.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ النشاط من قبل «{executor}» بناءً على التكليف المعتمد، واشتمل التنفيذ على الإجراءات المحددة في خطة النشاط. وقد تم رفع الشواهد وتوثيق التنفيذ بما يوضح تحقق أهداف البرنامج ومشاركة المستفيدين.",
      },
      {
        id: "teacher-assignment-short",
        title: "تنفيذ معلم مكلف - مختصر",
        description: "صيغة مختصرة للتكليف.",
        narrativeTitle: "وصف التنفيذ",
        body:
          "تم تنفيذ «{activityTitle}» من قبل «{executor}» وفق التكليف المعتمد، وبما يتناسب مع أهداف النشاط والفئة المستهدفة. وتم توثيق التنفيذ بالشواهد المرفقة.",
      },
    ],
  },
];

function normalizeTemplateValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value.filter(Boolean).join("، ");
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return String(value);
}

export function getPayloadFieldText(payload: SmartReportPayload, keys: string[]) {
  for (const key of keys) {
    const field =
      payload.primaryFields.find((item) => item.key === key) ||
      payload.detailFields.find((item) => item.key === key);

    const value = field ? normalizeTemplateValue(field.value) : "";

    if (value) return value;
  }

  return "";
}

export function renderReportTextTemplate(
  template: ReportTextTemplate,
  payload: SmartReportPayload,
) {
  const values: Record<string, string> = {
    activityTitle: payload.title || payload.caseInfo.title || "اسم النشاط",
    activityDomain:
      getPayloadFieldText(payload, ["activity_domain"]) ||
      payload.service.name ||
      "المجال",
    targetGroup:
      getPayloadFieldText(payload, ["target_group"]) ||
      payload.student?.grade ||
      payload.student?.stage ||
      "الفئة المستهدفة",
    executionMethod:
      getPayloadFieldText(payload, ["execution_method", "execution_mode"]) ||
      "طريقة التنفيذ",
    beneficiaryCount:
      getPayloadFieldText(payload, [
        "beneficiary_count",
        "beneficiaries_count",
        "students_count",
        "student_count",
        "participant_students_count",
      ]) || "عدد",
    executor:
      getPayloadFieldText(payload, ["executor"]) ||
      payload.caseInfo.issuedBy ||
      "المعلم المنفذ",
  };

  return template.body.replace(/\{(\w+)\}/g, (_, key: string) => {
    return values[key] || "";
  });
}