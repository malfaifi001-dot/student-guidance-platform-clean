import {
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "./certificate-types";

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
  const prefix = getRecipientPrefix(input.recipientType);
  const name = [prefix, input.recipientName].filter(Boolean).join(" ");
  const typeLabel = getCertificateTypeLabel(input.certificateType);
  const reason = input.reason?.trim();

  if (input.certificateType === "participation") {
    return `تقديرًا لمشاركة ${name} الفاعلة${reason ? ` في ${reason}` : ""}.`;
  }

  if (input.certificateType === "excellence") {
    return `نظير تميز ${name}${reason ? ` في ${reason}` : ""}.`;
  }

  if (input.certificateType === "achievement") {
    return `تقديرًا لإنجاز ${name}${reason ? ` في ${reason}` : ""}.`;
  }

  if (input.certificateType === "cooperation") {
    return `نظير تعاون ${name} المثمر${reason ? ` في ${reason}` : ""}.`;
  }

  return `تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى ${name}${reason ? ` وذلك تقديرًا لـ ${reason}` : ""}.`;
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
