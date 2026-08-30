import { getCertificateTypeLabel } from "./certificate-types";

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
  issueDate: string;
  issuerName?: string;
  principalName?: string;
  body?: string;
};

export function buildCertificateTitle(type: string) {
  const label = getCertificateTypeLabel(type);
  return label === "شهادة" ? "شهادة شكر وتقدير" : `شهادة ${label}`;
}

export function buildCertificateBody(input: {
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason?: string;
}) {
  const reason = normalizeCertificateReason(input.reason);
  const feminine = ["student_female", "teacher_female", "guardian_female"].includes(
    input.recipientType,
  );
  const pronoun = feminine ? "لها" : "له";

  if (reason) {
    return `تقديرًا ${feminine ? "لجهودها وتميزها" : "لجهوده وتميزه"} ${reason}، مع أطيب الأمنيات ${pronoun} بدوام التوفيق والنجاح.`;
  }

  const efforts = feminine ? "لجهودها وتميزها" : "لجهوده وتميزه";

  return `تقديرًا ${efforts}، مع أطيب الأمنيات ${pronoun} بدوام التوفيق والنجاح.`;
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
      buildCertificateBody({
        certificateType,
        recipientType,
        recipientName,
        reason,
      }),
  };
}
