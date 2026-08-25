import { redirect } from "next/navigation";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { NoorImportCyclesClient } from "@/components/data-center/noor-import/noor-import-cycles-client";

export const dynamic = "force-dynamic";

export default async function NoorImportCenterPage() {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  return <NoorImportCyclesClient schoolName={context.schoolName} gender={context.user?.gender} />;
}
