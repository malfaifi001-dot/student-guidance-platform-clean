import type { ReportDesignId } from "../report-design-types";

export type FinalReportValueItem = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  valueItems?: string[];
};

export type PreviewCaseData = {
  hasStudentDataTable?: boolean;
  evidences?: Array<{
    id?: string;
    title?: string;
    url?: string;
    fileUrl?: string;
    imageUrl?: string;
    publicUrl?: string;
    storagePath?: string;
    attachmentId?: string;
    fileId?: string;
    evidenceId?: string;
    type?: "IMAGE" | "FILE";
    mimeType?: string | null;
    caption?: string;
  }>;
  values?: Array<{
    fieldKey?: string | null;
    fieldLabel?: string | null;
    value?: string | null;
    valueItems?: string[] | null;
  }>;
  serviceName?: string;
  serviceSlug?: string;
  caseId?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    name?: string;
    grade?: string;
    classroom?: string;
    stage?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
};

export type ReportDesignRendererProps = {
  designId?: ReportDesignId;
  template: any;
  activePage?: any;
  activePageId: string;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  onActivePageChange: (pageId: string) => void;
  onAddPage: () => void;
  onMovePage?: (pageId: string, direction: "previous" | "next") => void;
  onDeletePage?: (pageId: string) => void;
  canMovePage?: (pageId: string, direction: "previous" | "next") => boolean;
  canDeletePage?: (pageId: string) => boolean;
  renderMode?: "single" | "stack";
  chromeLayout?: "joined" | "split" | "none";

  suppressAutoEvidencePages?: boolean;
};

