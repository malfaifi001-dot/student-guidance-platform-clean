import type { SurveyQuestionInputType } from "@/lib/surveys/survey-config";

export type SurveyTemplateQuestion = {
  label: string;
  type: SurveyQuestionInputType;
  sectionTitle?: string;
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
    key: "student-social-educational-health-profile",
    title: "استمارة بيانات الطالب/ة الاجتماعية والتعليمية والصحية",
    description:
      "ولي/ة الأمر الفاضل/ة:\nنأمل منكم تعبئة هذه الاستمارة بدقة ووضوح، حيث تهدف إلى دعم الطالب/ة تربويًا وصحيًا وتقديم الرعاية اللازمة له/ا. ونحيطكم علمًا بأن كافة المعلومات الواردة ستحاط بالسرية التامة، ولن يطلع عليها سوى الموجه/ة الطلابي/ة. شاكرين ومقدرين تعاونكم.",
    category: "guidance",
    audienceType: "GUARDIANS",
    isAnonymous: false,
    questions: [
      {
        sectionTitle: "البيانات الأساسية",
        label: "اسم الطالب / ة",
        type: "TEXT",
        isRequired: true,
      },
      { label: "الصف", type: "TEXT", isRequired: true },
      { label: "تاريخ الميلاد", type: "DATE", isRequired: true },
      { label: "السجل المدني", type: "TEXT" },
      {
        label: "الجنسية",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["سعودي", "غير سعودي"],
      },
      { label: "اسم ولي الأمر", type: "TEXT", isRequired: true },
      { label: "صلة القرابة", type: "TEXT", isRequired: true },
      { label: "عنوان السكن", type: "TEXTAREA", isRequired: true },
      { label: "رقم جوال ولي الأمر", type: "TEXT", isRequired: true },
      { label: "رقم إضافي للتواصل", type: "TEXT" },
      {
        sectionTitle: "المعلومات الاجتماعية والتعليمية",
        label: "هل الأب على قيد الحياة",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["نعم", "لا"],
      },
      {
        label: "هل الأم على قيد الحياة",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["نعم", "لا"],
      },
      {
        label: "الحالة الاجتماعية للوالدين",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["مستقران", "منفصلان"],
      },
      {
        label: "في حال انفصال الوالدين",
        type: "SINGLE_CHOICE",
        options: ["الأبناء يعيشون مع الأب", "الأبناء يعيشون مع الأم"],
      },
      { label: "عدد الإخوة والأخوات", type: "NUMBER" },
      {
        label: "ترتيب الطالب/ ة بين الإخوة والأخوات",
        type: "NUMBER",
        isRequired: true,
      },
      {
        label: "هل سبق للطالب الرسوب؟ إذا نعم اذكر عدد سنوات الرسوب",
        type: "TEXTAREA",
      },
      {
        label: "المستوى التعليمي للأب",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: [
          "يقرأ ويكتب",
          "الابتدائية",
          "المتوسطة",
          "الثانوية",
          "بكالوريوس",
          "الماجستير",
          "الدكتوراة",
        ],
      },
      {
        label: "المستوى التعليمي للأم",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: [
          "تقرأ وتكتب",
          "الابتدائية",
          "المتوسطة",
          "الثانوية",
          "بكالوريوس",
          "الماجستير",
          "الدكتوراة",
        ],
      },
      {
        label: "في حال كان أحد الوالدين متوفى، هل هو من منسوبي التعليم؟",
        type: "YES_NO",
      },
      {
        label: "للعسكريين: هل الأب من المرابطين في الحد الجنوبي؟",
        type: "YES_NO",
      },
      {
        sectionTitle: "المعلومات الاقتصادية",
        label: "مهنة الأب",
        type: "TEXT",
      },
      { label: "مهنة الأم", type: "TEXT", isRequired: true },
      {
        label: "دخل الأسرة",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: [
          "أقل من 4000 ريال",
          "من 4000 إلى 7000 ريال",
          "من 7000 إلى 10000 ريال",
          "أعلى من ذلك",
        ],
      },
      {
        label: "نوع السكن",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["فيلا", "دور", "شقة", "بيت شعبي"],
      },
      {
        label: "ملكية السكن",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["ملك", "إيجار", "هبة"],
      },
      {
        label: "هل يتم صرف الضمان الاجتماعي للأسرة",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["لا", "نعم"],
      },
      {
        sectionTitle: "المعلومات الصحية والنفسية",
        label:
          "هل يعاني الطالب من أي أمراض صحية أو نفسية؟ إذا كانت الإجابة بنعم اذكرها، ويرسل التقرير الطبي لإدارة المدرسة",
        type: "TEXTAREA",
        isRequired: true,
      },
      {
        sectionTitle: "تأكيد صحة البيانات",
        label:
          "أقر أنا ولي الأمر بأنني المسؤول عن تعبئة هذه الاستمارة، وأن جميع البيانات المدونة فيها صحيحة ودقيقة حسب علمي، وأتحمل كامل المسؤولية عن صحتها، وأتعهد بإبلاغ المدرسة عند حدوث أي تغيير على هذه البيانات",
        type: "SINGLE_CHOICE",
        isRequired: true,
        options: ["موافق"],
      },
    ],
  },
];

export function getSurveyTemplateByKey(key: string) {
  return surveyTemplates.find((template) => template.key === key) || null;
}
