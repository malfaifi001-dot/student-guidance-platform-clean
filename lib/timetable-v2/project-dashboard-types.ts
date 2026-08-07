export type ProjectDashboardBlocker = {
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  title: string;
  blockerPhrase: string;
  href: string;
};

export type ProjectDashboardSchedule = {
  exists: boolean;
  isStale: boolean;
  versionsCount: number;
  current: {
    id: string;
    version: number;
    status: string;
    score: number;
    completeness: number;
    hardViolations: number;
    entriesCount: number;
    generatedAt: string;
  } | null;
};

export type ProjectDashboardData = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    status: string;
  };

  setup: {
    stageLabels: string[];
    teacherTarget: number | null;
    weeklyPeriodTarget: number | null;
    hasDays: boolean;
    hasTeachingPeriods: boolean;
  };

  time: {
    daysCount: number;
    periodsPerDay: number;
    breaksCount: number;
    weeklySlotCount: number;
  };

  counts: {
    teachersCount: number;
    classesCount: number;
    subjectsCount: number;
    classSubjectsCount: number;
    totalWeeklyLessons: number;
    assignedLessons: number;
    assignmentsCount: number;
    fullyAssignedRows: number;
    underAssignedRows: number;
    overAssignedRows: number;
    teacherCapacity: number;
  };

  constraints: {
    activeCount: number;
    hardCount: number;
    softCount: number;
    disabledCount: number;
    conflictCount: number;
  };

  readiness: {
    score: number;
    canGenerate: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    blockers: ProjectDashboardBlocker[];
  };

  schedule: ProjectDashboardSchedule;
};
