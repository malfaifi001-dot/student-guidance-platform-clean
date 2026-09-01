import {
  getDocumentPageStyle,
} from "../document-design-tokens";

import { DocumentFooterZone } from "./document-footer-zone";
import { DocumentSignatureZone } from "./document-signature-zone";

import type {
  DocumentPageProps,
} from "../document-layout-types";

export function DocumentPage({
  children,
  signature,
  footer,
  className = "",
  style,
  size = "A4",
  orientation = "portrait",
  direction = "rtl",
  fixedHeight = true,
  pageNumber,
  documentId,
}: DocumentPageProps) {
  const pageStyle =
    size === "A4"
      ? getDocumentPageStyle({
          orientation,
          fixedHeight,
        })
      : getDocumentPageStyle({
          orientation,
          fixedHeight,
        });

  return (
    <section
      dir={direction}
      className={[
        "relative mx-auto flex flex-col bg-white text-slate-950",
        "print:m-0 print:shadow-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...pageStyle,
        ...style,
      }}
      data-document-page
      data-document-page-size={size}
      data-document-page-orientation={
        orientation
      }
      data-document-page-fixed-height={
        String(fixedHeight)
      }
      data-document-page-number={
        pageNumber ?? undefined
      }
      data-document-id={
        documentId ?? undefined
      }
    >
      {children}
      {signature ? (
        <DocumentSignatureZone placement="bottom">
          {signature}
        </DocumentSignatureZone>
      ) : null}
      {footer ? (
        <DocumentFooterZone>
          {footer}
        </DocumentFooterZone>
      ) : null}
    </section>
  );
}
