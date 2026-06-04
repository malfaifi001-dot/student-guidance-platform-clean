import { redirect } from "next/navigation";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { NoorImportCycleDetailClient } from "@/components/data-center/noor-import/noor-import-cycle-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ cycleId: string }> | { cycleId: string };
};

export default async function NoorImportCyclePage({ params }: PageProps) {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  const resolvedParams = await params;

  return <NoorImportCycleDetailClient cycleId={resolvedParams.cycleId} />;
}
