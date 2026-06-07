export type SchoolIdentityReadinessInput = {
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
};

export type SchoolIdentityReadinessItem = {
  key: keyof SchoolIdentityReadinessInput;
  label: string;
  required: boolean;
  weight: number;
};

export const SCHOOL_IDENTITY_READINESS_ITEMS: SchoolIdentityReadinessItem[] = [
  {
    key: "officialName",
    label: "الاسم الرسمي للموجه/الموجهة",
    required: true,
    weight: 14,
  },
  {
    key: "jobTitle",
    label: "المسمى الوظيفي",
    required: true,
    weight: 10,
  },
  {
    key: "schoolName",
    label: "اسم المدرسة",
    required: true,
    weight: 16,
  },
  {
    key: "educationDepartment",
    label: "إدارة التعليم",
    required: true,
    weight: 12,
  },
  {
    key: "academicYear",
    label: "العام الدراسي",
    required: true,
    weight: 10,
  },
  {
    key: "currentSemester",
    label: "الفصل الدراسي",
    required: true,
    weight: 8,
  },
  {
    key: "principalName",
    label: "اسم المدير/ة",
    required: false,
    weight: 8,
  },
  {
    key: "city",
    label: "المدينة",
    required: false,
    weight: 4,
  },
  {
    key: "stage",
    label: "المرحلة",
    required: false,
    weight: 4,
  },
  {
    key: "phone",
    label: "رقم جوال الموجه/الموجهة",
    required: false,
    weight: 3,
  },
];

export function calculateSchoolIdentityReadiness(
  input: SchoolIdentityReadinessInput
) {
  const totalWeight = SCHOOL_IDENTITY_READINESS_ITEMS.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const completedItems = SCHOOL_IDENTITY_READINESS_ITEMS.filter((item) => {
    const value = input[item.key];
    return typeof value === "string" ? Boolean(value.trim()) : Boolean(value);
  });

  const completedWeight = completedItems.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const missingRequired = SCHOOL_IDENTITY_READINESS_ITEMS.filter((item) => {
    if (!item.required) return false;

    const value = input[item.key];
    return typeof value === "string" ? !value.trim() : !value;
  });

  const missingOptional = SCHOOL_IDENTITY_READINESS_ITEMS.filter((item) => {
    if (item.required) return false;

    const value = input[item.key];
    return typeof value === "string" ? !value.trim() : !value;
  });

  const score = Math.round((completedWeight / totalWeight) * 100);

  return {
    score,
    completedItems,
    missingRequired,
    missingOptional,
    readyForOfficialReports: missingRequired.length === 0,
    level:
      score >= 90
        ? "excellent"
        : score >= 75
          ? "good"
          : score >= 50
            ? "needs-work"
            : "incomplete",
  };
}
