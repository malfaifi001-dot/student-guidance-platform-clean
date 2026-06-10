import { BookOpen, CalendarDays, CalendarRange, ClipboardCheck, Clock3, Hash, MapPin, UserRound, UsersRound } from "lucide-react";

export type ActivityExecutionCardReportData = {
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
    fileName?: string;
  }[];

  approvals: {
    teacherSignedName: string;
    teacherSignatureUrl?: string;
    activityLeaderName: string;
    principalName?: string;
  };
};

type ActivityExecutionCardReportProps = {
  data: ActivityExecutionCardReportData;
};

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

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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
    if (!hasUsefulValue(item.value)) {
      return false;
    }

    const key = normalizeText(`${item.label}-${item.value}`);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function ActivityExecutionCardReport({
  data,
}: ActivityExecutionCardReportProps) {
  const firstPageEvidenceLimit = 4;
  const firstPageEvidences = data.evidences.slice(0, firstPageEvidenceLimit);
  const remainingEvidencePages = chunkArray(
    data.evidences.slice(firstPageEvidenceLimit),
    4,
  );

  const extraItems = data.activity.extraItems || [];

  const dayItem = extraItems.find(
    (item) => normalizeText(item.label) === "اليوم",
  );

  const semesterItem = extraItems.find(
    (item) => normalizeText(item.label).includes("الفصل الدراسي"),
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

  return (
    <main className="activity-execution-report-root" dir="rtl">
      <ActivityExecutionCardReportStyles />

      <section className="activity-a4-page">
        <OfficialHeader data={data} />

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

        {hasUsefulValue(data.activity.implementationDescription) ? (
          <section className="activity-section">
            <SectionHeading title="وصف التنفيذ" />
            <p className="activity-paragraph">
              {data.activity.implementationDescription}
            </p>
          </section>
        ) : null}

        <section className="activity-section activity-evidence-section">
          <SectionHeading title="الشواهد والمرفقات" />

          <EvidenceGrid evidences={firstPageEvidences} />


        </section>

        {remainingEvidencePages.length === 0 ? (
          <ApprovalGrid data={data} />
        ) : null}

        <ReportFooter data={data} />
      </section>

      {remainingEvidencePages.map((evidences, index) => (
        <section
          key={`evidence-page-${index}`}
          className="activity-a4-page activity-evidence-page"
        >
          <OfficialHeader data={data} compact />


          <section className="activity-section activity-evidence-section evidence-full-page">
            <EvidenceGrid evidences={evidences} large />
          </section>

          {index === remainingEvidencePages.length - 1 ? (
            <ApprovalGrid data={data} />
          ) : null}

          <ReportFooter data={data} />
        </section>
      ))}</main>
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
        compact
          ? "activity-report-header compact"
          : "activity-report-header"
      }
    >
      <div className="activity-header-text">
        <span>تقرير برنامج نشاط طلابي</span>
        <strong>{data.activity.title}</strong>
        <b>{data.activity.domain} - {data.identity.schoolName}</b>
      </div>

      <LogoBox src={data.identity.ministryLogoUrl} label="وزارة التعليم" />
    </header>
  );
}

function LogoBox({
  src,
  label,
}: {
  src?: string;
  label: string;
}) {
  return (
    <div className="activity-logo-box">
      {src ? <img src={src} alt={label} /> : <span>{label}</span>}
    </div>
  );
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

function EvidenceGrid({
  evidences,
  large = false,
}: {
  evidences: ActivityExecutionCardReportData["evidences"];
  large?: boolean;
}) {
  if (!evidences.length) {
    return (
      <p className="activity-empty-evidence">
        لا توجد شواهد مرفقة.
      </p>
    );
  }

  return (
    <div
      className={
        large
          ? "activity-evidence-grid large"
          : "activity-evidence-grid"
      }
    >
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

function ApprovalGrid({
  data,
}: {
  data: ActivityExecutionCardReportData;
}) {
  return (
    <section className="activity-approval-grid">
      <div className="activity-signature-box">
        <span>توقيع المعلم المنفذ</span>

        {data.approvals.teacherSignatureUrl ? (
          <img
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

function ReportFooter({
  data,
}: {
  data: ActivityExecutionCardReportData;
}) {
  return (
    <footer className="activity-report-footer">
      <span>{data.identity.schoolName}</span>
      <span>{data.identity.academicYear} - {data.identity.semester}</span>
      <span>منصة التوجيه الطلابي</span>
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
        position: relative;
        z-index: 1;
        min-height: 22mm;
        display: grid;
        grid-template-columns: 28mm 1fr 28mm;
        align-items: center;
        gap: 8mm;
        border: 1px solid var(--activity-border);
        border-radius: 20px;
        padding: 8px 14px;
        background: linear-gradient(135deg, var(--activity-soft), #fff);
      }

      .activity-report-header.compact {
        min-height: 20mm;
      }

      .activity-logo-box {
        width: 23mm;
        height: 16mm;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--activity-border);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        color: var(--activity-muted);
        font-size: 10px;
        text-align: center;
        padding: 4px;
      }

      .activity-logo-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .activity-header-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        text-align: center;
        line-height: 1.45;
      }

      .activity-header-text strong {
        color: var(--activity-primary-dark);
        font-size: 15px;
      }

      .activity-header-text span {
        color: var(--activity-muted);
        font-size: 11px;
        font-weight: 700;
      }

      .activity-header-text b {
        color: var(--activity-text);
        font-size: 13px;
      }

      .activity-report-title {
        position: relative;
        z-index: 1;
        text-align: center;
        border-radius: 24px;
        background: var(--activity-primary-dark);
        color: white;
        padding: 10px 16px;
      }

      .activity-report-title.compact {
        padding: 10px 14px;
      }

      .activity-report-title p,
      .activity-report-title h1 {
        margin: 0;
      }

      .activity-report-title p {
        font-size: 12px;
        font-weight: 900;
        color: rgba(255,255,255,0.78);
      }

      .activity-report-title h1 {
        margin-top: 4px;
        font-size: 23px;
        font-weight: 900;
      }

      .activity-report-title.compact h1 {
        font-size: 18px;
      }

      .activity-report-title span {
        display: inline-flex;
        margin-top: 5px;
        border-radius: 999px;
        background: rgba(255,255,255,0.14);
        padding: 5px 14px;
        font-size: 12px;
        font-weight: 900;
      }

      .activity-meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
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

      .activity-evidence-section {
        flex: 1 1 auto;
        min-height: 0;
      }

      .activity-evidence-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .activity-evidence-grid.large {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
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

      .activity-evidence-grid.large .activity-evidence-frame {
        height: 67mm;
      }

      .activity-evidence-frame img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .activity-evidence-card strong {
        display: block;
        margin-top: 6px;
        color: var(--activity-text);
        font-size: 11px;
        line-height: 1.45;
        word-break: break-word;
      }

      .activity-empty-evidence,
      .activity-more-evidence-note {
        margin: 0;
        border-radius: 14px;
        background: #f8faf9;
        padding: 12px;
        color: var(--activity-muted);
        font-weight: 900;
        font-size: 12px;
      }

      .activity-more-evidence-note {
        margin-top: 8px;
        background: #fff7ed;
        color: #9a3412;
      }

      .activity-approval-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
        flex: 0 0 auto;
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

      .activity-signature-page {
        justify-content: space-between;
      }

      .activity-final-approval-body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8mm;
      }

      .activity-final-approval-note {
        border: 1px solid var(--activity-border);
        border-radius: 24px;
        background: linear-gradient(135deg, var(--activity-soft), #fff);
        padding: 22px;
        text-align: center;
      }

      .activity-final-approval-note h2 {
        margin: 0;
        color: var(--activity-primary-dark);
        font-size: 24px;
        font-weight: 900;
      }

      .activity-final-approval-note p {
        margin: 12px auto 0;
        max-width: 130mm;
        color: var(--activity-muted);
        font-size: 14px;
        font-weight: 700;
        line-height: 2;
      }

      .activity-signature-page .activity-approval-grid {
        gap: 14px;
      }

      .activity-signature-page .activity-signature-box {
        min-height: 42mm;
        padding: 16px;
      }

      .activity-signature-page .activity-signature-box img {
        max-width: 58mm;
        height: 18mm;
      }

      .activity-evidence-page .activity-approval-grid {
        margin-top: auto;
      }

      .activity-report-footer {
        border-top: 3px solid var(--activity-primary-dark);
        padding-top: 5px;
        display: flex;
        justify-content: space-between;
        color: var(--activity-muted);
        font-size: 10px;
        font-weight: 800;
        flex: 0 0 auto;
      }

      .evidence-full-page {
        flex: 1 1 auto;
      }

      /* MINISTRY_ONLY_ACTIVITY_HEADER */
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

      .activity-report-header .activity-header-text {
        align-items: flex-start;
        text-align: right;
        color: #fff;
        gap: 5px;
        position: relative;
        z-index: 2;
      }

      .activity-report-header .activity-header-text span {
        color: rgba(255, 255, 255, 0.86);
        font-size: 12px;
        font-weight: 900;
      }

      .activity-report-header .activity-header-text strong {
        color: #fff;
        font-size: 27px;
        line-height: 1.25;
        font-weight: 900;
      }

      .activity-report-header.compact .activity-header-text strong {
        font-size: 22px;
      }

      .activity-report-header .activity-header-text b {
        color: rgba(255, 255, 255, 0.88);
        font-size: 12px;
        font-weight: 900;
      }

      .activity-report-header .activity-logo-box {
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
      }

      .activity-report-header .activity-logo-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: brightness(0) invert(1);
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