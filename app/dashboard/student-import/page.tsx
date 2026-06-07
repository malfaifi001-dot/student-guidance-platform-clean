import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyStudentImportPage() {
  redirect("/dashboard/data-center/student-data-import");
}
