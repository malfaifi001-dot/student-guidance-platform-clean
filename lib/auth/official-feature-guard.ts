import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

type OfficialFeatureUser = {
  onboardingCompleted?: boolean | null;
  officialName?: string | null;
  jobTitle?: string | null;
  schoolAccount?: {
    profile?: {
      schoolName?: string | null;
      educationDepartment?: string | null;
      educationOffice?: string | null;
      academicYear?: string | null;
      currentSemester?: string | null;
      principalName?: string | null;
      logoUrl?: string | null;
    } | null;
  } | null;
};

export function getMissingOfficialIdentityItems(user: OfficialFeatureUser | null) {
  const profile = user?.schoolAccount?.profile;

  const missing: string[] = [];

  if (!user?.officialName?.trim()) {
    missing.push("الاسم الرسمي للموجه/الموجهة");
  }

  if (!user?.jobTitle?.trim()) {
    missing.push("المسمى الوظيفي");
  }

  if (!profile?.schoolName?.trim()) {
    missing.push("اسم المدرسة");
  }

  if (!profile?.educationDepartment?.trim()) {
    missing.push("إدارة التعليم");
  }

  if (!profile?.academicYear?.trim()) {
    missing.push("العام الدراسي");
  }

  if (!profile?.currentSemester?.trim()) {
    missing.push("الفصل الدراسي");
  }

  return missing;
}

export function canUseOfficialFeatures(user: OfficialFeatureUser | null) {
  return Boolean(
    user?.onboardingCompleted &&
      getMissingOfficialIdentityItems(user).length === 0
  );
}

export async function requireOfficialFeatureAccess() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
  }

  if (!canUseOfficialFeatures(current.user)) {
    redirect("/dashboard/onboarding?required=official-feature");
  }

  return current;
}
