export type StudentRequirementMode =
  | "none"
  | "single"
  | "multiple"
  | "target_audience";

export type ServiceRuntimePolicy = {
  serviceSlug: string;
  requiresStudent: boolean;
  supportsMultipleStudents: boolean;
  studentMode: StudentRequirementMode;
  evidenceMode: "none" | "guidance_programs_only";
  committeeChainEnabled: boolean;
};

export const serviceRuntimePolicies: Record<string, ServiceRuntimePolicy> = {
  "student-follow-up": {
    serviceSlug: "student-follow-up",
    requiresStudent: true,
    supportsMultipleStudents: false,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "family-school-communication": {
    serviceSlug: "family-school-communication",
    requiresStudent: true,
    supportsMultipleStudents: false,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "student-guidance-services": {
    serviceSlug: "student-guidance-services",
    requiresStudent: true,
    supportsMultipleStudents: true,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "guidance-programs": {
    serviceSlug: "guidance-programs",
    requiresStudent: false,
    supportsMultipleStudents: false,
    studentMode: "target_audience",
    evidenceMode: "guidance_programs_only",
    committeeChainEnabled: false,
  },

  "committees-meetings": {
    serviceSlug: "committees-meetings",
    requiresStudent: false,
    supportsMultipleStudents: false,
    studentMode: "none",
    evidenceMode: "none",
    committeeChainEnabled: true,
  },
};

export function getServiceRuntimePolicy(serviceSlug: string): ServiceRuntimePolicy {
  return (
    serviceRuntimePolicies[serviceSlug] ?? {
      serviceSlug,
      requiresStudent: false,
      supportsMultipleStudents: false,
      studentMode: "none",
      evidenceMode: "none",
      committeeChainEnabled: false,
    }
  );
}