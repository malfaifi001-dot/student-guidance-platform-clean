import type { SurveyQuestionInputType } from "@/lib/surveys/survey-config";

export type SurveyTemplateQuestion = {
  label: string;
  type: SurveyQuestionInputType;
  isRequired?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
};

export type SurveyTemplate = {
  key: string;
  title: string;
  description: string;
  category: "guidance" | "activity" | "school";
  audienceType: string;
  isAnonymous: boolean;
  questions: SurveyTemplateQuestion[];
};

export const surveyTemplates: SurveyTemplate[] = [
  {
    key: "parents-school-services-satisfaction",
    title: "قياس رضا أولياء الأمور عن الخدمات المدرسية",
    description: "استبيان لقياس رضا أولياء الأمور عن التواصل والخدمات المقدمة وفرص التحسين.",
    category: "school",
    audienceType: "PARENTS",
    isAnonymous: false,
    questions: [
      {
        label: "ما مدى رضاك عن الخدمة المقدمة؟",
        type: "SCALE",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "قيّم سرعة تجاوب المدرسة مع استفساراتك.",
        type: "RATING",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل تم التواصل معك بوضوح عند وجود ملاحظة تخص الطالب؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "ما وسيلة التواصل الأكثر مناسبة لك؟",
        type: "MULTIPLE_CHOICE",
        options: ["واتساب", "اتصال هاتفي", "رسالة نصية", "البريد الإلكتروني"],
      },
      {
        label: "ما الجوانب التي ترغب في تحسينها؟",
        type: "MULTIPLE_CHOICE",
        options: ["سرعة الرد", "وضوح الرسائل", "توقيت التواصل", "متابعة الملاحظات", "تنوع قنوات التواصل"],
      },
      {
        label: "اكتب مقترحًا لتحسين الخدمات المدرسية.",
        type: "TEXTAREA",
      },
    ],
  },
  {
    key: "students-guidance-needs",
    title: "قياس الاحتياج الإرشادي للطلاب",
    description: "استبيان يساعد الموجه الطلابي على تحديد الاحتياجات الإرشادية الأكثر أولوية.",
    category: "guidance",
    audienceType: "STUDENTS",
    isAnonymous: true,
    questions: [
      {
        label: "ما المجال الذي تحتاج فيه دعمًا أكبر؟",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["الدراسي", "النفسي", "الاجتماعي", "السلوكي", "المهني"],
      },
      {
        label: "ما مستوى شعورك بالارتياح داخل المدرسة؟",
        type: "SCALE",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل تعرف كيف تطلب المساعدة من الموجه الطلابي؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "ما أكثر موضوع ترغب أن تقدم المدرسة عنه برنامجًا إرشاديًا؟",
        type: "MULTIPLE_CHOICE",
        options: ["تنظيم الوقت", "القلق والاختبارات", "العلاقات مع الزملاء", "التحفيز الدراسي", "اختيار المسار"],
      },
      {
        label: "اكتب ملاحظة أو احتياجًا ترغب بإيصاله.",
        type: "TEXTAREA",
      },
    ],
  },
  {
    key: "guidance-program-impact",
    title: "قياس أثر برنامج إرشادي",
    description: "استبيان بعد تنفيذ البرنامج لقياس الأثر والفائدة والتحسينات المقترحة.",
    category: "guidance",
    audienceType: "STUDENTS",
    isAnonymous: true,
    questions: [
      {
        label: "ما مدى استفادتك من البرنامج؟",
        type: "RATING",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل ساعدك البرنامج على فهم الموضوع بشكل أفضل؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "قيّم وضوح محتوى البرنامج.",
        type: "SCALE",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "ما أكثر جانب كان مفيدًا؟",
        type: "MULTIPLE_CHOICE",
        options: ["المعلومات", "الأمثلة", "الأنشطة", "النقاش", "التطبيق العملي"],
      },
      {
        label: "ما اقتراحك لتطوير البرنامج؟",
        type: "TEXTAREA",
      },
    ],
  },
  {
    key: "activity-program-evaluation",
    title: "تقييم برنامج أو نشاط مدرسي",
    description: "استبيان لرائد النشاط لقياس رضا المشاركين عن البرنامج أو النشاط.",
    category: "activity",
    audienceType: "STUDENTS",
    isAnonymous: true,
    questions: [
      {
        label: "ما مدى رضاك عن البرنامج أو النشاط؟",
        type: "RATING",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل كان النشاط منظمًا وواضحًا؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "ما أكثر جانب أعجبك في النشاط؟",
        type: "MULTIPLE_CHOICE",
        options: ["الفكرة", "التنظيم", "المشاركة", "المكان", "الوقت", "التفاعل"],
      },
      {
        label: "هل ترغب بتكرار النشاط مستقبلًا؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "اكتب مقترحك لتطوير النشاط.",
        type: "TEXTAREA",
      },
    ],
  },
  {
    key: "teachers-school-services-feedback",
    title: "استطلاع آراء المعلمين حول الخدمات المدرسية",
    description: "استبيان لجمع ملاحظات المعلمين حول جودة الخدمات والتنظيم الداخلي.",
    category: "school",
    audienceType: "TEACHERS",
    isAnonymous: false,
    questions: [
      {
        label: "قيّم مستوى التنظيم العام داخل المدرسة.",
        type: "RATING",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل قنوات التواصل الداخلي واضحة؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "ما المجالات الأكثر حاجة للتحسين؟",
        type: "MULTIPLE_CHOICE",
        options: ["التواصل", "توزيع المهام", "الجداول", "المتابعة", "الدعم التقني", "بيئة العمل"],
      },
      {
        label: "ما الخدمة التي ترى أنها مميزة حاليًا؟",
        type: "TEXT",
      },
      {
        label: "اكتب مقترحًا لتحسين العمل المدرسي.",
        type: "TEXTAREA",
      },
    ],
  },
  {
    key: "general-event-feedback",
    title: "تقييم فعالية أو مناسبة مدرسية",
    description: "قالب عام لقياس جودة فعالية أو مناسبة مدرسية بعد التنفيذ.",
    category: "activity",
    audienceType: "GENERAL",
    isAnonymous: true,
    questions: [
      {
        label: "ما مدى رضاك عن الفعالية؟",
        type: "RATING",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "هل كان وقت الفعالية مناسبًا؟",
        type: "YES_NO",
        isRequired: true,
      },
      {
        label: "قيّم وضوح التنظيم.",
        type: "SCALE",
        isRequired: true,
        scaleMin: 1,
        scaleMax: 5,
      },
      {
        label: "ما أكثر عنصر أعجبك؟",
        type: "MULTIPLE_CHOICE",
        options: ["الفكرة", "التنظيم", "المحتوى", "التفاعل", "الإخراج", "المشاركة"],
      },
      {
        label: "ملاحظات أو مقترحات إضافية.",
        type: "TEXTAREA",
      },
    ],
  },
];

export function getSurveyTemplateByKey(key: string) {
  return surveyTemplates.find((template) => template.key === key) || null;
}