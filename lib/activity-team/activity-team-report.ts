import {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
} from "@/components/report-engine/design-renderers/report-design-registry";
import {
  buildReportTwoPreviewCase,
  buildReportTwoRenderContext,
} from "@/lib/report-2/report-two-structured-data";
import type {
  SmartReportPayload,
  SmartReportSignature,
} from "@/lib/report-engine/smart-report-types";
import { SCHOOL_ACTIVITY_TEAM_FIELDS } from "@/lib/activity-team/activity-team-config";
import { getArabicActivitySupervisorLabel, getArabicUserRoleLabel } from "@/lib/auth/user-role-display";
import { getReportLanguageModeFromUserGender } from "@/lib/report-engine/report-language-mode";
import { isCurrentSupervisorSignatureForField } from "@/lib/activity-team/activity-team-service";

type ActivityTeamReportInput = {
  assignments: Record<string, string>;
  gender?: string | null;
  schoolName: string;
  educationDepartment?: string | null;
  logoUrl?: string | null;
  activityLeaderName?: string | null;
  activityLeaderSignatureUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
  supervisorSignatures?: Array<{
    supervisorName: string;
    fieldKeys: string[];
    signatureUrl: string;
    signedAt?: Date | string | null;
  }>;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function buildSchoolActivityTeamReportSnapshot(
  input: ActivityTeamReportInput,
) {
  const languageMode = getReportLanguageModeFromUserGender(input.gender);
  const activityLeaderTitle = getArabicUserRoleLabel({ role: "ACTIVITY_LEADER", gender: input.gender });
  const principalTitle = getArabicUserRoleLabel({ role: "PRINCIPAL", gender: input.gender });
  const supervisorTitle = getArabicActivitySupervisorLabel(input.gender);

  const signatures: SmartReportSignature[] = [
    {
      key: "activity-leader",
      label: activityLeaderTitle,
      signerName: clean(input.activityLeaderName),
      signerTitle: activityLeaderTitle,
      imageUrl: clean(input.activityLeaderSignatureUrl),
    },
    {
      key: "principal",
      label: principalTitle,
      signerName: clean(input.principalName),
      signerTitle: principalTitle,
      imageUrl: clean(input.principalSignatureUrl),
    },
  ];
  const supervisorSignatureByFieldKey = new Map(
    SCHOOL_ACTIVITY_TEAM_FIELDS.flatMap((field) => {
      const signature = (input.supervisorSignatures || []).find((candidate) =>
        isCurrentSupervisorSignatureForField(candidate, input.assignments, field.key),
      );
      return signature ? [[field.key, signature] as const] : [];
    }),
  );

  const payload: SmartReportPayload = {
    reportType: "ACTIVITY_REPORT",
    languageMode,
    title: "فريق النشاط الطلابي بالمدرسة",
    identity: {
      ministryName: "وزارة التعليم",
      educationDepartment: clean(input.educationDepartment),
      schoolName: clean(input.schoolName),
      schoolLogoUrl: clean(input.logoUrl),
      activityLeaderName: clean(input.activityLeaderName),
      activityLeaderSignatureUrl: clean(input.activityLeaderSignatureUrl),
      principalName: clean(input.principalName),
      principalSignatureUrl: clean(input.principalSignatureUrl),
    },
    caseInfo: {
      id: "school-activity-team",
      title: "فريق النشاط الطلابي بالمدرسة",
      status: "SAVED",
      createdAt: new Date().toISOString(),
    },
    service: {
      slug: "school-activity-team",
      name: "فريق النشاط الطلابي بالمدرسة",
    },
    primaryFields: [],
    detailFields: [],
    narrative: { title: "", body: "", visible: false },
    evidence: { layout: "ATTACHMENT_LIST", items: [] },
    signatures,
    readiness: { status: "READY", percentage: 100, missingItems: [], notes: [] },
    tables: [
      {
        id: "school-activity-team-table",
        sourceFieldKey: "school_activity_team",
        title: "فريق النشاط الطلابي بالمدرسة",
        columns: [
          { key: "number", label: "م", width: 10 },
          { key: "field", label: "مجال النشاط", width: 47 },
          { key: "supervisor", label: `اسم ${supervisorTitle}`, width: 23 },
          { key: "signature", label: "التوقيع", width: 20 },
        ],
      rows: SCHOOL_ACTIVITY_TEAM_FIELDS.map((field, index) => ({
          id: field.key,
          cells: {
            number: String(index + 1),
            field: field.label,
            supervisor: clean(input.assignments[field.key]),
            signature: "—",
          },
        })),
        preserveEmptyColumnKeys: ["signature"],
        settings: {
          repeatHeader: true,
          compact: true,
          stripedRows: true,
          highlightFirstColumn: true,
        },
      },
    ],
  };
  const reportTable = payload.tables?.[0];

  if (!reportTable) {
    throw new Error("تعذر إعداد جدول فريق النشاط الطلابي");
  }

  return {
    template: {
      id: "school-activity-team-report-two",
      name: "فريق النشاط الطلابي بالمدرسة",
      description: "قالب فريق النشاط الطلابي عبر محرّك Report 2",
      designTemplateId: DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
      pages: [
        {
          id: "school-activity-team-page",
          kind: "content",
          title: "فريق النشاط الطلابي بالمدرسة",
          description: "",
          blocks: [
            {
              id: "school-activity-team-title",
              kind: "hero-title",
              title: "عنوان التقرير",
              content: "{{case.title}}",
              variant: "hero",
              showTitle: false,
              align: "center",
              showServiceName: false,
              placement: "flow",
            },
            {
              id: "school-activity-team-table",
              kind: "structured-table",
              title: "",
              content: "",
              showTitle: false,
              source: "payload-table",
              sourceTableId: "school-activity-team-table",
              sourceFieldKey: "school_activity_team",
              preserveEmptyColumnIndexes: [3],
              columns: reportTable.columns.map((column) => column.label),
              columnWidths: reportTable.columns.map((column) => column.width || 0),
          rows: reportTable.rows.map((row) =>
            reportTable.columns.map((column) => row.cells[column.key]),
          ),
          cellImages: reportTable.rows.map((row) =>
            reportTable.columns.map((column) =>
              column.key === "signature"
                ? clean(supervisorSignatureByFieldKey.get(row.id as (typeof SCHOOL_ACTIVITY_TEAM_FIELDS)[number]["key"])?.signatureUrl)
                : "",
            ),
          ),
              tableSettings: {
                highlightHeader: true,
                highlightFirstColumn: true,
                stripedRows: true,
                rounded: true,
                compact: true,
                repeatHeader: true,
                colorTheme: "light-gray",
              },
              placement: "flow",
            },
            {
              id: "school-activity-team-signatures",
              kind: "signature-grid",
              title: "",
              content: "",
              showTitle: false,
              align: "center",
              placement: "bottom",
              signatures,
            },
          ],
        },
      ],
    },
    context: {
      ...buildReportTwoRenderContext(payload),
      "identity.logoUrl": clean(input.logoUrl),
    },
    previewCase: buildReportTwoPreviewCase(payload),
    sourcePayload: payload,
    designTemplateId: DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  };
}
