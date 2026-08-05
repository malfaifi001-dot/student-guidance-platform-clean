import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";

export type PortfolioPrintData = {
  portfolio: {
    id: string;
    title: string;
    academicYear: string;
    term: string;
    themeId: string;
    status: string;
    introText: string;
    conclusionText: string;
    bioText: string;
    description: string;
    preferences: {
      showSchoolName: boolean;
      showPrincipalName: boolean;
      showCoverStatistics: boolean;
      showTableOfContents: boolean;
      showPerformanceDividers: boolean;
    };
  };
  owner: { name: string; jobTitle: string };
  school: {
    name: string;
    logoUrl: string | null;
    principalName: string | null;
    academicYear: string | null;
    currentSemester: string | null;
  };
  sections: Array<{
    id: string;
    key: string;
    kind: string;
    title: string;
    introText: string;
    sortOrder: number;
    isEnabled: boolean;
  }>;
  biography: {
    professionalSummary: string;
    specialization: string;
    academicQualification: string;
    yearsOfExperience: string;
    skills: string;
    professionalInterests: string;
  };
  educationIdentity: {
    vision: string;
    mission: string;
    pillars: string[];
    values: string[];
    strategicObjectives: string[];
  };
  qualificationItems: Array<{
    id: string;
    type: "QUALIFICATION" | "COURSE" | "CERTIFICATE";
    title: string;
    issuer: string;
    date: string;
    hours: string;
    description: string;
    attachmentUrl: string;
    attachmentMimeType: "image/jpeg" | "image/png" | "image/webp" | "";
    attachmentKind: "IMAGE" | "";
    sortOrder: number;
    isVisible: boolean;
  }>;
  customEvidence: Array<{
    id: string;
    sectionId: string | null;
    title: string;
    description: string;
    fileUrl: string;
    mimeType: string;
    sortOrder: number;
    isVisible: boolean;
  }>;
  performanceSections: Array<{
    id: string;
    key: string;
    title: string;
    weight: number;
    serviceSlug: string;
    intro: string;
    sortOrder: number;
    isEnabled: boolean;
    reports: Array<{
      id: string;
      title: string;
      status: string;
      generatedAt: string | null;
      createdAt: string;
      evidenceCount: number;
      caseTitle: string | null;
      serviceName: string;
      previewUrl: string;
      sourceType: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT";
      content: PortfolioReportContent | null;
    }>;
  }>;
  totals: { reports: number; evidences: number; sections: number };
};

export type PortfolioReportSectionModel =
  | { kind: "details"; fields: PortfolioReportContent["normalizedFields"] }
  | { kind: "narrative"; body: string }
  | { kind: "evidence"; items: PortfolioReportContent["evidenceItems"] };

export type PortfolioReportPageModel = {
  key: string;
  sections: PortfolioReportSectionModel[];
};
