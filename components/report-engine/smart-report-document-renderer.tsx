import {
  ActivityExecutionCardReport,
  type ActivityExecutionCardReportData,
} from "@/components/activity-programs/reports/activity-execution-card-report";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartReportDocumentRendererProps = {
  payload: SmartReportPayload;
  className?: string;
};

function renderFieldValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.length ? value.join("، ") : "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

function getField(payload: SmartReportPayload, key: string) {
  return payload.primaryFields.find((field) => field.key === key);
}

function getFieldValue(payload: SmartReportPayload, key: string) {
  return renderFieldValue(getField(payload, key)?.value ?? "");
}

function getSignature(payload: SmartReportPayload, key: string) {
  return payload.signatures.find((signature) => signature.key === key);
}

function getFirstUsefulSignature(payload: SmartReportPayload) {
  return (
    payload.signatures.find((signature) => signature.signerName) ||
    payload.signatures[0] ||
    null
  );
}

function mapSmartPayloadToActivityReportData(
  payload: SmartReportPayload,
): ActivityExecutionCardReportData {
  const principalSignature = getSignature(payload, "principal");
  const activityLeaderSignature =
    getSignature(payload, "activity_leader") ||
    getSignature(payload, "counselor") ||
    getFirstUsefulSignature(payload);
  const teacherSignature =
    getSignature(payload, "teacher") ||
    getSignature(payload, "assigned_teacher") ||
    activityLeaderSignature;

  const evidenceItems = payload.evidence.items.map((item, index) => ({
    id: item.id || `evidence-${index + 1}`,
    title: item.title || `شاهد ${index + 1}`,
    imageUrl: item.type === "IMAGE" ? item.url : undefined,
    fileName: item.title || `شاهد ${index + 1}`,
  }));

  const extraItems = [
    {
      label: "الفصل الدراسي",
      value:
        getFieldValue(payload, "semester") ||
        payload.identity.currentSemester ||
        "",
    },
    {
      label: "طريقة التنفيذ",
      value: getFieldValue(payload, "execution_method"),
    },
    {
      label: "الأسبوع",
      value: getFieldValue(payload, "week"),
    },
    ...payload.detailFields.slice(0, 8).map((field) => ({
      label: field.label,
      value: renderFieldValue(field.value),
    })),
  ].filter((item) => item.value);

  return {
    identity: {
      ministryName: payload.identity.ministryName || "وزارة التعليم",
      educationDepartment:
        payload.identity.educationDepartment || "إدارة التعليم",
      educationOffice: payload.identity.educationOffice || "مكتب التعليم",
      schoolName: payload.identity.schoolName || "اسم المدرسة",
      academicYear: payload.identity.academicYear || "العام الدراسي",
      semester:
        payload.identity.currentSemester ||
        getFieldValue(payload, "semester") ||
        "الفصل الدراسي",
      ministryLogoUrl:
        payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png",
      schoolLogoUrl: undefined,
    },

    activity: {
      domain: payload.service.name || "مجال النشاط",
      title: payload.title || payload.caseInfo.title || "تقرير",
      teacherName:
        getFieldValue(payload, "executor") ||
        teacherSignature?.signerName ||
        payload.caseInfo.issuedBy ||
        "",
      activityDate:
        getFieldValue(payload, "execution_date") ||
        payload.caseInfo.issuedAt ||
        payload.caseInfo.createdAt ||
        "",
      targetGroup:
        getFieldValue(payload, "target_group") ||
        payload.student?.grade ||
        payload.student?.stage ||
        "",
      beneficiaryCount:
        getFieldValue(payload, "beneficiary_count") ||
        getFieldValue(payload, "students_count") ||
        "",
      location:
        getFieldValue(payload, "location") ||
        getFieldValue(payload, "place") ||
        "",
      implementationDescription: payload.narrative.body || "",
      objectives: [],
      procedures: [],
      indicators: [],
      extraItems,
    },

    evidences: evidenceItems,

    approvals: {
      teacherSignedName:
        teacherSignature?.signerName ||
        getFieldValue(payload, "executor") ||
        payload.caseInfo.issuedBy ||
        "المعلم المنفذ",
      teacherSignatureUrl: teacherSignature?.imageUrl || undefined,
      activityLeaderName:
        activityLeaderSignature?.signerName ||
        payload.caseInfo.issuedBy ||
        "رائد النشاط",
      principalName: principalSignature?.signerName || undefined,
    },
  };
}

export function SmartReportDocumentRenderer({
  payload,
  className = "",
}: SmartReportDocumentRendererProps) {
  const data = mapSmartPayloadToActivityReportData(payload);

  return (
    <div className={className}>
      <ActivityExecutionCardReport data={data} />
    </div>
  );
}