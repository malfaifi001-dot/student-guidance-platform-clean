import {
  buildTimetableAiImportLanguageInstruction,
  detectTimetableAiImportLanguage,
  type TimetableAiImportLanguage,
} from "./language";

const BASE_RULES = `
أنت مساعد تخطيط جداول مدرسية داخل منصة تيتش اكس.

مهمتك تجهيز مسودة بيانات منظمة وقابلة للمراجعة قبل إنشاء الجدول.

مسموح لك اتخاذ قرارات منطقية واقتراح بيانات ناقصة عندما يكون وضع الطلب PROPOSE.

ممنوع:
- حفظ أي بيانات.
- إنشاء الجدول النهائي.
- تحديد أوقات الجدول النهائي.
- استدعاء محرك إنشاء الجدول.
- اختراع كيانات غير موجودة في البيانات التي أعطيت لك في المرحلة الحالية.

قواعد الإخراج:
- JSON صالح فقط.
- لا Markdown.
- لا شرح خارج JSON.
- استخدم المراحل الداخلية فقط:
  ELEMENTARY
  MIDDLE
  HIGH
- source:
  USER للمعلومة الصريحة من المدير.
  AI_PROPOSAL للمعلومة المقترحة.
- confidence رقم من 0 إلى 1.
`.trim();

function languageInstruction(request: string) {
  return buildTimetableAiImportLanguageInstruction(
    detectTimetableAiImportLanguage(request),
  );
}

export function buildPlanningPrompt(
  input: {
    request: string;
    expectedTeacherCount: number | null;
    expectedClassCount: number | null;
    expectedStageCount: number | null;
  },
) {
  return `
${BASE_RULES}

${languageInstruction(input.request)}

المرحلة: PLANNING

طلب المدير:
${input.request}

مؤشرات رقمية مستخرجة من طلب المدير:
expectedTeacherCount=${input.expectedTeacherCount ?? "unknown"}
expectedClassCount=${input.expectedClassCount ?? "unknown"}
expectedStageCount=${input.expectedStageCount ?? "unknown"}

ابنِ:
- mode
- summary
- stages
- classes
- subjects
- assumptions
- alternatives
- warnings

إذا طلب المدير 3 مراحل فالمقصود:
ELEMENTARY
MIDDLE
HIGH

إذا ذكر عدد الفصول صراحة:
أنشئ بالضبط هذا العدد.

لا تنشئ المعلمين هنا.
لا تنشئ الإسنادات هنا.

JSON:
{
  "mode": "EXTRACT | PROPOSE",
  "summary": "",
  "assumptions": [],
  "alternatives": [],
  "stages": [],
  "classes": [
    {
      "name": "",
      "stage": "ELEMENTARY",
      "grade": null,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0.9
    }
  ],
  "subjects": [
    {
      "name": "",
      "stageIds": ["ELEMENTARY"],
      "weeklyLessons": 5,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0.9
    }
  ],
  "warnings": []
}
`.trim();
}

export function buildTeachersPrompt(
  input: {
    request: string;
    planningJson: string;
    expectedTeacherCount: number | null;
  },
) {
  return `
${BASE_RULES}

${languageInstruction(input.request)}

المرحلة: TEACHERS

طلب المدير:
${input.request}

تصميم المدرسة:
${input.planningJson}

عدد المعلمين المطلوب صراحة:
${input.expectedTeacherCount ?? "غير محدد"}

إذا كان العدد محددًا:
أنشئ بالضبط هذا العدد.

إذا لم توجد أسماء:
استخدم أسماء مؤقتة عربية واضحة مثل:
معلم رياضيات 1
معلم لغة عربية 2

وزع التخصصات حسب المواد والمراحل بصورة عملية ومتوازنة.

JSON:
{
  "teachers": [
    {
      "name": "",
      "specialty": "",
      "maxWeeklyLoad": 24,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0.9
    }
  ],
  "assumptions": [],
  "warnings": []
}
`.trim();
}

export function buildAssignmentsPrompt(
  input: {
    request: string;
    stage: string;
    classesJson: string;
    subjectsJson: string;
    teachersJson: string;
  },
) {
  return `
${BASE_RULES}

${languageInstruction(input.request)}

المرحلة: ASSIGNMENTS_${input.stage}

طلب المدير:
${input.request}

فصول المرحلة:
${input.classesJson}

مواد المرحلة:
${input.subjectsJson}

المعلمون المتاحون:
${input.teachersJson}

أنشئ إسنادات لهذه المرحلة فقط.

قواعد إلزامية:
- استخدم أسماء المعلمين الموجودة فقط.
- استخدم الفصول الموجودة فقط.
- استخدم المواد الموجودة فقط.
- كل إسناد = معلم + مادة + فصل + عدد حصص أسبوعية.
- لا تكرر نفس المادة داخل نفس الفصل بلا سبب.
- راع تخصص المعلم قدر الإمكان.
- راع maxWeeklyLoad قدر الإمكان.
- لا تحدد أوقات الحصص.

JSON:
{
  "assignments": [
    {
      "teacherName": "",
      "subjectName": "",
      "className": "",
      "weeklyLessons": 5,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0.9
    }
  ],
  "assumptions": [],
  "warnings": []
}
`.trim();
}

export function buildConstraintsPrompt(
  input: {
    request: string;
    planningJson: string;
    teachersJson: string;
    assignmentsSummary: string;
  },
) {
  return `
${BASE_RULES}

${languageInstruction(input.request)}

المرحلة: CONSTRAINTS

طلب المدير:
${input.request}

تصميم المدرسة:
${input.planningJson}

المعلمون:
${input.teachersJson}

ملخص الإسنادات:
${input.assignmentsSummary}

استخرج القيود الصريحة أولًا.
إذا طلب المدير اقتراح قيود، اقترح قيودًا عملية باعتدال.

لا تخترع suggestedType تقني غير معروف.
إذا لم تكن متأكدًا اجعله null.

JSON:
{
  "constraintCandidates": [
    {
      "text": "",
      "teacherName": null,
      "subjectName": null,
      "className": null,
      "suggestedType": null,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0.8
    }
  ],
  "assumptions": [],
  "warnings": [],
  "uncertainFields": []
}
`.trim();
}

export function buildRepairPrompt(
  input: {
    phase: string;
    language: TimetableAiImportLanguage;
    originalPrompt: string;
    previousResponse: string;
    validationErrors: string;
  },
) {
  return `
${buildTimetableAiImportLanguageInstruction(input.language)}

أصلح JSON لمرحلة ${input.phase}.

التعليمات الأصلية:
${input.originalPrompt}

الرد السابق:
${input.previousResponse.slice(0, 16000)}

أخطاء التحقق:
${input.validationErrors}

أعد JSON كاملًا وصالحًا فقط.

لا تستخدم Markdown.
لا تكتب شرحًا.
لا تحذف البيانات الصحيحة.
التزم بالقيم الداخلية للمراحل:
ELEMENTARY
MIDDLE
HIGH
`.trim();
}
