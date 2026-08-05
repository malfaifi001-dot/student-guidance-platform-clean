import { PrincipalTeachersPage } from "@/components/principal/principal-teachers-page";
import { getPrincipalTeachersOverview } from "@/lib/principal/principal-teachers-service";

export const dynamic = "force-dynamic";

export default async function PrincipalTeachersRoute() {
  const overview = await getPrincipalTeachersOverview();
  return <PrincipalTeachersPage overview={overview} />;
}
