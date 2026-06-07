import "server-only";

export type ResultsAnalysisAccessScope = {
  schoolAccountId?: string | null;
  isAdmin?: boolean;
};

export function buildResultsAnalysisAccessWhere(
  analysisId: string,
  scope: ResultsAnalysisAccessScope
) {
  if (scope.isAdmin) {
    return {
      id: analysisId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن الوصول لتحليل النتائج بدون ربط المستخدم بمدرسة.");
  }

  return {
    id: analysisId,
    schoolAccountId,
  };
}

export function buildResultsAnalysisListWhere(
  scope: ResultsAnalysisAccessScope
) {
  if (scope.isAdmin) {
    return {};
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن عرض تحليلات النتائج بدون ربط المستخدم بمدرسة.");
  }

  return {
    schoolAccountId,
  };
}
