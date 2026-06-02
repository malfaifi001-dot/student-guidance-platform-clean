import { AppreciationCertificatePreview } from "@/components/report-engine/appreciation-certificate-preview";
import { appreciationCertificateTemplatePreset } from "@/components/report-engine/appreciation-certificate-preview";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type PageProps = {
  searchParams?: Promise<{
    payload?: string;
    pdf?: string;
  }>;
};

type Payload = Record<string, unknown> & {
  student?: {
    id?: string;
    fullName?: string;
    nationalId?: string | null;
    gender?: string | null;
    grade?: string | null;
    classroom?: string | null;
    stage?: string | null;
  };
};

export default async function AppreciationCertificatePdfPreviewPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const payload = decodePayload(resolvedSearchParams.payload);
  const previewCaseData = buildPreviewCaseData(payload);

  return (
    <main dir="rtl" className="min-h-screen bg-white p-0">
      <AppreciationCertificatePreview
        template={appreciationCertificateTemplatePreset}
        previewCaseData={previewCaseData}
        pdfMode
      />
    </main>
  );
}

function decodePayload(value?: string): Payload {
  if (!value) return {};

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const parsed = JSON.parse(json);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildPreviewCaseData(payload: Payload): RuntimePreviewCaseData {
  const student = payload.student || {};

  const allValues = {
    ...payload,

    studentName: pickValue(
      payload.studentName,
      pickValue(student.fullName, "")
    ),

    recipientName: pickValue(
      payload.recipientName,
      pickValue(student.fullName, "")
    ),

    studentGender: pickValue(payload.studentGender, pickValue(student.gender, "")),

    studentClass:
      pickValue(payload.studentClass, "") ||
      [student.grade, student.classroom].filter(Boolean).join(" / "),

    stage: pickValue(payload.stage, pickValue(student.stage, "")),
  };

  delete (allValues as Record<string, unknown>).student;

  return {
    found: true,
    caseId: pickValue(payload.id, "appreciation-certificate-preview"),
    serviceSlug: "student-follow-up",
    serviceName: "متابعة الطلاب",
    title: "شهادة شكر وتقدير",
    status: pickValue(payload.status, "ISSUED"),
    createdAt: pickValue(payload.createdAt, new Date().toISOString()),
    updatedAt: pickValue(payload.updatedAt, new Date().toISOString()),
    student: {
      id: pickValue(student.id, ""),
      name: pickValue(student.fullName, ""),
      nationalId: pickValue(student.nationalId, ""),
      grade: pickValue(student.grade, ""),
      classroom: pickValue(student.classroom, ""),
      stage: pickValue(student.stage, ""),
      guardianName: "",
      guardianPhone: "",
    },
    values: Object.entries(allValues).map(([fieldKey, value]) => ({
      fieldKey,
      fieldLabel: fieldKey,
      value: typeof value === "string" ? value : String(value ?? ""),
    })),
    evidences: [],
  };
}

function pickValue(value: unknown, fallback: string) {
  if (value === undefined || value === null) return fallback;

  const cleaned = String(value).trim();

  if (!cleaned || cleaned === "null" || cleaned === "undefined") {
    return fallback;
  }

  return cleaned;
}
