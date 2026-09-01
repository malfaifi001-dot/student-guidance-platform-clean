export type ReportTemplateId =
  | "official-long"
  | "visual-activity"
  | "executive-brief";

export type EvidenceLayout =
  | "auto"
  | "single-large"
  | "two-columns"
  | "stacked"
  | "grid-2x2"
  | "one-per-page";

export type ReportIdentity = {
  ministryLogoUrl?: string;
  schoolLogoUrl?: string;

  ministryName: string;
  educationDepartment: string;
  educationOffice: string;
  schoolName: string;

  counselorName: string;
  counselorTitle: string;

  academicYear: string;
  semester: string;
};

export type ReportEvidence = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  fileName?: string;
  fileUrl?: string;
  url?: string;
  sourceType?: "IMAGE" | "FILE" | "LINK";
  presentationMode?: "IMAGE" | "QR" | "CLICKABLE_LINK";
};

export type ReportSection = {
  id: string;
  title: string;
  content?: string;
  items?: {
    label: string;
    value: string;
  }[];
};

export type OfficialReportData = {
  title: string;
  subtitle?: string;

  serviceName: string;
  category?: string;
  reportDate: string;
  targetGroup?: string;

  cover: {
    programTitle: string;
    executionDate: string;
    schoolYear: string;
    semester: string;
    shortDescription?: string;
  };

  sections: ReportSection[];

  evidences: ReportEvidence[];
  evidenceLayout: EvidenceLayout;

  approval: {
    counselorName: string;
    principalName?: string;
    date: string;
  };
};

export type ReportTemplateFieldKey =
  | "title"
  | "subtitle"
  | "serviceName"
  | "category"
  | "reportDate"
  | "targetGroup"
  | "cover.programTitle"
  | "cover.executionDate"
  | "cover.shortDescription"
  | "sections"
  | "evidences"
  | "approval";

export type ReportTemplateDefinition = {
  id: ReportTemplateId;
  name: string;
  description: string;
  bestFor: string[];
  requiredFields: ReportTemplateFieldKey[];
  optionalFields: ReportTemplateFieldKey[];
  defaultEvidenceLayout: EvidenceLayout;
  supportsCoverPage: boolean;
};
