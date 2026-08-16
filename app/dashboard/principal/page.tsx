import { PrincipalDashboard } from "@/components/principal/principal-dashboard";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";

export default async function PrincipalPage() {
  const context = await getPrincipalSchoolContext();
  const isFemale = context.user.gender === "FEMALE";
  const roleLabel = isFemale ? "مديرة المدرسة" : "مدير المدرسة";
  const identityReadiness = calculateSchoolIdentityReadiness(
    {
      officialName: context.user.officialName,
      jobTitle: context.user.jobTitle,
      phone: context.user.phone,
      schoolName: context.schoolAccount?.profile?.schoolName,
      principalName: context.schoolAccount?.profile?.principalName,
      educationDepartment: context.schoolAccount?.profile?.educationDepartment,
      educationOffice: context.schoolAccount?.profile?.educationOffice,
      city: context.schoolAccount?.profile?.city,
      district: context.schoolAccount?.profile?.district,
      stage: context.schoolAccount?.profile?.stage,
      logoUrl: context.schoolAccount?.profile?.logoUrl,
    },
    { role: context.user.role, gender: context.user.gender },
  );

  return <PrincipalDashboard principalName={context.user.officialName || context.user.name || roleLabel} roleLabel={roleLabel} schoolName={context.schoolAccount?.profile?.schoolName || context.schoolAccount?.name || null} isFemale={isFemale} schoolIdentityComplete={identityReadiness.score === 100} userId={context.user.id} />;
}
