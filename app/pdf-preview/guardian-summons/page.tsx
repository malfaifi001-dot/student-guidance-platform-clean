import { GuardianSummonsLetterPreview } from "@/components/report-engine/guardian-summons-letter-preview";
import { initialReportTextSnippets } from "@/lib/report-engine/report-template-builder-presets";
import { resolveGuardianSummonsTemplate } from "@/lib/report-engine/guardian-summons-template-runtime";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type PageProps = {
  searchParams?: Promise<{
    payload?: string;
    pdf?: string;
  }>;
};

type GuardianSummonsPdfPayload = {
  id?: string;
  status?: string;
  createdAt?: string;
  issuedAt?: string;
  printedAt?: string;

  student?: {
    id?: string;
    fullName?: string;
    nationalId?: string | null;
    grade?: string | null;
    classroom?: string | null;
    stage?: string | null;
  };

  guardianName?: string;
  guardianPhone?: string;

  summonDay?: string;
  summonDate?: string;
  summonTime?: string;
  summonPeriod?: string;
  summonReason?: string;
  notes?: string;

  ministryName?: string;
  educationDepartment?: string;
  educationOffice?: string;
  schoolName?: string;
  academicYear?: string;
  guidanceUnitName?: string;

  counselorName?: string;
  counselorTitle?: string;
  counselorGender?: string;

  schoolLeaderName?: string;
  schoolLeaderTitle?: string;
  schoolLeaderGender?: string;

  principalName?: string;
  principalTitle?: string;
  principalGender?: string;

  ministryLogoUrl?: string;
  schoolLogoUrl?: string;
};

export default async function GuardianSummonsCleanPdfPreviewPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const payload = decodePayload(resolvedSearchParams.payload);

  const template = await resolveGuardianSummonsTemplate();
  const previewCaseData = buildPreviewCaseData(payload);

  return (
    <main dir="rtl" className="min-h-screen bg-white p-0">
      <GuardianSummonsLetterPreview
        template={template}
        previewCaseData={previewCaseData}
        snippets={initialReportTextSnippets}
        pdfMode
        forceOfficialHeader
      />
    </main>
  );
}

function decodePayload(value?: string): GuardianSummonsPdfPayload {
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

function buildPreviewCaseData(
  payload: GuardianSummonsPdfPayload
): RuntimePreviewCaseData {
  const student = payload.student || {};

  const studentClass = [student.grade, student.classroom]
    .filter(Boolean)
    .join(" / ");

  const allValues = {
    ministryName: pickValue(payload.ministryName, "وزارة التعليم"),
    educationDepartment: pickValue(payload.educationDepartment, ""),
    educationOffice: pickValue(payload.educationOffice, ""),
    schoolName: pickValue(payload.schoolName, ""),
    academicYear: pickValue(payload.academicYear, ""),
    guidanceUnitName: pickValue(payload.guidanceUnitName, "الإرشاد الطلابي"),

    counselorName: pickValue(payload.counselorName, ""),
    counselorTitle: pickValue(payload.counselorTitle, ""),
    counselorGender: pickValue(payload.counselorGender, ""),

    schoolLeaderName: pickValue(
      payload.schoolLeaderName || payload.principalName,
      ""
    ),
    schoolLeaderTitle: pickValue(
      payload.schoolLeaderTitle || payload.principalTitle,
      ""
    ),
    schoolLeaderGender: pickValue(
      payload.schoolLeaderGender || payload.principalGender,
      ""
    ),

    principalName: pickValue(
      payload.principalName || payload.schoolLeaderName,
      ""
    ),
    principalTitle: pickValue(
      payload.principalTitle || payload.schoolLeaderTitle,
      ""
    ),
    principalGender: pickValue(
      payload.principalGender || payload.schoolLeaderGender,
      ""
    ),

    ministryLogoUrl: pickValue(
      payload.ministryLogoUrl,
      "/uploads/school-logos/MOE.png"
    ),
    schoolLogoUrl: pickValue(payload.schoolLogoUrl, ""),

    guardianName: pickValue(payload.guardianName, ""),
    guardianPhone: pickValue(payload.guardianPhone, ""),

    studentName: pickValue(student.fullName, ""),
    studentNationalId: pickValue(student.nationalId, ""),
    studentClass,

    summonDay: pickValue(payload.summonDay, ""),
    summonsDay: pickValue(payload.summonDay, ""),

    summonDate: pickValue(payload.summonDate, ""),
    summonsDate: pickValue(payload.summonDate, ""),
    summonsHijriDate: pickValue(payload.summonDate, ""),

    summonTime: pickValue(payload.summonTime, ""),
    summonsTime: pickValue(payload.summonTime, ""),

    summonPeriod: pickValue(payload.summonPeriod, ""),
    summonsPeriod: pickValue(payload.summonPeriod, ""),

    summonReason: pickValue(payload.summonReason, ""),
    summonsReason: pickValue(payload.summonReason, ""),

    notes: pickValue(payload.notes, ""),
  };

  return {
    found: true,
    caseId: payload.id || "guardian-summons-preview",
    serviceSlug: "family-school-communication",
    serviceName: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    title: "إشعار ولي الأمر طالب",
    status: payload.status || "ISSUED",
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt:
      payload.printedAt ||
      payload.issuedAt ||
      payload.createdAt ||
      new Date().toISOString(),
    student: {
      id: student.id || "",
      name: student.fullName || "",
      nationalId: student.nationalId || "",
      grade: student.grade || "",
      classroom: student.classroom || "",
      stage: student.stage || "",
      guardianName: payload.guardianName || "",
      guardianPhone: payload.guardianPhone || "",
    },
    values: Object.entries(allValues).map(([fieldKey, value]) => ({
      fieldKey,
      fieldLabel: fieldKey,
      value,
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
