import type {
  TimetableV2ReadinessCategory,
  TimetableV2ReadinessIssue,
  TimetableV2ReadinessSeverity,
} from "./readiness-analysis";

export type ReadinessGroup = {
  id: string;
  code: string;
  severity: TimetableV2ReadinessSeverity;
  category: TimetableV2ReadinessCategory;
  title: string;
  description: string;
  count: number;
  issues: TimetableV2ReadinessIssue[];
  primaryActionLabel: string;
  primaryHref: string;
  defaultExpanded: boolean;
  priority: number;
  blockerPhrase: string;
};

const GROUP_CODE_BY_ISSUE_CODE: Record<string, string> = {
  ASSIGNMENT_INCOMPLETE: "ASSIGNMENT_INCOMPLETE",
  ASSIGNMENT_OVERFLOW: "ASSIGNMENT_OVERFLOW",
  TEACHER_WEEKLY_OVERLOAD: "TEACHER_WEEKLY_OVERLOAD",
  TEACHER_INSUFFICIENT_TIME_CAPACITY: "TEACHER_TIME_CAPACITY_INSUFFICIENT",
  TEACHER_TIGHT_AVAILABILITY: "TEACHER_LOW_FLEXIBILITY",
  CLASS_CAPACITY_INSUFFICIENT: "CLASS_CAPACITY_INSUFFICIENT",
  FIXED_RULE_CONFLICT: "FIXED_BLOCKED_CONFLICT",
  DUPLICATE_CONSTRAINT: "DUPLICATE_CONSTRAINT",
  PERIOD_TIME_MISSING: "PERIOD_TIMES_INCOMPLETE",
  TEACHER_SPECIALTY_MISSING: "TEACHER_SPECIALTY_MISSING",
};

type GroupMeta = {
  title: string;
  description: (count: number) => string;
  primaryActionLabel: string;
  primaryHref: (projectId: string) => string;
  priority: number;
  blockerPhrase: (count: number) => string;
};

const GROUP_META: Record<string, GroupMeta> = {
  ASSIGNMENT_INCOMPLETE: {
    title: "الإسناد غير مكتمل",
    description: (count) =>
      `توجد ${count} مادة/فصل لم يكتمل إسنادها حسب الخطة الأسبوعية.`,
    primaryActionLabel: "فتح شبكة الإسناد",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/assignments`,
    priority: 10,
    blockerPhrase: (count) => `${count} مقرر غير مكتمل الإسناد`,
  },

  ASSIGNMENT_OVERFLOW: {
    title: "إسناد زائد عن الخطة",
    description: (count) =>
      `أسندت ${count} مادة/فصل حصصًا أكثر من المخطط الأسبوعي.`,
    primaryActionLabel: "مراجعة الإسناد",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/assignments`,
    priority: 11,
    blockerPhrase: (count) => `${count} مقرر تجاوز الخطة`,
  },

  TEACHER_WEEKLY_OVERLOAD: {
    title: "تجاوز النصاب الأسبوعي",
    description: (count) =>
      `يتجاوز ${count} معلمين النصاب الأسبوعي المسموح بحصص مسندة.`,
    primaryActionLabel: "مراجعة أحمال المعلمين",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/assignments`,
    priority: 30,
    blockerPhrase: (count) => `${count} معلم متجاوز النصاب`,
  },

  TEACHER_TIME_CAPACITY_INSUFFICIENT: {
    title: "الخانات الزمنية غير كافية للمعلمين",
    description: (count) =>
      `لا يملك ${count} معلمين خانات زمنية كافية بعد تطبيق قيود المنع.`,
    primaryActionLabel: "مراجعة قيود المعلمين",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 31,
    blockerPhrase: (count) => `${count} معلم بخانات غير كافية`,
  },

  TEACHER_LOW_FLEXIBILITY: {
    title: "مرونة زمنية منخفضة للمعلمين",
    description: (count) =>
      `هامش الحركة الزمني ضيق لـ ${count} معلمين بعد تطبيق القيود.`,
    primaryActionLabel: "مراجعة القيود",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 60,
    blockerPhrase: (count) => `${count} معلم بمرونة منخفضة`,
  },

  CLASS_CAPACITY_INSUFFICIENT: {
    title: "خانات الفصول غير كافية",
    description: (count) =>
      `لا تملك ${count} فصول خانات كافية لتنفيذ خططها الأسبوعية بعد القيود.`,
    primaryActionLabel: "مراجعة قيود الفصول",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 40,
    blockerPhrase: (count) => `${count} فصل بخانات غير كافية`,
  },

  FIXED_BLOCKED_CONFLICT: {
    title: "تعارضات القيود",
    description: (count) =>
      `يوجد ${count} تعارض بين قيد تثبيت وقيد منع يؤثران على نفس الهدف والخانة.`,
    primaryActionLabel: "فتح مراجعة القيود",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 20,
    blockerPhrase: (count) => `${count} تعارض قيد إلزامي`,
  },

  DUPLICATE_CONSTRAINT: {
    title: "قيود مكررة",
    description: (count) =>
      `توجد ${count} قيود مكررة تؤثر على نفس الهدف والخانة الزمنية.`,
    primaryActionLabel: "مراجعة القيود",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 21,
    blockerPhrase: (count) => `${count} قيد مكرر`,
  },

  PERIOD_TIMES_INCOMPLETE: {
    title: "أوقات اليوم غير مكتملة",
    description: (count) =>
      `يحتاج ${count} عناصر تحديد وقت بداية ونهاية واضح لتصبح المراجعة أوضح.`,
    primaryActionLabel: "إعداد أوقات اليوم",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/constraints`,
    priority: 50,
    blockerPhrase: (count) => `${count} أوقات تحتاج ضبط`,
  },

  TEACHER_SPECIALTY_MISSING: {
    title: "معلمون بدون تخصص",
    description: (count) =>
      `لدى ${count} معلمين تخصص غير محدد؛ إضافته تحسن الاقتراحات والتحليل.`,
    primaryActionLabel: "إدارة المعلمين",
    primaryHref: (projectId) =>
      `/dashboard/timetable-v2/${projectId}/teachers`,
    priority: 70,
    blockerPhrase: (count) => `${count} معلم بدون تخصص`,
  },
};

const CATEGORY_PRIORITY: Record<TimetableV2ReadinessCategory, number> = {
  ASSIGNMENTS: 10,
  CONSTRAINTS: 20,
  TEACHERS: 30,
  CLASSES: 40,
  SUBJECTS: 42,
  TIME: 50,
  PROJECT: 55,
};

function severityRank(
  severity: TimetableV2ReadinessSeverity,
): number {
  if (severity === "ERROR") {
    return 0;
  }

  if (severity === "WARNING") {
    return 1;
  }

  return 2;
}

function defaultPriority(
  issue: TimetableV2ReadinessIssue,
): number {
  return (
    CATEGORY_PRIORITY[issue.category] ??
    60
  );
}

export function resolveGroupCode(
  issueCode: string,
): string {
  return (
    GROUP_CODE_BY_ISSUE_CODE[issueCode] ??
    issueCode
  );
}

export function groupReadinessIssues(
  issues: TimetableV2ReadinessIssue[],
  projectId: string,
): ReadinessGroup[] {
  const grouped = new Map<
    string,
    TimetableV2ReadinessIssue[]
  >();

  const order: string[] = [];

  for (const issue of issues) {
    const code = resolveGroupCode(issue.code);

    const list = grouped.get(code) ?? [];

    if (list.length === 0) {
      order.push(code);
    }

    list.push(issue);

    grouped.set(code, list);
  }

  const groups: ReadinessGroup[] = order.map((code) => {
    const groupIssues = grouped.get(code) ?? [];

    const first = groupIssues[0];

    const meta = GROUP_META[code];

    const count = groupIssues.length;

    const severity = first.severity;

    return {
      id: code,
      code,
      severity,
      category: first.category,
      title: meta?.title ?? first.title,
      description: meta
        ? meta.description(count)
        : first.description,
      count,
      issues: groupIssues,
      primaryActionLabel:
        meta?.primaryActionLabel ??
        first.actionLabel ??
        "مراجعة",
      primaryHref: meta
        ? meta.primaryHref(projectId)
        : first.href ?? "",
      defaultExpanded:
        severity === "ERROR" && count <= 3,
      priority:
        meta?.priority ?? defaultPriority(first),
      blockerPhrase: meta
        ? meta.blockerPhrase(count)
        : `${count} عنصر`,
    };
  });

  groups.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      a.priority - b.priority ||
      b.count - a.count ||
      a.title.localeCompare(b.title, "ar"),
  );

  return groups;
}

export function getReadinessBlockers(
  groups: ReadinessGroup[],
  limit = 4,
): ReadinessGroup[] {
  return groups
    .filter(
      (group) =>
        group.severity === "ERROR" ||
        group.severity === "WARNING",
    )
    .sort(
      (a, b) =>
        severityRank(a.severity) - severityRank(b.severity) ||
        b.count - a.count ||
        a.priority - b.priority,
    )
    .slice(0, limit);
}
