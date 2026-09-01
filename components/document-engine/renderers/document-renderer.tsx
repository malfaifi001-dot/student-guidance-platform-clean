import {
  DocumentContentZone,
  DocumentFooterZone,
  DocumentHeaderZone,
  DocumentPage,
  DocumentSignatureZone,
} from "@/components/document-engine";

import {
  normalizeDocumentModel,
} from "@/lib/document-engine/document-runtime";

import type {
  DocumentModel,
} from "@/lib/document-engine/document-types";

import {
  DocumentBlockRenderer,
} from "./document-block-renderer";

import {
  DocumentSignatures,
} from "./document-signatures";

type DocumentRendererProps = {
  document: DocumentModel;
  className?: string;
};

export function DocumentRenderer({
  document,
  className = "",
}: DocumentRendererProps) {
  const normalized =
    normalizeDocumentModel(
      document,
    );

  return (
    <DocumentPage
      direction={
        normalized.direction
      }
      documentId={
        normalized.id
      }
      className={[
        "p-[12mm]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <DocumentHeaderZone className="mb-[6mm]">
        <div className="border-b border-slate-200 pb-[4mm]">
          {normalized.header
            ?.organizationName ? (
            <div className="mb-1 text-[11px] font-bold text-slate-500">
              {
                normalized
                  .header
                  .organizationName
              }
            </div>
          ) : null}

          <h1 className="text-[20px] font-extrabold leading-[1.5] text-slate-950">
            {
              normalized.header
                ?.title ??
              normalized.title
            }
          </h1>

          {normalized.header
            ?.subtitle ? (
            <p className="mt-1 text-[11px] leading-6 text-slate-500">
              {
                normalized
                  .header
                  .subtitle
              }
            </p>
          ) : null}

          {normalized.header?.meta
            ?.length ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
              {normalized.header.meta.map(
                (
                  item,
                  index,
                ) => (
                  <span
                    key={`${normalized.id}-meta-${index}`}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>
      </DocumentHeaderZone>

      <DocumentContentZone>
        <div className="space-y-[5mm]">
          {normalized.sections.map(
            (section) => (
              <section
                key={section.id}
                className="space-y-[3mm]"
                data-document-section
              >
                {section.title ? (
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900">
                      {
                        section.title
                      }
                    </h2>

                    {section.description ? (
                      <p className="mt-1 text-[10px] leading-5 text-slate-500">
                        {
                          section
                            .description
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {section.blocks.map(
                  (block) => (
                    <DocumentBlockRenderer
                      key={block.id}
                      block={block}
                    />
                  ),
                )}
              </section>
            ),
          )}
        </div>

        <DocumentSignatureZone
          align="center"
          className="pt-[8mm]"
        >
          <DocumentSignatures
            signatures={
              normalized.signatures
            }
          />
        </DocumentSignatureZone>
      </DocumentContentZone>

      <DocumentFooterZone className="mt-[6mm] border-t border-slate-200 pt-[3mm]">
        <div className="flex items-center justify-between gap-4 text-[9px] text-slate-400">
          <span>
            {
              normalized.footer
                ?.text ?? ""
            }
          </span>

          <span>
            {
              normalized.footer
                ?.secondaryText ??
              ""
            }
          </span>
        </div>
      </DocumentFooterZone>
    </DocumentPage>
  );
}