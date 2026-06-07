import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const dynamic = "force-dynamic";

export default async function NoorImportSessionsIndexPage() {
  const context = await resolveCurrentSchoolContext().catch(() => null);

  if (!context) {
    redirect("/login");
  }

  const latestSession = await prisma.studentImportSession.findFirst({
    where: {
      schoolAccountId: context.schoolAccountId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!latestSession) {
    redirect("/dashboard/data-center/student-data-import");
  }

  redirect(`/dashboard/data-center/student-data-import/sessions/${latestSession.id}`);
}
