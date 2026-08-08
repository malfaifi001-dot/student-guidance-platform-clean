import type { ComponentType, CSSProperties, ReactNode } from "react";

import type { ReportBlockPresentation } from "./report-block-presentation";

export type ReportDesignPalette = {
  subtleTextClass: string;
  dotClass: string;
  iconClass: string;
  badgeClass: string;
  noticeClass: string;
  cardShellClass: string;
  softShellClass: string;
  highlightShellClass: string;
  outlineShellClass: string;
  quoteShellClass: string;
  heroShellClass: string;
  detailsGridClassName?: string;
};

export type ReportDesignBlockPresentation = {
  shellClassName: string;
  titleClassName?: string;
  contentClassName?: string;
};

export type ReportValueItem = {
  key?: string;
  label: string;
  value?: string | string[] | null;
  valueItems?: string[];
};

export type ReportValueGridProps = {
  items: ReportValueItem[];
  block?: Record<string, unknown>;
};

export type ReportFieldRendererProps = {
  item: ReportValueItem;
  index: number;
  block?: Record<string, unknown>;
};

export type ReportEvidenceItem = {
  id?: string;
  title?: string;
  caption?: string;
  imageUrl?: string;
  url?: string;
  fileUrl?: string;
  publicUrl?: string;
  storagePath?: string;
  [key: string]: unknown;
};

export type ReportEvidenceRendererProps = {
  block: Record<string, any>;
  items: ReportEvidenceItem[];
  startIndex: number;
  placeholderMode: boolean;
  textAlign: string;
  shellClassName: string;
  gridClassName: string;
  gridStyle: CSSProperties;
  getImageUrl: (item: ReportEvidenceItem) => string;
  getFigureStyle: () => CSSProperties;
  getImageStyle: () => CSSProperties;
  getImageClassName: () => string;
  getImageHeightClassName: () => string;
  renderTitle: () => ReactNode;
};

export type ReportSemanticBlockRenderProps = {
  block: Record<string, any>;
  renderedContent: string;
  textAlign: string;
  context: Record<string, string>;
  splitLines: (value: string) => string[];
  splitParagraphs: (value: string) => string[];
};

export type ReportSignatureItem = {
  key: string;
  label: string;
  signerName?: string;
  signerTitle?: string;
  imageUrl?: string;
};

export type ReportSignatureRendererProps = {
  block: Record<string, any>;
  items: ReportSignatureItem[];
  renderTitle: () => ReactNode;
};

export type ReportTableTheme = {
  sectionClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
};

export type ReportDesignPageComponentProps = {
  page?: any;
  context: Record<string, string>;
  previewCase: any;
  pageLabel: string;
  PageBlocks: ComponentType<any>;
  MetaCard: ComponentType<any>;
  SideMeta: ComponentType<{ label: string; value: string }>;
  MiniStat: ComponentType<{ label: string; value: string }>;
  DesignFooter: ComponentType<{ text: string; barClass: string }>;
  getDesignLogoSrc: (context: Record<string, string>) => string;
  getDesignHeaderAlign: (
    context: Record<string, string>,
    key: string,
    fallback?: "right" | "center" | "left",
  ) => "right" | "center" | "left";
  getDesignHeaderText: (
    context: Record<string, string>,
    key: string,
    fallback: string,
  ) => string;
  collectFinalValues: (data: any) => any[];
  getValidPreviewEvidences: (previewCase: any) => any[];
};

export type ReportDesignImplementation = {
  Page: ComponentType<ReportDesignPageComponentProps>;
  palette: ReportDesignPalette;
  defaultLogoWidthPx?: number;
  defaultLogoHeightPx?: number;
  getBlockPresentation?: (
    presentation: ReportBlockPresentation,
  ) => ReportDesignBlockPresentation;
  renderBulletList?: (props: ReportSemanticBlockRenderProps) => ReactNode;
  renderNarrative?: (props: ReportSemanticBlockRenderProps) => ReactNode;
  ValueGrid?: ComponentType<ReportValueGridProps>;
  FieldRenderer?: ComponentType<ReportFieldRendererProps>;
  EvidenceRenderer?: ComponentType<ReportEvidenceRendererProps>;
  SignatureRenderer?: ComponentType<ReportSignatureRendererProps>;
  getTableTheme?: (block: Record<string, unknown>) => ReportTableTheme;
  BlockRenderer?: ComponentType<ReportSemanticBlockRenderProps>;
};
