import { notFound } from "next/navigation";

import { PrincipalStaffReportsPage } from "@/components/principal/principal-staff-reports-page";
import { getPrincipalStaffReportsWorkspace } from "@/lib/principal/principal-teachers-service";

export const dynamic = "force-dynamic";

export default async function PrincipalStaffReportsRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const workspace = await getPrincipalStaffReportsWorkspace(userId);
  if (!workspace) notFound();

  return <PrincipalStaffReportsPage workspace={workspace} />;
}
