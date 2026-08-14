import {
  getArabicUserRoleIdentityCopy,
  type UserRoleDisplayInput,
} from "@/lib/auth/user-role-display";

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
    label: "الاسم الرسمي",
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
    key: "principalName",
    label: "اسم مدير/مديرة المدرسة",
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
    label: "رقم الجوال",
    required: false,
    weight: 3,
  },
];

export function calculateSchoolIdentityReadiness(
  input: SchoolIdentityReadinessInput,
  actor?: UserRoleDisplayInput,
) {
  const identityCopy = actor ? getArabicUserRoleIdentityCopy(actor) : null;
  const readinessItems = SCHOOL_IDENTITY_READINESS_ITEMS.map((item) => {
    if (item.key === "officialName" && identityCopy) {
      return { ...item, label: identityCopy.officialNameLabel };
    }
    if (item.key === "phone" && identityCopy) {
      return { ...item, label: identityCopy.phoneLabel };
    }
    if (item.key === "principalName" && identityCopy) {
      return { ...item, label: `اسم ${identityCopy.schoolPrincipalLabel}` };
    }
    return item;
  });
  const totalWeight = readinessItems.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const completedItems = readinessItems.filter((item) => {
    const value = input[item.key];
    return typeof value === "string" ? Boolean(value.trim()) : Boolean(value);
  });

  const completedWeight = completedItems.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const missingRequired = readinessItems.filter((item) => {
    if (!item.required) return false;

    const value = input[item.key];
    return typeof value === "string" ? !value.trim() : !value;
  });

  const missingOptional = readinessItems.filter((item) => {
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
