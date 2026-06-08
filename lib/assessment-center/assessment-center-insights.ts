import type {
  AssessmentAnalysisSummary,
  AssessmentGroupSummary,
  AssessmentSubjectSummary,
} from "./assessment-center-types";

type InterventionSuggestion = {
  title: string;
  description: string;
  target: "student" | "classroom" | "subject" | "group";
  futureAction: string;
};

function getWeakestSubject(
  subjects: AssessmentSubjectSummary[] | undefined
): AssessmentSubjectSummary | null {
  if (!subjects?.length) return null;

  return [...subjects].sort(
    (a, b) => a.averagePercentage - b.averagePercentage
  )[0];
}

function getStrongestSubject(
  subjects: AssessmentSubjectSummary[] | undefined
): AssessmentSubjectSummary | null {
  if (!subjects?.length) return null;

  return [...subjects].sort(
    (a, b) => b.averagePercentage - a.averagePercentage
  )[0];
}

function getWeakestGroup(
  groups: AssessmentGroupSummary[] | undefined
): AssessmentGroupSummary | null {
  if (!groups?.length) return null;

  return [...groups].sort(
    (a, b) => a.averagePercentage - b.averagePercentage
  )[0];
}

export function buildAssessmentSmartNarrative(
  summary: AssessmentAnalysisSummary | null
): {
  insights: string[];
  recommendations: string[];
  interventions: InterventionSuggestion[];
} {
  if (!summary) {
    return {
      insights: [
        "لا توجد بيانات تحليل كافية لتوليد ملخص ذكي حتى الآن.",
      ],
      recommendations: [
        "ارفع ملف نتائج يحتوي على الطالب، المادة، الدرجة، والدرجة الكلية للحصول على توصيات أدق.",
      ],
      interventions: [],
    };
  }

  const weakestSubject = getWeakestSubject(summary.subjectAverages);
  const strongestSubject = getStrongestSubject(summary.subjectAverages);
  const weakestClassroom = getWeakestGroup(summary.classroomAverages);
  const weakestGrade = getWeakestGroup(summary.gradeAverages);

  const insights: string[] = [];
  const recommendations: string[] = [];
  const interventions: InterventionSuggestion[] = [];

  insights.push(
    `تم تحليل ${summary.totalRows} نتيجة لـ ${summary.totalStudents} طالب/طالبة في ${summary.totalSubjects} مادة، بمتوسط عام ${summary.averagePercentage}%.`
  );

  if (strongestSubject) {
    insights.push(
      `أعلى مادة في المتوسط هي ${strongestSubject.subject} بنسبة ${strongestSubject.averagePercentage}%.`
    );
  }

  if (weakestSubject) {
    insights.push(
      `أضعف مادة في التحليل هي ${weakestSubject.subject} بنسبة ${weakestSubject.averagePercentage}%.`
    );
  }

  if (weakestClassroom) {
    insights.push(
      `أكثر فصل يحتاج متابعة هو ${weakestClassroom.label} بمتوسط ${weakestClassroom.averagePercentage}%.`
    );
  }

  if (weakestGrade) {
    insights.push(
      `أكثر صف يحتاج متابعة هو ${weakestGrade.label} بمتوسط ${weakestGrade.averagePercentage}%.`
    );
  }

  if (summary.averagePercentage < 60) {
    recommendations.push(
      "يوصى بإعداد خطة علاجية عامة لأن المتوسط العام منخفض ويحتاج تدخلًا منظمًا."
    );
  } else if (summary.averagePercentage < 75) {
    recommendations.push(
      "يوصى بمتابعة المواد والفصول الأقل أداءً قبل تحولها إلى تعثر واضح."
    );
  } else {
    recommendations.push(
      "المؤشر العام جيد، ويفضل التركيز على الطلاب والمواد التي ظهرت في قائمة الاحتياج للمتابعة."
    );
  }

  if (weakestSubject && weakestSubject.averagePercentage < 70) {
    recommendations.push(
      `يوصى بتنفيذ تدخل علاجي في مادة ${weakestSubject.subject} ومراجعة الطلاب المتعثرين فيها.`
    );

    interventions.push({
      title: `تدخل علاجي في مادة ${weakestSubject.subject}`,
      description: `يمكن لاحقًا ربط هذا التدخل ببرنامج إرشادي جماعي لمادة ${weakestSubject.subject}.`,
      target: "subject",
      futureAction: "إنشاء برنامج علاجي جماعي عبر Workflow يحدده الأدمن.",
    });
  }

  if (summary.riskStudentsCount > 0) {
    recommendations.push(
      `يوجد ${summary.riskStudentsCount} طالب/طالبة يحتاجون متابعة فردية حسب نتائج التحليل.`
    );

    interventions.push({
      title: "متابعة الطلاب منخفضي الأداء",
      description:
        "يمكن لاحقًا إنشاء حالات متابعة فردية للطلاب الأكثر احتياجًا بعد مراجعة الموجه.",
      target: "student",
      futureAction: "إنشاء حالة متابعة عبر Workflow متابعة الطلاب.",
    });
  }

  if (weakestClassroom && weakestClassroom.averagePercentage < 70) {
    interventions.push({
      title: `تدخل جماعي للفصل ${weakestClassroom.label}`,
      description: `الفصل ${weakestClassroom.label} ظهر كأقل فصل في المتوسط ويحتاج مراجعة جماعية.`,
      target: "classroom",
      futureAction: "إنشاء برنامج جماعي أو خطة متابعة للفصل.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "لا توجد مؤشرات حرجة واضحة، لكن ينصح بمراجعة الطلاب ذوي النسب الأقل من 70%."
    );
  }

  return {
    insights,
    recommendations,
    interventions,
  };
}