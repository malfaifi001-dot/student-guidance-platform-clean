import { redirect } from "next/navigation";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { StudentsCenterClient } from "@/components/data-center/students/students-center-client";

export const dynamic = "force-dynamic";

export default async function StudentsCenterPage() {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  return <StudentsCenterClient schoolName={context.schoolName} />;
}
