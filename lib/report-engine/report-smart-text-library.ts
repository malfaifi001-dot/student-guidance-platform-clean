export type SmartTextVariableMap = Record<string, string>;

export type SmartTextVariableDefinition = {
  key: string;
  label: string;
  description: string;
  example: string;
};

export type SmartTextTemplate = {
  id: string;
  title: string;
  body: string;
  when?: (variables: SmartTextVariableMap) => boolean;
};

export type SmartTextTemplateSet = {
  id: string;
  name: string;
  description: string;
  serviceSlug?: string;
  serviceNameIncludes?: string[];
  sections: SmartTextTemplate[];
};

export const SMART_TEXT_VARIABLES: SmartTextVariableDefinition[] = [
  {
    key: "serviceName",
    label: "اسم الخدمة",
    description: "اسم الخدمة الإرشادية التي صدر منها التقارير.",
    example: "برامج التوجيه الطلابي",
  },
  {
    key: "reportTitle",
    label: "عنوان التقارير",
    description: "العنوان المحفوظ للتقرير.",
    example: "تقرير برنامج تعزيز السلوك الإيجابي",
  },
  {
    key: "programTitle",
    label: "عنوان البرنامج",
    description: "اسم البرنامج أو النشاط من بيانات الحالة.",
    example: "برنامج تعزيز السلوك الإيجابي",
  },
  {
    key: "executionDate",
    label: "تاريخ التنفيذ",
    description: "تاريخ تنفيذ البرنامج أو تاريخ التقارير عند عدم توفره.",
    example: "2026-05-26",
  },
  {
    key: "dayText",
    label: "اليوم بصيغة نصية",
    description: "نص اليوم جاهز للدمج داخل الجملة.",
    example: "، الموافق يوم الأحد",
  },
  {
    key: "targetGroup",
    label: "الفئة المستهدفة",
    description: "الفئة أو الطلاب المستهدفون من البرنامج.",
    example: "طلاب الصفوف الأولية",
  },
  {
    key: "semesterWeekText",
    label: "الفصل والأسبوع",
    description: "يجمع الفصل الدراسي والأسبوع في نص واحد.",
    example: "الفصل الدراسي الأول، الأسبوع 1",
  },
  {
    key: "executionAction",
    label: "الإجراء التنفيذي",
    description: "الإجراء المرتبط بالبرنامج.",
    example: "حملة تعريفية بالسلوك الإيجابي",
  },
  {
    key: "executionMechanism",
    label: "آلية التنفيذ",
    description: "طريقة تنفيذ الإجراء.",
    example: "إذاعة مدرسية ولوحات إرشادية ونقاشات صفية",
  },
  {
    key: "performanceIndicator",
    label: "مؤشر قياس الأداء",
    description: "المؤشر المستخدم لقياس أثر البرنامج.",
    example: "تحسن مستوى الالتزام بالسلوك الإيجابي",
  },
  {
    key: "evidenceSuggestion",
    label: "الشواهد",
    description: "الشواهد المقترحة أو المستخدمة في التقارير.",
    example: "صور البرنامج، كشف الحضور، نموذج التقييم",
  },
  {
    key: "evidenceCountText",
    label: "عدد الشواهد",
    description: "عدد الشواهد بصياغة عربية مناسبة.",
    example: "4 شواهد",
  },
];

export const GUIDANCE_PROGRAM_TEXT_LIBRARY: SmartTextTemplateSet = {
  id: "guidance-programs",
  name: "برامج التوجيه الطلابي",
  description:
    "نصوص رسمية مخصصة لتقارير برامج التوجيه الطلابي والأنشطة ذات الشواهد.",
  serviceNameIncludes: [
    "برامج التوجيه الطلابي",
    "البرامج الإرشادية",
    "برنامج إرشادي",
    "guidance",
  ],
  sections: [
    {
      id: "smart-intro",
      title: "وصف التقارير",
      body:
        'تم إعداد هذا التقارير لتوثيق تنفيذ برنامج إرشادي بعنوان "{programTitle}" ضمن خدمة {serviceName}. وقد تم تنفيذ البرنامج بتاريخ {executionDate}{dayText}، مستهدفًا {targetGroup}. ويأتي هذا البرنامج ضمن {semesterWeekText}.',
    },
    {
      id: "smart-purpose",
      title: "هدف البرنامج",
      body:
        "يهدف البرنامج إلى دعم الجوانب النمائية والوقائية لدى الفئة المستهدفة، وتعزيز السلوكيات الإيجابية، ورفع مستوى الوعي لدى الطلاب/الطالبات بما يتوافق مع أهداف التوجيه الطلابي وخطة المدرسة.",
    },
    {
      id: "smart-execution",
      title: "ملخص التنفيذ",
      body:
        'تم تنفيذ البرنامج من خلال الإجراء التالي: "{executionAction}". وتمت آلية التنفيذ عبر "{executionMechanism}".',
    },
    {
      id: "smart-indicator",
      title: "مؤشر قياس الأداء",
      body:
        'تم اعتماد مؤشر قياس الأداء التالي لمتابعة أثر التنفيذ: "{performanceIndicator}". ويساعد هذا المؤشر في تقييم مدى تحقق الهدف الإرشادي ورصد جوانب التحسين.',
      when: (variables) => Boolean(variables.performanceIndicator),
    },
    {
      id: "smart-evidence",
      title: "توثيق الشواهد",
      body:
        'تم توثيق تنفيذ البرنامج من خلال الشواهد والمرفقات المرتبطة بالحالة. وتشمل الشواهد المقترحة أو المستخدمة: "{evidenceSuggestion}". ويبلغ عدد الشواهد المرفقة في التقارير {evidenceCountText}.',
    },
    {
      id: "smart-recommendation",
      title: "توصية ختامية",
      body:
        "يوصى بالاستفادة من نتائج هذا البرنامج في متابعة أثره على الفئة المستهدفة، وتوثيق الملاحظات التطويرية، وربط الشواهد بنتائج التنفيذ بما يساعد على تحسين جودة برامج التوجيه الطلابي القادمة.",
    },
  ],
};

export const GENERAL_REPORT_TEXT_LIBRARY: SmartTextTemplateSet = {
  id: "general",
  name: "قالب عام",
  description:
    "نصوص عامة تستخدم مع أي خدمة لا تمتلك قالب نصوص مخصصًا حتى الآن.",
  sections: [
    {
      id: "smart-general-intro",
      title: "وصف التقارير",
      body:
        'تم إعداد هذا التقارير لتوثيق حالة مرتبطة بخدمة {serviceName} بعنوان "{programTitle}". وقد تم إعداد التقارير بتاريخ {executionDate}، مستهدفًا {targetGroup}.',
    },
    {
      id: "smart-general-summary",
      title: "ملخص الحالة",
      body:
        "يعرض هذا التقارير البيانات الأساسية المرتبطة بالحالة، وما تم توثيقه من إجراءات وملاحظات وشواهد، بهدف دعم المتابعة واتخاذ القرار المناسب.",
    },
    {
      id: "smart-general-evidence",
      title: "الشواهد والمرفقات",
      body:
        "تم ربط التقارير بالشواهد المتاحة في الحالة، ويبلغ عدد الشواهد المرفقة {evidenceCountText}.",
    },
    {
      id: "smart-general-recommendation",
      title: "توصية ختامية",
      body:
        "يوصى بمراجعة بيانات الحالة والشواهد المرتبطة بها، واستكمال أي إجراءات متابعة لازمة وفق ما تقتضيه طبيعة الخدمة.",
    },
  ],
};

export const SMART_TEXT_LIBRARIES: SmartTextTemplateSet[] = [
  GUIDANCE_PROGRAM_TEXT_LIBRARY,
  GENERAL_REPORT_TEXT_LIBRARY,
];

export function resolveSmartTextTemplateSet(serviceName: string) {
  const normalizedServiceName = normalizeSearchText(serviceName);

  const matched = SMART_TEXT_LIBRARIES.find((library) => {
    if (!library.serviceNameIncludes?.length) {
      return false;
    }

    return library.serviceNameIncludes.some((keyword) => {
      return normalizedServiceName.includes(normalizeSearchText(keyword));
    });
  });

  return matched || GENERAL_REPORT_TEXT_LIBRARY;
}

export function renderSmartTemplate(
  template: string,
  variables: SmartTextVariableMap
) {
  return template.replace(/\{([^}]+)\}/g, (_, variableName: string) => {
    return variables[variableName] ?? "";
  });
}

export function createSampleSmartTextVariables(): SmartTextVariableMap {
  return {
    serviceName: "برامج التوجيه الطلابي",
    reportTitle: "تقرير برنامج تعزيز السلوك الإيجابي",
    programTitle: "برنامج تعزيز السلوك الإيجابي",
    executionDate: "2026-05-26",
    dayText: "، الموافق يوم الأحد",
    targetGroup: "طلاب الصفوف الأولية",
    semesterWeekText: "الفصل الدراسي الأول، الأسبوع 1",
    executionAction: "حملة تعريفية بالسلوك الإيجابي",
    executionMechanism: "إذاعة مدرسية ولوحات إرشادية ونقاشات صفية",
    performanceIndicator: "تحسن مستوى الالتزام بالسلوك الإيجابي",
    evidenceSuggestion: "صور البرنامج، كشف الحضور، نموذج التقييم",
    evidenceCountText: "4 شواهد",
  };
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
