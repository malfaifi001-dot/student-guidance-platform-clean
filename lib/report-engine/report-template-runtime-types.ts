export type RuntimeWorkflowFieldOption = {
  key: string;
  label: string;
  type?: string;
  source: "workflow" | "fallback";
  stepTitle?: string;
};

export type RuntimePreviewCaseValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

export type RuntimePreviewEvidence = {
  id: string;
  title: string;
  imageUrl?: string;
  fileUrl?: string;
  caption?: string;
};

export type RuntimePreviewCaseData = {
  found: boolean;
  caseId?: string;
  serviceSlug?: string;
  serviceName?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  student?: {
    id?: string;
    name?: string;
    nationalId?: string;
    grade?: string;
    classroom?: string;
    stage?: string;
    guardianName?: string;
    guardianPhone?: string;
  };

  values: RuntimePreviewCaseValue[];
  evidences: RuntimePreviewEvidence[];
};

export type RuntimePreviewResponse = {
  ok: boolean;
  mode: "case" | "sample";
  message: string;
  data?: RuntimePreviewCaseData;
};