export type SchoolIdentityInput = {
  officialName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  schoolName?: string | null;
  principalName?: string | null;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  city?: string | null;
  district?: string | null;
  stage?: string | null;
  academicYear?: string | null;
  currentSemester?: string | null;
  logoUrl?: string | null;
  onboardingCompleted?: boolean | null;
};

export type SchoolIdentityReadinessLevel =
  | "excellent"
  | "good"
  | "needs-work";

export type SchoolIdentityReadinessItem = {
  key: keyof SchoolIdentityInput;
  label: string;
  completed: boolean;
  required: boolean;
};

export type SchoolIdentityReadiness = {
  percentage: number;
  score: number;
  completedPercentage: number;
  completionPercentage: number;
  level: SchoolIdentityReadinessLevel;

  completed: boolean;
  isComplete: boolean;
  isReady: boolean;

  completedCount: number;
  totalCount: number;

  requiredCompletedCount: number;
  requiredTotalCount: number;
  optionalCompletedCount: number;
  optionalTotalCount: number;

  items: SchoolIdentityReadinessItem[];
  allItems: SchoolIdentityReadinessItem[];

  required: SchoolIdentityReadinessItem[];
  optional: SchoolIdentityReadinessItem[];

  requiredItems: SchoolIdentityReadinessItem[];
  optionalItems: SchoolIdentityReadinessItem[];

  requiredFields: SchoolIdentityReadinessItem[];
  optionalFields: SchoolIdentityReadinessItem[];

  missingRequired: SchoolIdentityReadinessItem[];
  missingOptional: SchoolIdentityReadinessItem[];
  completedRequired: SchoolIdentityReadinessItem[];
  completedOptional: SchoolIdentityReadinessItem[];

  missingItems: string[];
  missingFields: string[];
  missingRequiredLabels: string[];
  missingOptionalLabels: string[];
};

const REQUIRED_FIELDS: Array<{
  key: keyof SchoolIdentityInput;
  label: string;
}> = [
  { key: "officialName", label: "الاسم الرسمي" },
  { key: "jobTitle", label: "المسمى الوظيفي" },
  { key: "schoolName", label: "اسم المدرسة" },
  { key: "educationDepartment", label: "إدارة التعليم" },
  { key: "academicYear", label: "العام الدراسي" },
  { key: "currentSemester", label: "الفصل الدراسي" },
];

const OPTIONAL_FIELDS: Array<{
  key: keyof SchoolIdentityInput;
  label: string;
}> = [
  { key: "phone", label: "رقم الجوال" },
  { key: "principalName", label: "اسم المدير/ة" },
  { key: "educationOffice", label: "مكتب التعليم" },
  { key: "city", label: "المدينة" },
  { key: "district", label: "الحي" },
  { key: "stage", label: "المرحلة" },
  { key: "logoUrl", label: "شعار المدرسة" },
];

function hasValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}

function buildItem(
  data: SchoolIdentityInput,
  field: { key: keyof SchoolIdentityInput; label: string },
  required: boolean
): SchoolIdentityReadinessItem {
  return {
    key: field.key,
    label: field.label,
    completed: hasValue(data[field.key]),
    required,
  };
}

function getReadinessLevel(percentage: number): SchoolIdentityReadinessLevel {
  if (percentage >= 100) return "excellent";
  if (percentage >= 70) return "good";
  return "needs-work";
}

export function calculateSchoolIdentityReadiness(
  data: SchoolIdentityInput | null | undefined
): SchoolIdentityReadiness {
  const safeData = data || {};

  const requiredItems = REQUIRED_FIELDS.map((field) =>
    buildItem(safeData, field, true)
  );

  const optionalItems = OPTIONAL_FIELDS.map((field) =>
    buildItem(safeData, field, false)
  );

  const allItems = [...requiredItems, ...optionalItems];

  const completedRequired = requiredItems.filter((item) => item.completed);
  const completedOptional = optionalItems.filter((item) => item.completed);

  const missingRequired = requiredItems.filter((item) => !item.completed);
  const missingOptional = optionalItems.filter((item) => !item.completed);

  const requiredTotalCount = requiredItems.length;
  const requiredCompletedCount = completedRequired.length;

  const optionalTotalCount = optionalItems.length;
  const optionalCompletedCount = completedOptional.length;

  const percentage =
    requiredTotalCount > 0
      ? Math.round((requiredCompletedCount / requiredTotalCount) * 100)
      : 100;

  const level = getReadinessLevel(percentage);
  const isComplete = missingRequired.length === 0;

  const missingRequiredLabels = missingRequired.map((item) => item.label);
  const missingOptionalLabels = missingOptional.map((item) => item.label);

  return {
    percentage,
    score: percentage,
    completedPercentage: percentage,
    completionPercentage: percentage,
    level,

    completed: isComplete,
    isComplete,
    isReady: isComplete,

    completedCount: allItems.filter((item) => item.completed).length,
    totalCount: allItems.length,

    requiredCompletedCount,
    requiredTotalCount,
    optionalCompletedCount,
    optionalTotalCount,

    items: allItems,
    allItems,

    required: requiredItems,
    optional: optionalItems,

    requiredItems,
    optionalItems,

    requiredFields: requiredItems,
    optionalFields: optionalItems,

    missingRequired,
    missingOptional,
    completedRequired,
    completedOptional,

    missingItems: missingRequiredLabels,
    missingFields: missingRequiredLabels,
    missingRequiredLabels,
    missingOptionalLabels,
  };
}