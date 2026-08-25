import { redirect } from "next/navigation";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { StudentsCenterClient } from "@/components/data-center/students/students-center-client";

export const dynamic = "force-dynamic";

export default async function StudentsCenterPage({ searchParams }: { searchParams: Promise<{ imported?: string; files?: string }> }) {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  const query = await searchParams;
  const importedCount = Number(query.imported || 0) || undefined;
  const importedFiles = Number(query.files || 0) || undefined;
  return <StudentsCenterClient schoolName={context.schoolName} gender={context.user?.gender} importedCount={importedCount} importedFiles={importedFiles} />;
}
