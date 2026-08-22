import type { Gender, UserRole } from "@prisma/client";

export type UserRoleDisplayInput = {
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

export function getArabicActivitySupervisorLabel(gender: string | null | undefined) {
  return String(gender || "").trim().toUpperCase() === "FEMALE" ? "المشرفة" : "المشرف";
}

export function getArabicUserRoleIdentityCopy(input: UserRoleDisplayInput) {
  const roleLabel = getArabicUserRoleLabel(input);
  const isPrincipal = String(input.role || "").trim().toUpperCase() === "PRINCIPAL";

  return {
    roleLabel,
    schoolPrincipalLabel: isPrincipal ? roleLabel : "مدير/مديرة المدرسة",
    accountHeading: `بيانات ${roleLabel}`,
    accountDescription: `تظهر بيانات ${roleLabel} في التقارير الرسمية والتوقيعات.`,
    officialNameLabel: `اسم ${roleLabel} في التقارير`,
    phoneLabel: `رقم جوال ${roleLabel}`,
    signatureDescription: `يُحفظ توقيع ${roleLabel} مباشرة من هذه الصفحة عند توفر حقل التوقيع المخصص لهذا الدور.`,
  };
}
