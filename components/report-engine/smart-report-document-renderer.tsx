import {
  ActivityExecutionCardReport,
  type ActivityExecutionCardReportData,
} from "@/components/activity-programs/reports/activity-execution-card-report";
import type { ReportBlock } from "@/lib/report-engine/report-block-types";
import {
  DEFAULT_REPORT_VARIANT_ID,
  type ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartReportDocumentRendererProps = {
  payload: SmartReportPayload;
  blocks?: ReportBlock[];
  className?: string;
  variantId?: ReportVariantId;
};

const ARABIC_VALUE_MAP: Record<string, string> = {
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
  yes: "نعم",
  no: "لا",
  activity_leader: "رائد النشاط",
  counselor: "الموجه الطلابي",
  citizenship_life: "المواطنة والحياة",
  science_technology: "العلوم والتقنية",
  culture_arts: "الثقافة والفنون",
  sports_health: "الرياضة والصحة",
  scouting: "النشاط الكشفي",
  events_occasions: "الأيام والمناسبات",
  non_class_periods: "الفترات اللاصفية",
};

const ARABIC_LABEL_MAP: Record<string, string> = {
  activity_domain: "مجال النشاط",
  execution_mode: "طريقة التنفيذ",
  execution_method: "طريقة التنفيذ",
  planned_sessions: "عدد اللقاءات",
  start_day: "يوم البداية",
  end_day: "يوم النهاية",
  end_week: "أسبوع النهاية",
  end_date: "تاريخ النهاية",
  participant_students_count: "عدد الطلاب المشاركين",
  students_with_disabilities_count: "عدد طلاب ذوي الإعاقة",
  parents_participated: "مشاركة أولياء الأمور",
  community_partnership_count: "عدد الشراكات المجتمعية",
  semester: "الفصل الدراسي",
  week: "الأسبوع",
  execution_date: "تاريخ التنفيذ",
  target_group: "الفئة المستهدفة",
  executor: "المعلم المنفذ",
};

function normalizeTechnicalText(value: string) {
  return value.trim().toLowerCase();
}

function translateTechnicalValue(value: string) {
  const normalized = normalizeTechnicalText(value);
  const translated = ARABIC_VALUE_MAP[normalized] || ARABIC_VALUE_MAP[value];

  if (translated) return translated;

  if (/^[a-z0-9_]+$/i.test(value) && value.includes("_")) {
    return "";
  }

  return value;
}

function translateFieldLabel(key: string, label: string) {
  if (label && label !== key && !/^[a-z0-9_]+$/i.test(label)) return label;

  return ARABIC_LABEL_MAP[key] || "";
}

function renderFieldValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => translateTechnicalValue(String(item)))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return translateTechnicalValue(String(value));
}

function getField(payload: SmartReportPayload, key: string) {
  return (
    payload.primaryFields.find((field) => field.key === key) ||
    payload.detailFields.find((field) => field.key === key)
  );
}

function getFieldValue(payload: SmartReportPayload, key: string) {
  return renderFieldValue(getField(payload, key)?.value ?? "");
}

function getDetailFieldValue(payload: SmartReportPayload, keys: string[]) {
  for (const key of keys) {
    const value = getFieldValue(payload, key);

    if (value) return value;
  }

  return "";
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
      value: getFieldValue(payload, "semester"),
    },
    {
      label: "طريقة التنفيذ",
      value: getFieldValue(payload, "execution_method"),
    },
    {
      label: "الأسبوع",
      value: getFieldValue(payload, "week"),
    },
    ...payload.detailFields.slice(0, 12).map((field) => ({
      label: translateFieldLabel(field.key, field.label),
      value: renderFieldValue(field.value),
    })),
  ].filter((item) => item.label && item.value);

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
        "",
      ministryLogoUrl:
        payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png",
      schoolLogoUrl: undefined,
    },

    activity: {
      domain: payload.service.name || "مجال النشاط",
      title: payload.title || payload.caseInfo.title || "تقرير",
      teacherName: getFieldValue(payload, "executor"),
      activityDate: getFieldValue(payload, "execution_date"),
      targetGroup:
        getFieldValue(payload, "target_group") ||
        payload.student?.grade ||
        payload.student?.stage ||
        "",
      beneficiaryCount: getDetailFieldValue(payload, [
        "beneficiary_count",
        "beneficiaries_count",
        "students_count",
        "student_count",
        "participant_students_count",
      ]),
      location: getDetailFieldValue(payload, [
        "location",
        "place",
        "execution_location",
      ]),
      implementationDescription: payload.narrative.body || "",
      objectives: [],
      procedures: [],
      indicators: [],
      extraItems,
    },

    evidences: evidenceItems,

    customBlocks: payload.customBlocks || [],

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
  blocks,
  className = "",
  variantId = DEFAULT_REPORT_VARIANT_ID,
}: SmartReportDocumentRendererProps) {
  const data = mapSmartPayloadToActivityReportData(payload);

  return (
    <div className={className} data-report-variant={variantId}>
      <ActivityExecutionCardReport
        data={data}
        blocks={blocks}
        evidenceConfig={payload.evidenceConfig}
        showApprovals={payload.signatures.length > 0}
        showEvidenceHeading
        pageMode="full"
      />
    </div>
  );
}