export type SurveyRecommendationTone = "success" | "info" | "warning" | "danger";

export type SurveyRecommendation = {
  tone: SurveyRecommendationTone;
  title: string;
  description: string;
  priority: number;
};

type ChoiceOptionAnalysis = {
  label: string;
  count: number;
  percentage: number;
};

type QuestionAnalysisInput = {
  label: string;
  type: string;
  isRequired: boolean;
  answeredCount: number;
  emptyCount: number;
  answerRate: number;
  average: number | null;
  min: number | null;
  max: number | null;
  scaleMax?: number | null;
  optionCounts: ChoiceOptionAnalysis[];
};

type SurveyRecommendationInput = {
  totalResponses: number;
  totalQuestions: number;
  completionRate: number;
  questions: QuestionAnalysisInput[];
};

function isNumericType(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

function isChoiceType(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

function compactRecommendations(items: SurveyRecommendation[]) {
  const seen = new Set<string>();

  return items
    .filter((item) => {
      const key = `${item.tone}:${item.title}:${item.description}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((first, second) => second.priority - first.priority)
    .slice(0, 6);
}

export function buildSurveyRecommendations(input: SurveyRecommendationInput): SurveyRecommendation[] {
  const recommendations: SurveyRecommendation[] = [];

  if (input.totalResponses === 0) {
    recommendations.push({
      tone: "warning",
      title: "لا توجد ردود حتى الآن",
      description: "انشر رابط الاستبيان أو أعد مشاركته مع الفئة المستهدفة قبل اعتماد أي استنتاجات.",
      priority: 100,
    });

    return recommendations;
  }

  if (input.totalResponses < 5) {
    recommendations.push({
      tone: "warning",
      title: "حجم المشاركة محدود",
      description: "عدد الردود الحالي قليل، لذلك يفضل زيادة المشاركة قبل اتخاذ قرارات نهائية بناءً على النتائج.",
      priority: 95,
    });
  } else if (input.totalResponses >= 20) {
    recommendations.push({
      tone: "success",
      title: "حجم المشاركة جيد",
      description: "عدد الردود مناسب كبداية لاستخلاص مؤشرات عامة من نتائج الاستبيان.",
      priority: 55,
    });
  }

  if (input.completionRate >= 95) {
    recommendations.push({
      tone: "success",
      title: "اكتمال ممتاز للردود المطلوبة",
      description: `بلغت نسبة اكتمال الأسئلة المطلوبة ${input.completionRate}%، وهذا يعزز موثوقية التحليل.`,
      priority: 75,
    });
  } else if (input.completionRate < 70) {
    recommendations.push({
      tone: "danger",
      title: "اكتمال منخفض للأسئلة المطلوبة",
      description: `نسبة الاكتمال ${input.completionRate}%، راجع صياغة الأسئلة المطلوبة أو قلل عددها في النسخ القادمة.`,
      priority: 90,
    });
  } else if (input.completionRate < 90) {
    recommendations.push({
      tone: "warning",
      title: "توجد فرصة لتحسين اكتمال الردود",
      description: `نسبة الاكتمال ${input.completionRate}%، وقد يفيد تبسيط الأسئلة أو توضيح هدف الاستبيان للمستفيدين.`,
      priority: 70,
    });
  }

  const lowAnswerRateQuestions = input.questions
    .filter((question) => question.isRequired && question.answerRate < 80)
    .sort((first, second) => first.answerRate - second.answerRate);

  if (lowAnswerRateQuestions[0]) {
    recommendations.push({
      tone: "warning",
      title: "سؤال مطلوب يحتاج مراجعة",
      description: `السؤال "${lowAnswerRateQuestions[0].label}" لديه معدل إجابة ${lowAnswerRateQuestions[0].answerRate}%. راجع وضوح السؤال أو ضرورته.`,
      priority: 80,
    });
  }

  const numericQuestions = input.questions.filter(
    (question) => isNumericType(question.type) && question.average !== null,
  );

  for (const question of numericQuestions) {
    const maxValue = question.scaleMax && question.scaleMax > 0 ? question.scaleMax : question.max || 5;
    const ratio = question.average !== null && maxValue > 0 ? question.average / maxValue : null;

    if (ratio !== null && ratio < 0.6) {
      recommendations.push({
        tone: "danger",
        title: "مؤشر منخفض يحتاج معالجة",
        description: `متوسط السؤال "${question.label}" منخفض (${question.average}). يفضل تحويله إلى إجراء تحسين واضح.`,
        priority: 88,
      });
    } else if (ratio !== null && ratio >= 0.85) {
      recommendations.push({
        tone: "success",
        title: "مؤشر إيجابي مرتفع",
        description: `السؤال "${question.label}" حقق متوسطًا مرتفعًا (${question.average})، ويمكن اعتباره نقطة قوة.`,
        priority: 50,
      });
    }
  }

  const choiceQuestions = input.questions.filter(
    (question) => isChoiceType(question.type) && question.optionCounts.length > 0,
  );

  for (const question of choiceQuestions) {
    const topOption = [...question.optionCounts]
      .filter((option) => option.count > 0)
      .sort((first, second) => second.count - first.count)[0];

    if (topOption && topOption.percentage >= 60) {
      recommendations.push({
        tone: "info",
        title: "اتجاه واضح في أحد الخيارات",
        description: `في السؤال "${question.label}" كان الخيار الأبرز "${topOption.label}" بنسبة ${topOption.percentage}%.`,
        priority: 45,
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      tone: "info",
      title: "النتائج مستقرة مبدئيًا",
      description: "لا توجد مؤشرات حرجة في الردود الحالية. يمكن متابعة جمع الردود ومراجعة التحليل بعد زيادة المشاركة.",
      priority: 30,
    });
  }

  return compactRecommendations(recommendations);
}