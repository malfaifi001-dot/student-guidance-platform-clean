import type {
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportDocumentPage,
  ReportSignatureBlock,
} from "@/lib/report-engine/document-draft/report-document-types";

function isSignatureBlock(block: ReportDocumentBlock): block is ReportSignatureBlock {
  return block.type === "SIGNATURES";
}

function removeSignatureBlocksFromPage(page: ReportDocumentPage): ReportDocumentPage {
  return {
    ...page,
    blocks: page.blocks.filter((block) => !isSignatureBlock(block)),
  };
}

export function getReportSignatureBlock(
  draft: ReportDocumentDraft,
): ReportSignatureBlock | null {
  for (const page of draft.pages) {
    const signatureBlock = page.blocks.find(isSignatureBlock);

    if (signatureBlock) return signatureBlock;
  }

  const signatures = draft.payload.signatures || [];

  if (signatures.length === 0) return null;

  return {
    id: "system-signatures",
    type: "SIGNATURES",
    title: "الاعتمادات",
    signatures,
    order: 999999,
    source: "SYSTEM",
    locked: true,
  };
}

export function applyReportSignaturePolicy(
  draft: ReportDocumentDraft,
): ReportDocumentDraft {
  const signatureBlock = getReportSignatureBlock(draft);

  const pagesWithoutSignatures = draft.pages.map(removeSignatureBlocksFromPage);

  if (!signatureBlock) {
    return {
      ...draft,
      pages: pagesWithoutSignatures,
    };
  }

  const pages =
    pagesWithoutSignatures.length > 0
      ? pagesWithoutSignatures
      : [
          {
            id: "page-auto-1",
            title: draft.title || "التقرير",
            order: 1000,
            kind: "AUTO" as const,
            blocks: [],
          },
        ];

  const lastPage = pages[pages.length - 1];

  return {
    ...draft,
    pages: pages.map((page) =>
      page.id === lastPage.id
        ? {
            ...page,
            blocks: [
              ...page.blocks.filter((block) => !isSignatureBlock(block)),
              {
                ...signatureBlock,
                order: 999999,
                locked: true,
                source: "SYSTEM",
              },
            ],
          }
        : page,
    ),
  };
}