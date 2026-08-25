export type NafsPerformanceDirection = "IMPROVED" | "UNCHANGED" | "DECLINED";
export type NafsImprovementCategory = "HIGH" | "IMPROVED" | "LIMITED" | "STABLE" | "DECLINED";

export type NafsStudentInput = {
  studentId: string;
  studentName: string;
  preScore: number | null;
  postScore: number | null;
  grade?: string | null;
  classroom?: string | null;
};

export type NafsStudentResult = NafsStudentInput & {
  prePercentage: number | null;
  postPercentage: number | null;
  scoreDifference: number | null;
  percentagePointDifference: number | null;
  relativeChange: number | null;
  direction: NafsPerformanceDirection;
  category: NafsImprovementCategory;
};

export type NafsPerformanceBand = "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
export type NafsBandDistribution = Record<NafsPerformanceBand, { pre: number; post: number }>;

export type NafsStatistics = {
  studentCount: number;
  preAverage: number | null;
  postAverage: number | null;
  averageImprovement: number | null;
  preAchievementPercentage: number | null;
  postAchievementPercentage: number | null;
  achievementChange: number | null;
  highestPre: number | null;
  highestPost: number | null;
  lowestPre: number | null;
  lowestPost: number | null;
  improvedCount: number;
  unchangedCount: number;
  declinedCount: number;
  improvedPercentage: number;
  declinedPercentage: number;
  bands: NafsBandDistribution;
};

export type NafsAnalysisInput = {
  title: string;
  subject: string;
  grade: string;
  classroom: string;
  semester?: string;
  academicYear?: string;
  totalScore: number;
  students: NafsStudentInput[];
};

export type NafsAiAnalysis = {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  notablePatterns: string[];
  possibleCauses: string[];
  improvementPriorities: string[];
  recommendations: string[];
  remedialActions: string[];
  enrichmentActions: string[];
  developmentPlan: Array<{
    area: string;
    need: string;
    action: string;
    method: string;
    duration: string;
    responsible: string;
    indicator: string;
    target: string;
    component?: string;
    cause?: string;
    objective?: string;
    steps?: string[];
    resources?: string;
    participants?: string;
    followUpMethod?: string;
    followUpTiming?: string;
    evidence?: string;
  }>;
  followUpIndicators: string[];
};

export type NafsSnapshot = Omit<NafsAnalysisInput, "students"> & {
  students: NafsStudentResult[];
  statistics: NafsStatistics;
  ai?: NafsAiAnalysis | null;
  aiMeta?: { provider: string; model: string; generatedAt: string; aiManuallyEdited?: boolean; editedAt?: string } | null;
};
