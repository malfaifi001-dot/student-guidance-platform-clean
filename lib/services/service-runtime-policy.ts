export type StudentRequirementMode =
  | "none"
  | "single"
  | "multiple"
  | "target_audience";

export type ServiceRuntimePolicy = {
  serviceSlug: string;
  showsStudentPicker: boolean;
  supportsMultipleStudents: boolean;
  studentMode: StudentRequirementMode;
  evidenceMode: "none" | "guidance_programs_only";
  committeeChainEnabled: boolean;
};

export const serviceRuntimePolicies: Record<string, ServiceRuntimePolicy> = {
  "student-follow-up": {
    serviceSlug: "student-follow-up",
    showsStudentPicker: true,
    supportsMultipleStudents: false,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "family-school-communication": {
    serviceSlug: "family-school-communication",
    showsStudentPicker: true,
    supportsMultipleStudents: false,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "student-guidance-services": {
    serviceSlug: "student-guidance-services",
    showsStudentPicker: true,
    supportsMultipleStudents: true,
    studentMode: "single",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },

  "guidance-programs": {
    serviceSlug: "guidance-programs",
    showsStudentPicker: false,
    supportsMultipleStudents: false,
    studentMode: "target_audience",
    evidenceMode: "guidance_programs_only",
    committeeChainEnabled: false,
  },

  "committees-meetings": {
    serviceSlug: "committees-meetings",
    showsStudentPicker: false,
    supportsMultipleStudents: false,
    studentMode: "none",
    evidenceMode: "none",
    committeeChainEnabled: true,
  },

  "activity-programs-school-broadcast": {
    serviceSlug: "activity-programs-school-broadcast",
    showsStudentPicker: false,
    supportsMultipleStudents: false,
    studentMode: "none",
    evidenceMode: "none",
    committeeChainEnabled: false,
  },
};

export function getServiceRuntimePolicy(serviceSlug: string): ServiceRuntimePolicy {
  return (
    serviceRuntimePolicies[serviceSlug] ?? {
      serviceSlug,
      showsStudentPicker: false,
      supportsMultipleStudents: false,
      studentMode: "none",
      evidenceMode: "none",
      committeeChainEnabled: false,
    }
  );
}
