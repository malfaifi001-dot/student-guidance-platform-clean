import { PrincipalDashboard } from "@/components/principal/principal-dashboard";
import { getPrincipalSchoolContext } from "@/lib/principal/principal-school-service";

export default async function PrincipalPage() {
  const context = await getPrincipalSchoolContext();
  const isFemale = context.user.gender === "FEMALE";
  const roleLabel = isFemale ? "مديرة المدرسة" : "مدير المدرسة";
  return <PrincipalDashboard principalName={context.user.officialName || context.user.name || roleLabel} roleLabel={roleLabel} schoolName={context.schoolAccount?.profile?.schoolName || context.schoolAccount?.name || null} isFemale={isFemale} />;
}
