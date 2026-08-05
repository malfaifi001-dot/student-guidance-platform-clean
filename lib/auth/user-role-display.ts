import type { Gender, UserRole } from "@prisma/client";

type UserRoleDisplayInput = {
  role: UserRole | string | null | undefined;
  gender: Gender | string | null | undefined;
};

export function getArabicUserRoleLabel({
  role,
  gender,
}: UserRoleDisplayInput) {
  const normalizedRole = String(role || "").trim().toUpperCase();
  const isFemale = String(gender || "").trim().toUpperCase() === "FEMALE";

  switch (normalizedRole) {
    case "COUNSELOR":
      return isFemale ? "الموجهة الطلابية" : "الموجه الطلابي";
    case "TEACHER":
      return isFemale ? "المعلمة" : "المعلم";
    case "ACTIVITY_LEADER":
      return isFemale ? "رائدة النشاط" : "رائد النشاط";
    case "PRINCIPAL":
      return isFemale ? "مديرة المدرسة" : "مدير المدرسة";
    case "ADMIN":
      return isFemale ? "مديرة النظام" : "مدير النظام";
    case "SCHOOL_OWNER":
      return isFemale ? "مالكة المدرسة" : "مالك المدرسة";
    case "STAFF":
      return isFemale ? "الموظفة" : "الموظف";
    default:
      return isFemale ? "المستخدمة" : "المستخدم";
  }
}

export function getArabicSignatureTitle(input: UserRoleDisplayInput) {
  return `توقيع ${getArabicUserRoleLabel(input)}`;
}
