export type SmartReportType =
  | "GENERAL_CASE_REPORT"
  | "ACTIVITY_REPORT"
  | "MEETING_REPORT"
  | "FAMILY_COMMUNICATION_REPORT"
  | "STUDENT_FOLLOWUP_REPORT"
  | "EVIDENCE_REPORT"
  | "SUMMARY_REPORT";

export type SmartReportFieldImportance =
  | "PRIMARY"
  | "DETAIL"
  | "NARRATIVE"
  | "EVIDENCE_RELATED"
  | "SIGNATURE_RELATED"
  | "HIDDEN"
  | "TECHNICAL";

export type SmartReportReadinessStatus =
  | "READY"
  | "NEEDS_REVIEW"
  | "BLOCKED";

export type SmartReportEvidenceLayout =
  | "ONE_PER_PAGE"
  | "TWO_PER_PAGE"
  | "GRID_2X2"
  | "ATTACHMENT_LIST";

export type SmartReportField = {
  key: string;
  label: string;
  value: string | string[] | number | boolean | null;
  importance: SmartReportFieldImportance;
  group?: string;
};

export type SmartReportEvidenceItem = {
  id: string;
  title: string;
  url?: string;
  caption?: string;
  type?: "IMAGE" | "FILE";
};

export type SmartReportSignature = {
  key: string;
  label: string;
  signerName?: string | null;
  signerTitle?: string | null;
  signedAt?: string | null;
  imageUrl?: string | null;
  required?: boolean;
};

export type SmartReportIdentity = {
  ministryName?: string;
  educationDepartment?: string;
  educationOffice?: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  academicYear?: string;
  currentSemester?: string;
};

export type SmartReportCaseInfo = {
  id: string;
  title: string;
  status?: string;
  createdAt?: string;
  issuedAt?: string;
  issuedBy?: string;
};

export type SmartReportServiceInfo = {
  slug: string;
  name: string;
};

export type SmartReportStudentInfo = {
  name?: string;
  nationalId?: string;
  grade?: string;
  classroom?: string;
  stage?: string;
  guardianName?: string;
  guardianPhone?: string;
};

export type SmartReportReadiness = {
  status: SmartReportReadinessStatus;
  percentage: number;
  missingItems: string[];
  notes: string[];
};

export type SmartReportPayload = {
  reportType: SmartReportType;
  title: string;
  identity: SmartReportIdentity;
  caseInfo: SmartReportCaseInfo;
  service: SmartReportServiceInfo;
  student?: SmartReportStudentInfo | null;
  primaryFields: SmartReportField[];
  detailFields: SmartReportField[];
  narrative: {
    title: string;
    body: string;
  };
  evidence: {
    layout: SmartReportEvidenceLayout;
    items: SmartReportEvidenceItem[];
  };
  signatures: SmartReportSignature[];
  readiness: SmartReportReadiness;
};