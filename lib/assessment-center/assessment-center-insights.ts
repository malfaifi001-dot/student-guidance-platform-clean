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
  subjects: AssessmentSubjectSummary[] | undefined,
): AssessmentSubjectSummary | null {
  if (!subjects?.length) return null;

  return [...subjects].sort(
    (a, b) => a.averagePercentage - b.averagePercentage,
  )[0];
}

function getStrongestSubject(
  subjects: AssessmentSubjectSummary[] | undefined,
): AssessmentSubjectSummary | null {
  if (!subjects?.length) return null;

  return [...subjects].sort(
    (a, b) => b.averagePercentage - a.averagePercentage,
  )[0];
}

function getWeakestGroup(
  groups: AssessmentGroupSummary[] | undefined,
): AssessmentGroupSummary | null {
  if (!groups?.length) return null;

  return [...groups].sort(
    (a, b) => a.averagePercentage - b.averagePercentage,
  )[0];
}

export function buildAssessmentSmartNarrative(
  summary: AssessmentAnalysisSummary | null,
): {
  insights: string[];
  recommendations: string[];
  interventions: InterventionSuggestion[];
} {
  if (!summary) {
    return {
      insights: ["لا توجد بيانات كافية لعرض قراءة تحليلية."],
      recommendations: ["ارفع ملف النتائج أولًا لعرض القراءة التحليلية."],
      interventions: [],
    };
  }

  const weakestSubject =
    summary.weakestSubjects?.[0] || getWeakestSubject(summary.subjectAverages);
  const strongestSubject =
    summary.strongestSubjects?.[0] || getStrongestSubject(summary.subjectAverages);
  const weakestClassroom = getWeakestGroup(summary.classroomAverages);
  const weakestGrade = getWeakestGroup(summary.gradeAverages);

  const insights: string[] = [];
  const recommendations: string[] = [];
  const interventions: InterventionSuggestion[] = [];

  insights.push(
    `تم تحليل ${summary.totalRows} نتيجة لعدد ${summary.totalStudents} طالب/طالبة في ${summary.totalSubjects} مادة، بمتوسط عام ${summary.averagePercentage}%.`,
  );

  if (strongestSubject) {
    insights.push(
      `أقوى مادة حاليًا هي ${strongestSubject.subject} بمتوسط ${strongestSubject.averagePercentage}%.`,
    );
  }

  if (weakestSubject) {
    insights.push(
      `أضعف مادة حاليًا هي ${weakestSubject.subject} بمتوسط ${weakestSubject.averagePercentage}%.`,
    );
  }

  if (weakestClassroom) {
    insights.push(
      `أكثر فصل يحتاج متابعة هو ${weakestClassroom.label} بمتوسط ${weakestClassroom.averagePercentage}%.`,
    );
  }

  if (weakestGrade) {
    insights.push(
      `أكثر صف يحتاج متابعة هو ${weakestGrade.label} بمتوسط ${weakestGrade.averagePercentage}%.`,
    );
  }

  if (summary.averagePercentage < 60) {
    recommendations.push("ينصح بخطة متابعة عامة لأن المتوسط العام منخفض.");
  } else if (summary.averagePercentage < 75) {
    recommendations.push("ينصح بالتركيز على المواد والفصول الأقل أداءً.");
  } else {
    recommendations.push("المؤشر العام جيد، والتركيز الأفضل على الحالات الفردية.");
  }

  if (weakestSubject && weakestSubject.averagePercentage < 70) {
    recommendations.push(
      `يستحسن البدء بمراجعة مادة ${weakestSubject.subject}.`,
    );

    interventions.push({
      title: `خطة مادة - ${weakestSubject.subject}`,
      description: `هذه المادة هي الأضعف حاليًا وتحتاج إجراءً واضحًا.`,
      target: "subject",
      futureAction: "إعداد خطة مادة مختصرة ومتابعة الطلاب الضعاف فيها.",
    });
  }

  if (summary.riskStudentsCount > 0) {
    recommendations.push(
      `يوجد ${summary.riskStudentsCount} طالب/طالبة يحتاجون متابعة مباشرة.`,
    );

    interventions.push({
      title: "متابعة الطلاب الضعاف",
      description: "ابدأ بالطلاب الأقل متوسطًا أو الأضعف في أكثر من مادة.",
      target: "student",
      futureAction: "تجهيز خطة متابعة فردية للطلاب الأشد حاجة.",
    });
  }

  if (weakestClassroom && weakestClassroom.averagePercentage < 70) {
    interventions.push({
      title: `خطة فصل - ${weakestClassroom.label}`,
      description: "هذا الفصل يحتاج متابعة جماعية.",
      target: "classroom",
      futureAction: "إعداد خطة فصل أو نشاط جماعي داعم.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push("لا توجد مؤشرات حرجة، ويكفي متابعة الطلاب الأقل من 70%.");
  }

  return {
    insights,
    recommendations,
    interventions,
  };
}
