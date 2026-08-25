import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  Hash,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";
import { SignatureImage } from "@/components/signatures/signature-image";

import type { ReportBlock } from "@/lib/report-engine/report-block-types";
import { filterValidReportEvidenceItems } from "@/lib/report-engine/report-evidence-utils";
import type {
  ReportEvidenceConfig,
  SmartReportEvidenceItem,
} from "@/lib/report-engine/smart-report-types";

export type ActivityExecutionCardReportData = {
  serviceSlug?: string;
  identity: {
    ministryName: string;
    educationDepartment: string;
    educationOffice: string;
    schoolName: string;
    academicYear: string;
    semester: string;
    ministryLogoUrl?: string;
    schoolLogoUrl?: string;
  };

  activity: {
    domain: string;
    title: string;
    teacherName: string;
    activityDate: string;
    targetGroup: string;
    beneficiaryCount: string;
    location: string;
    implementationDescription: string;
    objectives: string[];
    procedures: string[];
    indicators: string[];
    extraItems?: {
      label: string;
      value: string;
    }[];
  };

  evidences: {
    id: string;
    title: string;
    imageUrl?: string;
    fileUrl?: string;
    storagePath?: string;
    attachmentId?: string;
    fileName?: string;
  }[];

  customBlocks?: {
    id: string;
    type: "PARAGRAPH" | "BULLET_LIST";
    title: string;
    body: string;
  }[];

  approvals: {
    teacherSignedName: string;
    teacherSignatureUrl?: string;
    activityLeaderName: string;
    principalName?: string;
    principalSignatureUrl?: string;
    managerOnly?: boolean;
  };
};

type ActivityExecutionCardReportProps = {
  data: ActivityExecutionCardReportData;
  blocks?: ReportBlock[];
  evidenceConfig?: ReportEvidenceConfig;
  showApprovals?: boolean;
  showEvidenceHeading?: boolean;
  pageMode?: "full" | "evidence" | "signatures";
};

type EvidenceItem = ActivityExecutionCardReportData["evidences"][number];

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasUsefulValue(value: unknown) {
  const text = cleanText(value);
  const normalized = normalizeText(text);

  return Boolean(
    text &&
      ![
        "0",
        "غير محدد",
        "غير مدخل",
        "غير متوفر",
        "لا يوجد",
        "null",
        "undefined",
        "-",
        "—",
      ].includes(normalized),
  );
}

function getUniqueMetaItems(
  items: Array<{
    label: string;
    value: string;
    wide?: boolean;
  }>,
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (!hasUsefulValue(item.value)) return false;

    const key = normalizeText(`${item.label}-${item.value}`);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getInfoIcon(label: string) {
  const text = normalizeText(label);

  if (text.includes("تاريخ")) return <CalendarDays />;
  if (text.includes("يوم")) return <Clock3 />;
  if (text.includes("فصل")) return <CalendarRange />;
  if (text.includes("معلم")) return <UserRound />;
  if (text.includes("فئه") || text.includes("مستهدف")) return <UsersRound />;
  if (text.includes("عدد") || text.includes("حصص") || text.includes("اسبوع")) {
    return <Hash />;
  }
  if (text.includes("مكان")) return <MapPin />;
  if (text.includes("طريقه") || text.includes("تنفيذ")) {
    return <ClipboardCheck />;
  }

  return <BookOpen />;
}

function mapSmartEvidenceToActivityEvidence(
  items: SmartReportEvidenceItem[] | undefined,
): EvidenceItem[] {
  return filterValidReportEvidenceItems(items || []).map((item, index) => ({
    id: item.id || `evidence-${index + 1}`,
    title: item.title || `شاهد ${index + 1}`,
    imageUrl: item.type === "IMAGE" ? item.url : undefined,
    fileUrl: item.url,
    fileName: item.title || `شاهد ${index + 1}`,
  }));
}

function getValidActivityEvidences(evidences: EvidenceItem[] | undefined) {
  return filterValidReportEvidenceItems(evidences || []);
}

function buildDefaultBlocks(
  data: ActivityExecutionCardReportData,
  pageMode: ActivityExecutionCardReportProps["pageMode"],
  showApprovals: boolean,
): ReportBlock[] {
  const isFullPage = pageMode === "full";

  const blocks: ReportBlock[] = [];

  if (isFullPage) {
    blocks.push({
      id: "meta-fields",
      type: "META_FIELDS",
      estimatedHeight: 40,
      placement: "CONTENT",
      movable: false,
      editable: true,
    });

    if (
      data.serviceSlug !== "activity-programs-school-broadcast" &&
      hasUsefulValue(data.activity.implementationDescription)
    ) {
      blocks.push({
        id: "narrative",
        type: "NARRATIVE",
        title: "وصف التنفيذ",
        body: data.activity.implementationDescription,
        estimatedHeight: 40,
        placement: "CONTENT",
        movable: false,
        editable: true,
      });
    }

    for (const block of data.customBlocks || []) {
      if (!hasUsefulValue(block.title) && !hasUsefulValue(block.body)) continue;

      blocks.push({
        id: `custom-${block.id}`,
        type:
          block.type === "BULLET_LIST"
            ? "CUSTOM_BULLET_LIST"
            : "CUSTOM_PARAGRAPH",
        title: block.title,
        body: block.body,
        estimatedHeight: 34,
        placement: "CONTENT",
        movable: true,
        editable: true,
        sourceCustomBlockId: block.id,
      });
    }
  }

  const validEvidences = getValidActivityEvidences(data.evidences);

  if (validEvidences.length > 0) {
    blocks.push({
      id: "evidence",
      type: "EVIDENCE_GRID",
      evidenceItems: validEvidences.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.imageUrl || item.fileUrl || item.storagePath,
        type: item.imageUrl ? "IMAGE" : "FILE",
      })),
      estimatedHeight: 90,
      placement: "CONTENT",
      movable: false,
      editable: true,
    });
  }

  if (showApprovals) {
    blocks.push({
      id: "signatures",
      type: "SIGNATURES",
      estimatedHeight: 34,
      placement: "END",
      movable: false,
      editable: false,
    });
  }

  return blocks;
}

export function ActivityExecutionCardReport({
  data,
  blocks,
  evidenceConfig,
  showApprovals = true,
  showEvidenceHeading = true,
  pageMode = "full",
}: ActivityExecutionCardReportProps) {
  const isSchoolBroadcast =
    data.serviceSlug === "activity-programs-school-broadcast";
  const evidenceVisible = evidenceConfig?.visible ?? true;
  const evidencesPerPage = evidenceConfig?.itemsPerPage ?? 2;
  const evidenceImageSize = evidenceConfig?.imageSize ?? "small-squares";

  const visualBlocks =
    blocks && blocks.length > 0
      ? blocks.filter(
          (block) =>
            !["HEADER", "FOOTER", "MANUAL_PAGE_BREAK"].includes(block.type) &&
            !(isSchoolBroadcast && block.type === "NARRATIVE") &&
            !(isSchoolBroadcast &&
              ["executive-description", "executive_description", "details"].includes(
                String(block.id || "").trim().toLowerCase(),
              )),
        )
      : buildDefaultBlocks(data, pageMode, showApprovals);

  return (
    <main className="activity-execution-report-root" dir="rtl">
      <ActivityExecutionCardReportStyles />

      <section className="activity-a4-page">
        <OfficialHeader data={data} />

        {visualBlocks.map((block) => {
          if (block.type === "META_FIELDS") {
            return <MetaFieldsBlock key={block.id} data={data} />;
          }

          if (block.type === "NARRATIVE") {
            return (
              <TextBlock
                key={block.id}
                title={block.title || "وصف التنفيذ"}
                body={block.body || data.activity.implementationDescription}
              />
            );
          }

          if (
            block.type === "CUSTOM_PARAGRAPH" ||
            block.type === "CUSTOM_BULLET_LIST"
          ) {
            return (
              <CustomTextBlock
                key={block.id}
                type={
                  block.type === "CUSTOM_BULLET_LIST"
                    ? "BULLET_LIST"
                    : "PARAGRAPH"
                }
                title={block.title || ""}
                body={block.body || ""}
              />
            );
          }

          if (block.type === "EVIDENCE_GRID") {
            const blockEvidences = evidenceVisible
              ? mapSmartEvidenceToActivityEvidence(block.evidenceItems)
              : [];

            if (!blockEvidences.length) return null;

            return (
              <section
                key={block.id}
                className="activity-section activity-evidence-section"
              >
                {showEvidenceHeading ? (
                  <SectionHeading title="الشواهد" />
                ) : null}

                <EvidenceGrid
                  evidences={blockEvidences}
                  itemsPerPage={evidencesPerPage}
                  imageSize={evidenceImageSize}
                />
              </section>
            );
          }

          if (block.type === "SIGNATURES") {
            return <ApprovalGrid key={block.id} data={data} />;
          }

          return null;
        })}

        <ReportFooter data={data} />
      </section>
    </main>
  );
}

function MetaFieldsBlock({ data }: { data: ActivityExecutionCardReportData }) {
  const extraItems = data.activity.extraItems || [];

  const dayItem = extraItems.find(
    (item) => normalizeText(item.label) === "اليوم",
  );

  const semesterItem = extraItems.find((item) =>
    normalizeText(item.label).includes("الفصل الدراسي"),
  );

  const remainingExtraItems = extraItems.filter((item) => {
    const label = normalizeText(item.label);

    return label !== "اليوم" && !label.includes("الفصل الدراسي");
  });

  const dateAndDay = hasUsefulValue(dayItem?.value)
    ? `${data.activity.activityDate} - ${dayItem?.value}`
    : data.activity.activityDate;

  const metaItems = getUniqueMetaItems([
    {
      label: "تاريخ التنفيذ / اليوم",
      value: dateAndDay,
    },
    ...(semesterItem
      ? [
          {
            label: "الفصل الدراسي",
            value: semesterItem.value,
          },
        ]
      : []),
    {
      label: "المعلم المنفذ",
      value: data.activity.teacherName,
    },
    {
      label: "الفئة المستهدفة",
      value: data.activity.targetGroup,
    },
    {
      label: "عدد المستفيدين",
      value: data.activity.beneficiaryCount,
    },
    {
      label: "مكان التنفيذ",
      value: data.activity.location,
    },
    ...remainingExtraItems,
  ]);

  if (!metaItems.length) return null;

  return (
    <section className="activity-meta-grid">
      {metaItems.map((item) => (
        <InfoCell
          key={`${item.label}-${item.value}`}
          label={item.label}
          value={item.value}
          wide={item.wide}
        />
      ))}
    </section>
  );
}

function InfoCell({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "activity-info-cell wide" : "activity-info-cell"}>
      <span className="activity-info-icon" aria-hidden="true">
        {getInfoIcon(label)}
      </span>

      <span className="activity-info-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="activity-section-heading">
      <span />
      <h2>{title}</h2>
    </div>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  if (!hasUsefulValue(body)) return null;

  return (
    <section className="activity-section">
      <SectionHeading title={title} />
      <p className="activity-paragraph">{body}</p>
    </section>
  );
}

function CustomTextBlock({
  type,
  title,
  body,
}: {
  type: "PARAGRAPH" | "BULLET_LIST";
  title: string;
  body: string;
}) {
  if (!hasUsefulValue(title) && !hasUsefulValue(body)) return null;

  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="activity-custom-blocks">
      <article className="activity-custom-block">
        {hasUsefulValue(title) ? <h3>{title}</h3> : null}

        {type === "BULLET_LIST" ? (
          <ul>
            {lines.map((line, index) => (
              <li key={`${title}-${index}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>{body}</p>
        )}
      </article>
    </section>
  );
}

function EvidenceGrid({
  evidences,
  itemsPerPage,
  imageSize,
}: {
  evidences: EvidenceItem[];
  itemsPerPage: 1 | 2 | 4;
  imageSize: ReportEvidenceConfig["imageSize"];
}) {
  if (!evidences.length) return null;

  const layoutClass =
    itemsPerPage === 1 ? "one" : itemsPerPage === 4 ? "four" : "two";

  return (
    <div className={`activity-evidence-grid ${layoutClass} ${imageSize}`}>
      {evidences.map((evidence) => (
        <article key={evidence.id} className="activity-evidence-card">
          <div className="activity-evidence-frame">
            {evidence.imageUrl ? (
              <img src={evidence.imageUrl} alt={evidence.title} />
            ) : (
              <span>{evidence.fileName || "شاهد مرفق"}</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ApprovalGrid({ data }: { data: ActivityExecutionCardReportData }) {
  if (data.approvals.managerOnly) {
    return (
      <section className="activity-approval-grid manager-only">
        <div className="activity-signature-box">
          <span>مدير المدرسة</span>

          {data.approvals.principalSignatureUrl ? (
            <SignatureImage
              src={data.approvals.principalSignatureUrl}
              alt={`توقيع ${data.approvals.principalName || "مدير المدرسة"}`}
            />
          ) : (
            <em>............................</em>
          )}

          <strong>{data.approvals.principalName || "مدير المدرسة"}</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="activity-approval-grid">
      <div className="activity-signature-box">
        <span>توقيع المعلم المنفذ</span>

        {data.approvals.teacherSignatureUrl ? (
          <SignatureImage
            src={data.approvals.teacherSignatureUrl}
            alt={`توقيع ${data.approvals.teacherSignedName}`}
          />
        ) : (
          <em>............................</em>
        )}

        <strong>{data.approvals.teacherSignedName}</strong>
      </div>

      <div className="activity-signature-box">
        <span>رائد النشاط</span>
        <em>............................</em>
        <strong>{data.approvals.activityLeaderName}</strong>
      </div>

      <div className="activity-signature-box">
        <span>مدير المدرسة</span>
        <em>............................</em>
        <strong>{data.approvals.principalName || "............................"}</strong>
      </div>
    </section>
  );
}

function OfficialHeader({
  data,
  compact = false,
}: {
  data: ActivityExecutionCardReportData;
  compact?: boolean;
}) {
  return (
    <header
      className={
        compact ? "activity-report-header compact" : "activity-report-header"
      }
    >
      <div className="activity-header-text">
        <span>تقرير برنامج نشاط طلابي</span>
        <strong>{data.activity.title}</strong>
        <b>
          {data.activity.domain} - {data.identity.schoolName}
        </b>
      </div>

      <LogoBox src={data.identity.ministryLogoUrl} label="وزارة التعليم" />
    </header>
  );
}

function LogoBox({ src, label }: { src?: string; label: string }) {
  return (
    <div className="activity-logo-box">
      {src ? <img src={src} alt={label} /> : <span>{label}</span>}
    </div>
  );
}

function ReportFooter({ data }: { data: ActivityExecutionCardReportData }) {
  return (
    <footer className="activity-report-footer">
      <span>{data.identity.schoolName}</span>
      <span>
        {data.identity.academicYear} - {data.identity.semester}
      </span>
      <span>Teachix</span>
    </footer>
  );
}

function ActivityExecutionCardReportStyles() {
  return (
    <style>{`
      .activity-execution-report-root {
        --activity-primary: #155f3b;
        --activity-primary-dark: #0f5132;
        --activity-soft: #eef8f2;
        --activity-border: #d9e7df;
        --activity-text: #17231d;
        --activity-muted: #647067;
        --activity-gold: #d4af37;

        min-height: 100%;
        background: #edf2ef;
        padding: 24px;
        color: var(--activity-text);
        font-family: Tajawal, Cairo, "IBM Plex Sans Arabic", Arial, sans-serif;
      }

      .activity-a4-page {
        width: 210mm;
        min-height: 297mm;
        max-height: 297mm;
        margin: 0 auto 24px;
        box-sizing: border-box;
        overflow: hidden;
        background:
          radial-gradient(circle at top left, rgba(212, 175, 55, 0.14), transparent 220px),
          #ffffff;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.16);
        padding: 10mm 14mm 8mm;
        display: flex;
        flex-direction: column;
        gap: 5mm;
        position: relative;
        page-break-after: always;
      }

      .activity-a4-page::before {
        content: "";
        position: absolute;
        inset-inline-start: -60px;
        top: -70px;
        width: 210px;
        height: 210px;
        border-radius: 999px;
        background: rgba(21, 95, 59, 0.08);
      }

      .activity-report-header {
        min-height: 31mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14mm;
        border: 0;
        border-radius: 24px 24px 0 0;
        padding: 12px 18mm;
        background: linear-gradient(135deg, #0f172a, #0f5132, #047857);
        overflow: hidden;
        position: relative;
        z-index: 1;
      }

      .activity-report-header.compact {
        min-height: 27mm;
      }

      .activity-report-header::before {
        content: "";
        position: absolute;
        inset-inline-start: -40px;
        top: -60px;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }

      .activity-header-text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: right;
        color: #fff;
        gap: 5px;
        position: relative;
        z-index: 2;
        line-height: 1.45;
      }

      .activity-header-text span {
        color: rgba(255, 255, 255, 0.86);
        font-size: 12px;
        font-weight: 900;
      }

      .activity-header-text strong {
        color: #fff;
        font-size: 27px;
        line-height: 1.25;
        font-weight: 900;
      }

      .activity-report-header.compact .activity-header-text strong {
        font-size: 22px;
      }

      .activity-header-text b {
        color: rgba(255, 255, 255, 0.88);
        font-size: 12px;
        font-weight: 900;
      }

      .activity-logo-box {
        width: 36mm;
        height: 22mm;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #fff;
        font-size: 12px;
        font-weight: 900;
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        text-align: center;
      }

      .activity-logo-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: brightness(0) invert(1);
      }

      .activity-meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .activity-info-cell {
        min-height: 41px;
        border: 1px solid var(--activity-border);
        border-radius: 14px;
        background: #fff;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        position: relative;
      }

      .activity-info-cell.wide {
        grid-column: span 2;
      }

      .activity-info-label {
        color: var(--activity-muted);
        font-size: 10px;
        font-weight: 900;
      }

      .activity-info-icon {
        position: absolute;
        top: 8px;
        left: 9px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: var(--activity-soft);
        color: var(--activity-primary-dark);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--activity-border);
      }

      .activity-info-icon svg {
        width: 13px;
        height: 13px;
        stroke-width: 2.4;
      }

      .activity-info-cell strong {
        color: var(--activity-text);
        font-size: 12px;
        line-height: 1.45;
      }

      .activity-section {
        break-inside: avoid;
      }

      .activity-section-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
      }

      .activity-section-heading span {
        width: 7px;
        height: 23px;
        border-radius: 999px;
        background: var(--activity-gold);
      }

      .activity-section-heading h2 {
        margin: 0;
        color: var(--activity-primary-dark);
        font-size: 19px;
        font-weight: 900;
      }

      .activity-paragraph {
        margin: 0;
        border: 1px solid var(--activity-border);
        border-radius: 16px;
        background: #fff;
        padding: 13px 16px;
        font-size: 15px;
        line-height: 2.15;
        color: #34423a;
        text-align: justify;
        font-weight: 700;
      }

      .activity-custom-blocks {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .activity-custom-block * {
        max-width: 100%;
        box-sizing: border-box;
      }

      .activity-custom-block {
        border: 1px solid var(--activity-border);
        border-radius: 18px;
        background: #fff;
        padding: 13px 16px;
      }

      .activity-custom-block h3 {
        margin: 0 0 8px;
        color: var(--activity-primary-dark);
        font-size: 17px;
        font-weight: 900;
      }

      .activity-custom-block p {
        margin: 0;
        color: #34423a;
        font-size: 14px;
        line-height: 2;
        font-weight: 700;
        text-align: justify;
        overflow-wrap: anywhere;
        word-break: normal;
        white-space: pre-wrap;
      }

      .activity-custom-block ul {
        margin: 0;
        padding-inline-start: 20px;
        color: #34423a;
        font-size: 14px;
        line-height: 2;
        font-weight: 700;
        overflow-wrap: anywhere;
        word-break: normal;
        white-space: pre-wrap;
      }

      .activity-custom-block li {
        overflow-wrap: anywhere;
        word-break: normal;
      }

      .activity-evidence-section {
        flex: 0 0 auto;
        min-height: 0;
      }

      .activity-evidence-grid {
        display: grid;
        gap: 9px;
      }

      .activity-evidence-grid.one {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .activity-evidence-grid.two,
      .activity-evidence-grid.four {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .activity-evidence-card {
        border: 1px solid var(--activity-border);
        border-radius: 16px;
        background: #fff;
        padding: 7px;
        min-height: 0;
      }

      .activity-evidence-frame {
        height: 35mm;
        border-radius: 12px;
        background: #f4f7f5;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        color: var(--activity-muted);
        font-size: 11px;
        font-weight: 800;
      }

      .activity-evidence-grid.one .activity-evidence-frame {
        height: 178mm;
      }

      .activity-evidence-grid.two .activity-evidence-frame {
        height: 82mm;
      }

      .activity-evidence-grid.four .activity-evidence-frame {
        height: 45mm;
      }

      .activity-evidence-grid.portrait .activity-evidence-frame {
        height: 95mm;
      }

      .activity-evidence-grid.landscape .activity-evidence-frame {
        height: 58mm;
      }

      .activity-evidence-grid.one.landscape .activity-evidence-frame,
      .activity-evidence-grid.one.large-square .activity-evidence-frame,
      .activity-evidence-grid.one.small-squares .activity-evidence-frame,
      .activity-evidence-grid.one.portrait .activity-evidence-frame {
        height: 178mm;
      }

      .activity-evidence-frame img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
      }

      .activity-approval-grid {
        margin-top: auto !important;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
        flex: 0 0 auto;
      }

      .activity-approval-grid.manager-only {
        grid-template-columns: minmax(0, 1fr);
      }

      .activity-approval-grid.manager-only .activity-signature-box {
        width: min(100%, 58mm);
        justify-self: center;
      }

      .activity-signature-box {
        min-height: 24mm;
        border: 1px solid var(--activity-border);
        border-radius: 18px;
        background: #fff;
        padding: 9px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
      }

      .activity-signature-box span {
        color: var(--activity-muted);
        font-size: 11px;
        font-weight: 900;
      }

      .activity-signature-box img {
        max-width: 43mm;
        height: 11mm;
        object-fit: contain;
      }

      .activity-signature-box em {
        font-size: 13px;
        color: var(--activity-muted);
        font-style: normal;
      }

      .activity-signature-box strong {
        color: var(--activity-text);
        font-size: 12px;
        font-weight: 900;
      }

      .activity-report-footer {
        margin-top: 0;
        border-top: 3px solid var(--activity-primary-dark);
        padding-top: 5px;
        display: flex;
        justify-content: space-between;
        color: var(--activity-muted);
        font-size: 10px;
        font-weight: 800;
        flex: 0 0 auto;
      }

      .activity-a4-page:not(:has(.activity-approval-grid)) .activity-report-footer {
        margin-top: auto;
      }

      .activity-paragraph,
      .activity-custom-block p,
      .activity-custom-block ul,
      .activity-custom-block li {
        max-width: 100% !important;
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
        white-space: pre-wrap !important;
      }

      .activity-section,
      .activity-custom-block,
      .activity-custom-blocks {
        max-width: 100% !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }
      .activity-paragraph,
      .activity-custom-block p,
      .activity-custom-block ul,
      .activity-custom-block li {
        line-break: auto !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        white-space: pre-wrap !important;
      }
      @media screen and (max-width: 900px) {
        .activity-execution-report-root {
          padding: 12px;
          overflow-x: auto;
        }
      }

      @media print {
        body {
          margin: 0;
          background: #fff;
        }

        .no-print {
          display: none !important;
        }

        .activity-execution-report-root {
          padding: 0;
          background: #fff;
        }

        .activity-a4-page {
          margin: 0;
          box-shadow: none;
          width: 210mm;
          min-height: 297mm;
          max-height: 297mm;
          page-break-after: always;
          break-after: page;
        }

        @page {
          size: A4;
          margin: 0;
        }
      }
    `}</style>
  );
}
