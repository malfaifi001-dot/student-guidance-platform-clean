import {
  DocumentRenderer,
} from "@/components/document-engine";

import {
  runDocumentDataAdapter,
} from "@/lib/document-engine/document-data-adapter";

import {
  curriculumDistributionDocumentAdapter,
  type CurriculumDistributionDocumentSource,
} from "@/lib/document-engine/adapters/curriculum-distribution-document-adapter";

type CurriculumDistributionDocumentPreviewProps = {
  source: CurriculumDistributionDocumentSource;
};

export async function CurriculumDistributionDocumentPreview({
  source,
}: CurriculumDistributionDocumentPreviewProps) {
  const document =
    await runDocumentDataAdapter(
      curriculumDistributionDocumentAdapter,
      source,
    );

  return (
    <DocumentRenderer
      document={document}
    />
  );
}