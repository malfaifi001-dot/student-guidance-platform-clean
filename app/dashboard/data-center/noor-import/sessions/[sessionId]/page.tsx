import { redirect } from "next/navigation";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { NoorImportSessionDetailClient } from "@/components/data-center/noor-import/noor-import-session-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export default async function NoorImportSessionPage({ params }: PageProps) {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  const resolvedParams = await params;

  return <NoorImportSessionDetailClient sessionId={resolvedParams.sessionId} />;
}
