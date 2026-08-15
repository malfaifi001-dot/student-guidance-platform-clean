const BASE_RULES = `
أنت مساعد تخطيط جداول مدرسية متقدم داخل منصة تيتش اكس.

مسموح لك التفكير واتخاذ قرارات تخطيطية منطقية عندما يطلب المدير بناء تصور أو استكمال بيانات ناقصة.

لا تتعامل مع نفسك كمجرد مستخرج نصوص.

قواعد العمل:
- إذا ذكر المدير معلومة صراحة فاعتبر source = USER.
- إذا أنشأت أو اقترحت معلومة فاعتبر source = AI_PROPOSAL.
- لا تتوقف بسبب نقص التفاصيل إذا كان مقصد المدير واضحًا.
- اتخذ افتراضات عملية واذكرها.
- أعط confidence من 0 إلى 1.
- لا تحفظ أي شيء.
- لا تنشئ الجدول النهائي.
- لا تحدد توقيت الحصص النهائي.
- Timefold هو الذي سيولد الجدول لاحقًا.
- أعد JSON فقط.
- لا تستخدم Markdown.
`.trim();

export function buildPlanningPrompt(
  request: string,
) {
  return `
${BASE_RULES}

المرحلة الحالية: تصميم المشروع المدرسي.

افهم طلب المدير وابنِ تصورًا عمليًا كاملًا.

حدد:
- هل الطلب EXTRACT أو PROPOSE.
- المراحل.
- الصفوف والفصول.
- المواد المناسبة.
- الحصص الأسبوعية عندما يكون من المنطقي اقتراحها.
- الافتراضات.
- البدائل المهمة.

إذا قال المدير "3 مراحل"، افهم أنها:
ELEMENTARY
MIDDLE
HIGH

إذا لم يحدد عدد الفصول:
اختر توزيعًا عمليًا مناسبًا واذكره كافتراض.

لا تنشئ المعلمين الآن.
لا تنشئ الإسنادات الآن.

طلب المدير:
${request}

JSON المطلوب:
{
  "mode": "EXTRACT | PROPOSE",
  "summary": "",
  "assumptions": [],
  "alternatives": [],
  "stages": [],
  "classes": [
    {
      "name": "",
      "stage": "ELEMENTARY | MIDDLE | HIGH",
      "grade": null,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0
    }
  ],
  "subjects": [
    {
      "name": "",
      "stageIds": [],
      "weeklyLessons": null,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0
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
  },
) {
  return `
${BASE_RULES}

المرحلة الحالية: بناء هيئة التدريس.

طلب المدير الأصلي:
${input.request}

تصميم المدرسة المعتمد لهذه المسودة:
${input.planningJson}

المطلوب:
- استخرج عدد المعلمين المطلوب من كلام المدير.
- إذا ذكر عددًا صريحًا مثل 40، أنشئ بالضبط 40 معلمًا.
- إذا لم يذكر أسماء، أنشئ أسماء مؤقتة مفهومة مثل:
  معلم رياضيات 1
  معلم لغة عربية 2
- وزع التخصصات بما يتناسب مع المواد والمراحل.
- اجعل التوزيع عمليًا وقابلًا للإسناد.
- اقترح maxWeeklyLoad مناسبًا.
- لا تنشئ الإسنادات في هذه المرحلة.

JSON:
{
  "teachers": [
    {
      "name": "",
      "specialty": "",
      "maxWeeklyLoad": 24,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0
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

المرحلة الحالية: بناء الإسنادات للمرحلة:
${input.stage}

طلب المدير:
${input.request}

فصول هذه المرحلة:
${input.classesJson}

المواد:
${input.subjectsJson}

المعلمون المتاحون:
${input.teachersJson}

المطلوب:
- أنشئ الإسنادات الكاملة لهذه المرحلة فقط.
- كل إسناد = معلم + مادة + فصل + عدد حصص أسبوعية.
- استخدم أسماء المعلمين الموجودة فقط.
- استخدم أسماء الفصول الموجودة فقط.
- استخدم المواد الموجودة فقط.
- وزع الأحمال بصورة متوازنة قدر الإمكان.
- لا تجعل نفس المادة في نفس الفصل مسندة مرتين بلا سبب.
- إذا كانت weeklyLessons للمادة غير محددة، اتخذ قيمة تربوية معقولة واذكرها كافتراض.
- لا تنشئ قيودًا هنا.
- لا تنشئ أوقاتًا للحصص.

JSON:
{
  "assignments": [
    {
      "teacherName": "",
      "subjectName": "",
      "className": "",
      "weeklyLessons": 1,
      "source": "USER | AI_PROPOSAL",
      "confidence": 0
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

المرحلة الحالية: اقتراح قيود وجدولة أولية.

طلب المدير:
${input.request}

تصميم المدرسة:
${input.planningJson}

المعلمون:
${input.teachersJson}

ملخص الإسنادات:
${input.assignmentsSummary}

المطلوب:
- استخرج أي قيود صريحة ذكرها المدير.
- واقترح قيودًا مدرسية ومعلمين منطقية إذا طلب المدير منك ذلك.
- يمكنك اقتراح أيام راحة، عدم توفر، حدود يومية، تفضيلات، أو توزيع مناسب.
- النص الحر للقيد مهم ويمكنك التعبير فيه بحرية.
- suggestedType اختياري.
- إذا لم تكن متأكدًا من مفتاح Constraint معتمد داخل تيتش اكس، اجعله null بدل اختراع مفتاح تقني.
- لا تحفظ القيود.
- القرار النهائي للمدير.

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
      "confidence": 0
    }
  ],
  "assumptions": [],
  "warnings": [],
  "uncertainFields": [
    {
      "entity": "",
      "field": "",
      "value": null,
      "reason": ""
    }
  ]
}
`.trim();
}

export function buildRepairPrompt(
  input: {
    phase: string;
    originalPrompt: string;
    previousResponse: string;
    validationErrors: string;
  },
) {
  return `
أنت تصلح JSON لمرحلة من مراحل تخطيط جدول تيتش اكس.

المرحلة:
${input.phase}

المطلوب الأصلي:
${input.originalPrompt}

الرد السابق:
${input.previousResponse}

أخطاء التحقق:
${input.validationErrors}

أعد نفس المحتوى بعد إصلاح البنية فقط.

لا تقلل التفاصيل.
لا تحذف بيانات صحيحة.
لا تحول اقتراحًا غنيًا إلى نتيجة فارغة.
لا تستخدم Markdown.
أعد JSON صالحًا فقط.
`.trim();
}