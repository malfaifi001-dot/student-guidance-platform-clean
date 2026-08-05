import { PrincipalComingSoonPage } from "@/components/principal/principal-coming-soon-page";
import { PrincipalSchoolSetupRequired } from "@/components/principal/principal-school-setup-required";
import { getPrincipalSchoolProfile, isPrincipalSchoolProfileComplete } from "@/lib/principal/principal-school-service";

export default async function PrincipalSchoolEvaluationPage() {
  const profile = await getPrincipalSchoolProfile();
  if (!isPrincipalSchoolProfileComplete(profile)) return <PrincipalSchoolSetupRequired />;
  return <PrincipalComingSoonPage title="التقويم المدرسي" />;
}
