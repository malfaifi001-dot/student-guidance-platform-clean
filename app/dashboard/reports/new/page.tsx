import { prisma } from "@/lib/prisma";
import { NewReportCasePicker } from "@/components/reports/new-report-case-picker";

type NewReportPageProps = {
  searchParams?: Promise<{
    caseId?: string;
  }>;
};

export default async function NewReportPage({
  searchParams,
}: NewReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedCaseId = params.caseId?.trim() || "";

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
      values: {
        include: {
          field: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      evidences: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const normalizedCases = cases.map((caseEntry) => ({
    id: caseEntry.id,
    title: caseEntry.title || caseEntry.service.name,
    status: caseEntry.status,
    createdAt: caseEntry.createdAt.toISOString(),
    updatedAt: caseEntry.updatedAt.toISOString(),
    submittedAt: caseEntry.submittedAt?.toISOString() || null,

    service: {
      id: caseEntry.service.id,
      name: caseEntry.service.name,
      slug: caseEntry.service.slug,
    },

    student: caseEntry.student
      ? {
          id: caseEntry.student.id,
          fullName: caseEntry.student.fullName,
          nationalId: caseEntry.student.nationalId,
          stage: caseEntry.student.stage,
          grade: caseEntry.student.grade,
          classroom: caseEntry.student.classroom,
          guardianName: caseEntry.student.guardian?.name || null,
          guardianPhone: caseEntry.student.guardian?.phone || null,
        }
      : null,

    valuesCount: caseEntry.values.length,
    evidencesCount: caseEntry.evidences.length,
  }));

  return (
    <main className="space-y-6" dir="rtl">
      <NewReportCasePicker
        cases={normalizedCases}
        initialCaseId={selectedCaseId}
      />
    </main>
  );
}