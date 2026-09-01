import type {
  CSSProperties,
  ReactNode,
} from "react";

export type DocumentPageSize =
  | "A4";

export type DocumentPageOrientation =
  | "portrait"
  | "landscape";

export type DocumentDirection =
  | "rtl"
  | "ltr";

export type DocumentSignatureAlignment =
  | "start"
  | "center"
  | "end"
  | "stretch";

export type DocumentSignaturePlacement =
  | "flow"
  | "bottom";

export type DocumentZoneProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export type DocumentPageProps = {
  children: ReactNode;

  /** Optional structural zones rendered after the page content. */
  signature?: ReactNode;
  footer?: ReactNode;

  className?: string;
  style?: CSSProperties;

  size?: DocumentPageSize;
  orientation?: DocumentPageOrientation;
  direction?: DocumentDirection;

  /**
   * true:
   * page owns an exact physical A4 height.
   *
   * false:
   * page keeps the A4 minimum height but may grow when a
   * document variant intentionally needs normal page flow.
   */
  fixedHeight?: boolean;

  pageNumber?: number;
  documentId?: string;
};

export type DocumentSignatureZoneProps =
  DocumentZoneProps & {
    align?: DocumentSignatureAlignment;
    placement?: DocumentSignaturePlacement;
  };
