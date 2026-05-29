import { prisma } from "@/lib/prisma";
import { NewReportCasePicker } from "@/components/reports/new-report-case-picker.tsx";

export default async function NewReportPage() {
  const cases = await prisma.caseEntry.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      service: true,
      student: {
        include: {
          guardian: true,
        },
      },
      values: true,
      evidences: true,
    },
  });

  return <NewReportCasePicker cases={cases} />;
}