export type StudentAudienceLabels = {
  students: string;
  student: string;
  uploadStudents: string;
  studentData: string;
};

export function getStudentAudienceLabels(gender: string | null | undefined): StudentAudienceLabels {
  const isFemale = String(gender || "").trim().toUpperCase() === "FEMALE";
  return isFemale
    ? { students: "الطالبات", student: "الطالبة", uploadStudents: "رفع الطالبات", studentData: "بيانات الطالبات" }
    : { students: "الطلاب", student: "الطالب", uploadStudents: "رفع الطلاب", studentData: "بيانات الطلاب" };
}
