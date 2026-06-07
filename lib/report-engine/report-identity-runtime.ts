import type { ReportIdentity } from "@/lib/report-engine/report-types";

type ReportIdentityUser = {
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  gender?: string | null;
  schoolAccount?: {
    name?: string | null;
    profile?: {
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
    } | null;
  } | null;
} | null;

export function buildReportIdentityFromCurrentUser(
  user: ReportIdentityUser
): ReportIdentity {
  const profile = user?.schoolAccount?.profile;

  const counselorName =
    user?.officialName || user?.name || "الموجه/الموجهة الطلابية";

  const jobTitle =
    user?.jobTitle ||
    (user?.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي");

  return {
    ministryName: "وزارة التعليم",
    educationDepartment: profile?.educationDepartment || "إدارة التعليم",
    educationOffice: profile?.educationOffice || "مكتب التعليم",
    schoolName:
      profile?.schoolName || user?.schoolAccount?.name || "اسم المدرسة",
    principalName: profile?.principalName || "مدير/ة المدرسة",
    city: profile?.city || "",
    district: profile?.district || "",
    stage: profile?.stage || "",
    academicYear: profile?.academicYear || "العام الدراسي",
    semester: profile?.currentSemester || "الفصل الدراسي",
    counselorName,
    counselorTitle: jobTitle,
    schoolLogoUrl: profile?.logoUrl || "",
  } as ReportIdentity;
}

export function hasCompleteOfficialReportIdentity(
  user: ReportIdentityUser
) {
  const profile = user?.schoolAccount?.profile;

  return Boolean(
    user?.officialName &&
      user?.jobTitle &&
      profile?.schoolName &&
      profile?.educationDepartment &&
      profile?.academicYear &&
      profile?.currentSemester
  );
}
