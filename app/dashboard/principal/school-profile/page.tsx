import { PrincipalSchoolProfile } from "@/components/principal/principal-school-profile";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";

export default async function PrincipalSchoolProfilePage() {
  const context = await getPrincipalSchoolContext();
  const profile = context.schoolAccount?.profile;
  return <PrincipalSchoolProfile isLinked={Boolean(context.schoolAccount)} initialValue={{ schoolName: profile?.schoolName || context.schoolAccount?.name || "", principalName: profile?.principalName || context.user.officialName || context.user.name || "", schoolStatisticalNumber: profile?.schoolStatisticalNumber || "", educationDepartment: profile?.educationDepartment || "", city: profile?.city || "", stage: profile?.stage || "" }} />;
}
