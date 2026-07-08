import {
  SpecialReportDocument,
} from "@/components/special-report/special-report-document";

import {
  SpecialReportPrintAction,
} from "@/components/special-report/special-report-print-action";

import {
  getSpecialReportDocumentData,
} from "@/lib/special-report/report-runtime";

type SpecialReportPageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function SpecialReportPage({
  params,
}: SpecialReportPageProps) {
  const {
    caseId,
  } = await params;

  const data =
    await getSpecialReportDocumentData(
      caseId
    );

  return (
    <>
      <SpecialReportPrintAction />

      <SpecialReportDocument
        data={data}
      />
    </>
  );
}