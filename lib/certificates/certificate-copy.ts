import { getCertificateTypeLabel, getRecipientPrefix } from "./certificate-types";

export type CertificateDraft = {
  templateKey?: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  recipientIdentity?: string;
  recipientStudentId?: string;
  grade?: string;
  classroom?: string;
  reason?: string;
  schoolName?: string;
  issueDate: string;
  issuerName?: string;
  principalName?: string;
  body?: string;
  introText?: string;
  bodyText?: string;
};

export function buildCertificateTitle(type: string) {
  const label = getCertificateTypeLabel(type);
  return label === "شهادة" ? "شهادة شكر وتقدير" : `شهادة ${label}`;
}

export function buildCertificateBody(input: {
  certificateType: string;
  recipientType: string;
  recipientName: string;
  schoolName?: string;
  reason?: string;
}) {
  const reason = normalizeCertificateReason(input.reason);
  const feminine = ["student_female", "teacher_female", "guardian_female"].includes(
    input.recipientType,
  );
  const pronoun = feminine ? "لها" : "له";

  const school = String(input.schoolName || "المدرسة").trim() || "المدرسة";
  const prefix = getRecipientPrefix(input.recipientType);
  const recipient = `${prefix}${prefix ? " " : ""}${input.recipientName || "المستفيد"}`;
  const reasonPart = reason ? ` ${reason}` : "";

  const efforts = feminine ? "لجهودها وتميزها" : "لجهوده وتميزه";

  return `تتقدم إدارة مدرسة ${school} بخالص الشكر والتقدير إلى ${recipient}، تقديرًا ${efforts}${reasonPart}، مع أطيب الأمنيات ${pronoun} بدوام التوفيق والنجاح.`;
}

export function buildCertificateIntro(schoolName?: string) {
  const school = String(schoolName || "المدرسة").trim() || "المدرسة";
  return `تتقدم إدارة مدرسة ${school} بخالص الشكر والتقدير إلى`;
}

export function buildCertificateRecognition(input: {
  recipientType: string;
  reason?: string;
}) {
  const reason = normalizeCertificateReason(input.reason);
  const feminine = ["student_female", "teacher_female", "guardian_female"].includes(input.recipientType);
  const pronoun = feminine ? "لها" : "له";
  const efforts = feminine ? "لجهودها وتميزها" : "لجهوده وتميزه";
  const reasonPart = reason ? ` ${reason}` : "";
  return `تقديرًا ${efforts}${reasonPart}، مع أطيب الأمنيات ${pronoun} بدوام التوفيق والنجاح.`;
}

function normalizeCertificateReason(value?: string) {
  const reason = String(value || "").trim();

  if (!reason) return "";

  return reason
    .replace(/[.,،،。؛;!؟?]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeCertificateDraft(input: Partial<CertificateDraft>): CertificateDraft {
  const certificateType = input.certificateType || "thanks";
  const recipientType = input.recipientType || "student";
  const recipientName = String(input.recipientName || "").trim();
  const reason = String(input.reason || "").trim();

  return {
    templateKey: String(input.templateKey || "certificate-modern-blue").trim() || "certificate-modern-blue",
    certificateType,
    recipientType,
    recipientName,
    schoolName: String(input.schoolName || "").trim(),
    recipientIdentity: String(input.recipientIdentity || "").trim(),
    recipientStudentId: String(input.recipientStudentId || "").trim(),
    grade: String(input.grade || "").trim(),
    classroom: String(input.classroom || "").trim(),
    reason,
    issueDate:
      String(input.issueDate || "").trim() ||
      new Date().toISOString().slice(0, 10),
    issuerName: String(input.issuerName || "").trim(),
    principalName: String(input.principalName || "").trim(),
    body:
      String(input.body || "").trim() ||
      buildCertificateRecognition({
        recipientType,
        reason,
      }),
    introText: String(input.introText || "").trim() || buildCertificateIntro(String(input.schoolName || "").trim()),
    bodyText: String(input.bodyText || input.body || "").trim() || buildCertificateRecognition({ recipientType, reason }),
  };
}
