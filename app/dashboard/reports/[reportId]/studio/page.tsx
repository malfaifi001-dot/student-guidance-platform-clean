import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportStudioShell } from "@/components/reports/studio/report-studio-shell";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function ReportStudioPage({ params }: PageProps) {
  const { reportId } = await params;

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      caseEntry: {
        include: {
          service: true,
          student: true,
        },
      },
      evidenceItems: true,
    },
  });

  if (!report) {
    notFound();
  }

  return (
    <ReportStudioShell
      reportId={report.id}
      initialContent={report.editableContent}
      initialGender={report.genderMode as "MALE" | "FEMALE"}
      context={{
        studentName: report.caseEntry.student?.fullName || undefined,
        serviceType: report.caseEntry.service.name,
        serviceSlug: report.serviceSlug,
      }}
    />
  );
}