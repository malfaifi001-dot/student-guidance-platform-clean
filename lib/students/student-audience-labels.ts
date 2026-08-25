export type StudentAudienceLabels = {
  students: string;
  student: string;
  uploadStudents: string;
  studentData: string;
};

export type AssessmentAudienceLabels = StudentAudienceLabels & {
  resultsTitle: string;
  newAnalysis: string;
  selectStudents: string;
  studentCount: string;
  noStudents: string;
  analyzedResults: string;
  targetStudents: string;
  unlinkedStudents: string;
};

export function getStudentAudienceLabels(gender: string | null | undefined): StudentAudienceLabels {
  const isFemale = String(gender || "").trim().toUpperCase() === "FEMALE";
  return isFemale
    ? { students: "الطالبات", student: "الطالبة", uploadStudents: "رفع الطالبات", studentData: "بيانات الطالبات" }
    : { students: "الطلاب", student: "الطالب", uploadStudents: "رفع الطلاب", studentData: "بيانات الطلاب" };
}

export function getAssessmentAudienceLabels(gender: string | null | undefined): AssessmentAudienceLabels {
  const isFemale = String(gender || "").trim().toUpperCase() === "FEMALE";
  return isFemale
    ? {
        students: "الطالبات",
        student: "الطالبة",
        uploadStudents: "رفع الطالبات",
        studentData: "بيانات الطالبات",
        resultsTitle: "تحليل نتائج الطالبات",
        newAnalysis: "إنشاء تحليل جديد لنتائج الطالبات",
        selectStudents: "اختاري الطالبات",
        studentCount: "عدد الطالبات",
        noStudents: "لم يتم العثور على طالبات",
        analyzedResults: "تم تحليل نتائج الطالبات",
        targetStudents: "الطالبات المستهدفات",
        unlinkedStudents: "الطالبات غير المرتبطات",
      }
    : {
        students: "الطلاب",
        student: "الطالب",
        uploadStudents: "رفع الطلاب",
        studentData: "بيانات الطلاب",
        resultsTitle: "تحليل نتائج الطلاب",
        newAnalysis: "إنشاء تحليل جديد لنتائج الطلاب",
        selectStudents: "اختر الطلاب",
        studentCount: "عدد الطلاب",
        noStudents: "لم يتم العثور على طلاب",
        analyzedResults: "تم تحليل نتائج الطلاب",
        targetStudents: "الطلاب المستهدفون",
        unlinkedStudents: "الطلاب غير المرتبطين",
      };
}
