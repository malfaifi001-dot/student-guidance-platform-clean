import { redirect } from "next/navigation";

import { StudentRecordSearchClient } from "@/components/students/student-record-search-client";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

export default async function ComprehensiveReferencePage() {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const students = await prisma.student.findMany({
    where: {
      ...(context.isAdmin ? {} : { schoolAccountId: context.schoolAccountId }),
    },
    orderBy: {
      fullName: "asc",
    },
    take: 500,
    select: {
      id: true,
      fullName: true,
      nationalId: true,
      stage: true,
      grade: true,
      classroom: true,
      isActive: true,
      guardian: {
        select: {
          name: true,
          phone: true,
        },
      },
      _count: {
        select: {
          cases: true,
        },
      },
    },
  });

  return (
    <main className="space-y-6" dir="rtl">
      <StudentRecordSearchClient students={students} />
    </main>
  );
}
