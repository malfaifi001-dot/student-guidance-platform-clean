import { redirect } from "next/navigation";
import { NoorImportClient } from "@/components/data-center/noor-import/noor-import-client";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const dynamic = "force-dynamic";

export default async function NoorImportPage() {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  return <NoorImportClient schoolName={context.schoolName} />;
}