export type AssessmentInterventionTargetType =
  | "STUDENT_SUPPORT"
  | "STUDENT_EXCELLENCE"
  | "STUDENT_GROUP_SUBJECT"
  | "STUDENT_GROUP_CUSTOM"
  | "CLASSROOM_SUPPORT"
  | "GRADE_SUPPORT"
  | "SUBJECT_SUPPORT";

export type AssessmentInterventionPackageStudent = {
  id: string;
  name: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

export type AssessmentInterventionPackage = {
  id: string;
  targetType: AssessmentInterventionTargetType;
  title: string;
  description: string;
  recommendedAction: string;
  riskLevel: "HIGH" | "MEDIUM" | "EXCELLENCE";

  primaryStudentId?: string | null;
  students: AssessmentInterventionPackageStudent[];

  subjects: string[];
  grades: string[];
  classrooms: string[];

  averagePercentage: number;
  rowsCount: number;
};