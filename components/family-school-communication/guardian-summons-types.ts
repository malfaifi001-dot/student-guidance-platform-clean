export type GuardianSummonsStatus = "DRAFT" | "ISSUED" | "PRINTED";

export type GuardianSummonsAttendanceStatus =
  | "PENDING"
  | "ATTENDED"
  | "ABSENT"
  | "RESCHEDULED"
  | "PHONE_CONTACT"
  | "CLOSED";

export type GuardianSummonsStudent = {
  id: string;
  fullName: string;
  nationalId: string | null;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  guardian: {
    name: string;
    phone: string | null;
  } | null;
};

export type GuardianSummonsRecord = {
  id: string;
  student: GuardianSummonsStudent;
  guardianName: string;
  guardianPhone: string;
  summonDay: string;
  summonDate: string;
  summonTime: string;
  summonPeriod: string;
  summonReason: string;
  notes: string;
  status: GuardianSummonsStatus;
  attendanceStatus: GuardianSummonsAttendanceStatus;
  postNotes: string;
  createdAt: string;
  issuedAt?: string;
  printedAt?: string;
};

export const GUARDIAN_SUMMONS_STORAGE_KEY =
  "student-guidance.guardian-summons.records.v2";

export const guardianSummonsAttendanceLabels: Record<
  GuardianSummonsAttendanceStatus,
  string
> = {
  PENDING: "بانتظار الحضور",
  ATTENDED: "حضر ولي الأمر",
  ABSENT: "لم يحضر",
  RESCHEDULED: "أعيدت الجدولة",
  PHONE_CONTACT: "تم التواصل هاتفيًا",
  CLOSED: "مغلق",
};

export const guardianSummonsStatusLabels: Record<GuardianSummonsStatus, string> = {
  DRAFT: "مسودة",
  ISSUED: "صدر الخطاب",
  PRINTED: "تم تحميل PDF",
};

export const guardianSummonsReasonOptions = [
  "غيابه المتكرر لأكثر من خمسة أيام بدون عذر",
  "تأخره المتكرر لأكثر من خمسة أيام بدون عذر",
  "ضعف التحصيل الدراسي",
  "مشكلة سلوكية",
  "أخرى",
];


