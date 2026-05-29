export type ReportGenderMode = "MALE" | "FEMALE" | "NEUTRAL";

export type SmartTemplate = {
  id: string;
  title: string;
  content: string;
  type: "SYSTEM" | "PERSONAL";
};

export type ReportContextData = {
  studentName?: string;
  grade?: string;
  classroom?: string;
  serviceType?: string;
  serviceSlug?: string;
};