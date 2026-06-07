import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyStudentImportSessionPage() {
  redirect("/dashboard/data-center/student-data-import");
}
