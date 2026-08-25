"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnalysisPresentation } from "@/lib/assessments-center/analysis-presentation";

export type AssessmentReportPeriod = { id: string; label: string; average: number; achievementRate: number };
export type AssessmentPerformanceLevel = { label: string; count: number; percentage: number };
export type AssessmentDomainMetric = { label: string; percentage: number };
export type AssessmentDevelopmentPlanItem = {
  domain: string; need: string; action: string; method: string; duration: string;
  responsible: string; indicator: string; target: string;
  component?: string; cause?: string; objective?: string; steps?: string[];
  resources?: string; participants?: string; followUpMethod?: string;
  followUpTiming?: string; evidence?: string;
};

export type AssessmentAnalyticalReportData = {
  studentAudience?: "الطلاب" | "الطالبات";
  presentation: AnalysisPresentation;
  reportTitle: string; reportSubtitle?: string; analysisTypeLabel: string;
  analysisType?: "NAFS" | "MAHIROON" | "SUBJECT_PERIODIC";
  school: {
    name: string; educationAdministration?: string; educationOffice?: string; stage?: string;
    principalName?: string; teacherName?: string; logoUrl?: string; ministryLogoUrl?: string;
    teacherSignatureUrl?: string; principalSignatureUrl?: string;
  };
  metadata: { subject: string; grade: string; classroom?: string; academicYear?: string; semester?: string; maximumScore: number; reportDate?: string };
  metrics: {
    studentCount: number; averageScore: number; achievementRate: number; highestScore: number; lowestScore: number;
    scoreRange?: number; medianScore?: number; masteryCount?: number; masteryPercentage?: number; belowMasteryCount?: number; dominantLevel?: string; matchedStudentCount?: number;
    improvementRate?: number; improvedCount?: number; stableCount?: number; declinedCount?: number;
  };
  periods: AssessmentReportPeriod[]; performanceLevels: AssessmentPerformanceLevel[]; domains?: AssessmentDomainMetric[];
  analysis: {
    executiveSummary: string; strengths: string[]; improvementAreas: string[]; possibleCauses: string[];
    recommendations: string[]; remedialPlan: string[]; enrichmentPlan: string[]; followUpIndicators?: string[];
    analyticalReading?: string; finalConclusion?: string;
  };
  developmentPlan: AssessmentDevelopmentPlanItem[];
};

type Props = { data: AssessmentAnalyticalReportData };

const COLORS = {
  navy: "#123956", teal: "#0c8f8c", turquoise: "#12b4ae", blue: "#2878c7",
  green: "#159b71", amber: "#d59b22", red: "#d75050", slate: "#62748a",
  border: "#cddbe6", soft: "#f6f9fc", text: "#183247",
};

const AssessmentAudienceContext = React.createContext({ audience: "الطلاب" as "الطلاب" | "الطالبات", presentation: { mode: "PRE_POST", hasComparison: true, showTimeTrend: true, showMovement: true, showDistribution: true } as AnalysisPresentation });

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0)); }
function formatNumber(value: number, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function formatPercent(value?: number, digits = 1) { return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(digits)}%`; }

function ReportBrand({ data }: { data: AssessmentAnalyticalReportData }) {
  return <div className="report-brand">
    <div className="report-brand__vision"><img src="/uploads/school-logos/VISION2030.png" alt="رؤية السعودية 2030" /></div>
    <div className="report-brand__school" dir="rtl"><strong>{data.school.name || "مدرسة Teachix"}</strong>{data.school.educationAdministration ? <span>{data.school.educationAdministration}</span> : null}{data.school.educationOffice ? <span>{data.school.educationOffice}</span> : null}</div>
    <div className="report-brand__identity">{data.school.ministryLogoUrl ? <img src={data.school.ministryLogoUrl} alt="وزارة التعليم" className="report-brand__ministry" /> : <div className="report-brand__ministry-placeholder">وزارة التعليم</div>}</div>
  </div>;
}

function MetricCard({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; tone?: "default" | "green" | "blue" | "amber" | "red" }) {
  const context = React.useContext(AssessmentAudienceContext);
  if (!context.presentation.hasComparison && ["مؤشر التحسن", "تحسن", "ثبات", "تراجع"].includes(label)) return null;
  return <div className={`metric-card metric-card--${tone}`}><div className="metric-card__label">{label === "عدد الطلاب" ? `عدد ${context.audience}` : label}</div><div className="metric-card__value">{value}</div>{hint ? <div className="metric-card__hint">{hint}</div> : null}</div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="section-title"><div className="section-title__mark" /><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>;
}

function TrendChart({ periods }: { periods: AssessmentReportPeriod[] }) {
  const context = React.useContext(AssessmentAudienceContext);
  if (!context.presentation.showTimeTrend) return null;
  const width = 620, height = 220, paddingX = 48, paddingTop = 24, paddingBottom = 44;
  const chartWidth = width - paddingX * 2, chartHeight = height - paddingTop - paddingBottom;
  const points = (periods.length ? periods : [{ id: "empty", label: "—", average: 0, achievementRate: 0 }]).map((item, index, all) => ({
    x: all.length === 1 ? width / 2 : paddingX + (index / Math.max(all.length - 1, 1)) * chartWidth,
    y: paddingTop + chartHeight - (clamp(item.achievementRate) / 100) * chartHeight,
    item,
  }));
  return <div className="chart-shell">
    <div className="chart-shell__header"><strong>اتجاه نسبة التحصيل عبر الفترات</strong><span>مقارنة زمنية لمستوى الأداء</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img">
      {[0, 25, 50, 75, 100].map((tick) => { const y = paddingTop + chartHeight - (tick / 100) * chartHeight; return <g key={tick}><line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#dce7ef" strokeWidth="1" /><text x={paddingX - 12} y={y + 4} fontSize="12" textAnchor="end" fill="#526b80" fontWeight="700">{tick}%</text></g>; })}
      {points.length > 1 ? <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={COLORS.blue} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {points.map((point) => <g key={point.item.id}><circle cx={point.x} cy={point.y} r="6" fill="#fff" stroke={COLORS.blue} strokeWidth="4" /><text x={point.x} y={point.y - 14} fontSize="12" textAnchor="middle" fill={COLORS.navy} fontWeight="800">{formatPercent(point.item.achievementRate)}</text><text x={point.x} y={height - 14} fontSize="12" textAnchor="middle" fill="#40596e" fontWeight="700">{point.item.label}</text></g>)}
    </svg>
  </div>;
}

function DonutChart({ levels }: { levels: AssessmentPerformanceLevel[] }) {
  const context = React.useContext(AssessmentAudienceContext);
  if (!context.presentation.showDistribution) return null;
  const radius = 58, circumference = Math.PI * radius; let offset = 0;
  const palette = [COLORS.green, COLORS.blue, COLORS.amber, COLORS.red, COLORS.teal];
  return <div className="donut-layout"><div className="donut-chart"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r={radius} fill="none" stroke="#edf2f6" strokeWidth="22" />{levels.map((level, index) => { const percentage = clamp(level.percentage), dash = (percentage / 100) * circumference, currentOffset = offset; offset += dash; return <circle key={`${level.label}-${index}`} cx="80" cy="80" r={radius} fill="none" stroke={palette[index % palette.length]} strokeWidth="22" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} transform="rotate(-90 80 80)" />; })}<text x="80" y="75" textAnchor="middle" fontSize="18" fontWeight="800" fill={COLORS.navy}>الأداء</text><text x="80" y="97" textAnchor="middle" fontSize="12" fill={COLORS.slate}>حسب المستويات</text></svg></div><div className="donut-legend">{levels.map((level, index) => <div className="donut-legend__row" key={`${level.label}-${index}`}><span className="donut-legend__color" style={{ backgroundColor: palette[index % palette.length] }} /><strong>{level.label}</strong><span>{level.count}</span><b>{formatPercent(level.percentage)}</b></div>)}</div></div>;
}

function DomainBars({ domains }: { domains: AssessmentDomainMetric[] }) { return <div className="domain-bars">{domains.map((domain) => <div className="domain-bar" key={domain.label}><div className="domain-bar__head"><span>{domain.label}</span><strong>{formatPercent(domain.percentage)}</strong></div><div className="domain-bar__track"><div className="domain-bar__value" style={{ width: `${clamp(domain.percentage)}%` }} /></div></div>)}</div>; }
function InsightList({ items, tone = "blue" }: { items: string[]; tone?: "green" | "amber" | "blue" | "red" }) { if (!items.length) return <div className="empty-insight">لا توجد بيانات متاحة.</div>; return <ul className={`insight-list insight-list--${tone}`}>{items.map((item, index) => <li key={`${item}-${index}`}><span>{index + 1}</span><p>{item}</p></li>)}</ul>; }
function SignatureBox({ label, name, imageUrl }: { label: string; name?: string; imageUrl?: string }) { return <div className="signature-box"><span>{label}</span><div className="signature-image-area">{imageUrl ? <img src={imageUrl} alt={`توقيع ${name || label}`} /> : <div className="signature-line" />}</div><strong>{name || ""}</strong></div>; }
function PageFooter({ page }: { page: number }) { return <div className="page-footer"><span>Teachix — مركز التحاليل والاختبارات</span><strong>{page}</strong></div>; }

function buildCurrentStateSummary(data: AssessmentAnalyticalReportData) {
  const { metrics, metadata, performanceLevels } = data;
  const audience = data.studentAudience || "الطلاب";
  const populatedLevels = performanceLevels.filter((level) => level.count > 0).slice(0, 2);
  const distribution = populatedLevels.length
    ? `وتتركز النتائج في ${populatedLevels.map((level) => `${level.label} (${formatPercent(level.percentage)})`).join(" و")}.`
    : "وتعكس النتائج مستوى الأداء الحالي وفق الدرجات المتاحة.";
  const mastery = metrics.masteryPercentage !== undefined
    ? ` وبلغت نسبة الإتقان ${formatPercent(metrics.masteryPercentage)}، بينما يحتاج ${metrics.belowMasteryCount ?? 0} من ${audience} إلى دعم إضافي.`
    : "";

  if (data.presentation.audienceMode === "INDIVIDUAL") {
    return `يشير القياس الحالي إلى أن درجة الطالب بلغت ${formatNumber(metrics.averageScore)} من ${metadata.maximumScore} بنسبة ${formatPercent(metrics.achievementRate)}، ويقع الأداء في مستوى ${metrics.dominantLevel || "غير محدد"}.${mastery}`;
  }

  return `يشير القياس الحالي إلى أن متوسط أداء ${audience} بلغ ${formatNumber(metrics.averageScore)} من ${metadata.maximumScore} بنسبة تحصيل ${formatPercent(metrics.achievementRate)}. ${distribution} ويتراوح الأداء بين ${formatNumber(metrics.lowestScore)} و${formatNumber(metrics.highestScore)} بمدى ${formatNumber(metrics.scoreRange ?? Number.NaN)}.${mastery}`;
}

function CurrentStateSummary({ data }: { data: AssessmentAnalyticalReportData }) {
  const latest = data.presentation.availableMeasurements.at(-1);
  const individual = data.presentation.audienceMode === "INDIVIDUAL";
  const summary = buildCurrentStateSummary(data);
  return <div className="cover-current-state">
    <div className="metrics-grid cover-current-state__kpis">
      {individual ? <>
        <MetricCard label="الدرجة" value={formatNumber(latest?.scores[0]?.score ?? data.metrics.averageScore)} hint={`من ${data.metadata.maximumScore}`} tone="blue" />
        <MetricCard label="النسبة" value={formatPercent(data.metrics.achievementRate)} tone="green" />
        <MetricCard label="المستوى" value={data.metrics.dominantLevel || "—"} tone="blue" />
        {data.metrics.masteryPercentage !== undefined ? <MetricCard label="الفجوة عن الإتقان" value={data.metrics.belowMasteryCount ? "دون الإتقان" : "متقن"} tone={data.metrics.belowMasteryCount ? "amber" : "green"} /> : null}
      </> : <>
        <MetricCard label="عدد الطلاب" value={data.metrics.studentCount} tone="blue" />
        <MetricCard label="متوسط الدرجات" value={formatNumber(data.metrics.averageScore)} hint={`من ${data.metadata.maximumScore}`} tone="blue" />
        <MetricCard label="نسبة التحصيل" value={formatPercent(data.metrics.achievementRate)} tone="green" />
        <MetricCard label="أعلى درجة" value={formatNumber(data.metrics.highestScore)} tone="blue" />
        <MetricCard label="أدنى درجة" value={formatNumber(data.metrics.lowestScore)} tone="amber" />
        <MetricCard label="مدى الدرجات" value={formatNumber(data.metrics.scoreRange ?? Number.NaN)} tone="blue" />
      </>}
    </div>
    <div className="charts-grid cover-current-state__visuals">
      {data.presentation.showDistribution ? <div className="chart-shell"><div className="chart-shell__header"><strong>توزيع مستويات الأداء</strong></div><DonutChart levels={data.performanceLevels} /></div> : null}
      <div className="chart-shell chart-shell--summary current-state-summary-card"><div className="chart-shell__header"><strong>الخلاصة العامة</strong></div><p className="executive-summary">{summary}</p></div>
    </div>
    <div className="cover-bottom cover-current-state__footer">
      <MetricCard label="المستوى الغالب" value={data.metrics.dominantLevel || "—"} tone="blue" />
      {data.metrics.masteryPercentage !== undefined ? <MetricCard label="نسبة الإتقان" value={formatPercent(data.metrics.masteryPercentage)} tone="green" /> : null}
      {data.metrics.belowMasteryCount !== undefined ? <MetricCard label="دون الإتقان" value={data.metrics.belowMasteryCount} tone="amber" /> : null}
    </div>
  </div>;
}

function CurrentStateAnalytics({ data }: { data: AssessmentAnalyticalReportData }) {
  return <>
    <SectionTitle title="الملخص التحليلي للقياس الحالي" />
    <div className="report-info-strip report-info-strip--current-state">
      <div><span>نوع التحليل</span><strong>{data.analysisTypeLabel}</strong></div>
      <div><span>المادة</span><strong>{data.metadata.subject}</strong></div>
      <div><span>الصف</span><strong>{data.metadata.grade}</strong></div>
      <div><span>الفصل</span><strong>{data.metadata.classroom || "—"}</strong></div>
      <div><span>الدرجة الكلية</span><strong>{data.metadata.maximumScore}</strong></div>
    </div>
    <CurrentStateSummary data={data} />
  </>;
}

type AssessmentFlowBlock = {
  id: string;
  kind: "content" | "table-title" | "table-row";
  node: React.ReactNode;
};

function AssessmentReportPage({
  children,
  className = "",
  measurePage = false,
}: {
  children: React.ReactNode;
  className?: string;
  measurePage?: boolean;
}) {
  return (
    <section
      className={`report-page ${className}`}
      data-flow-measure-page={measurePage ? "true" : undefined}
    >
      {children}
    </section>
  );
}

function DevelopmentTableHead() {
  return (
    <thead>
      <tr>
        <th>المجال</th>
        <th>وصف الاحتياج</th>
        <th>إجراء التحسين</th>
        <th>الأسلوب / الطريقة</th>
        <th>المدة</th>
        <th>المسؤول</th>
        <th>مؤشر القياس</th>
        <th>المستهدف</th>
      </tr>
    </thead>
  );
}

function DevelopmentTableRow({
  item,
}: {
  item: AssessmentDevelopmentPlanItem;
}) {
  return (
    <tr>
      <td>{item.domain}</td>
      <td>{item.need}</td>
      <td>{item.action}</td>
      <td>{item.method}</td>
      <td>{item.duration}</td>
      <td>{item.responsible}</td>
      <td>{item.indicator}</td>
      <td>{item.target}</td>
    </tr>
  );
}

function DevelopmentTable({
  items,
}: {
  items: AssessmentDevelopmentPlanItem[];
}) {
  return (
    <div className="development-table-wrap">
      <table className="development-table">
        <DevelopmentTableHead />
        <tbody>
          {items.length ? (
            items.map((item, index) => (
              <DevelopmentTableRow
                key={`${item.domain}-${index}`}
                item={item}
              />
            ))
          ) : (
            <tr>
              <td colSpan={8}>لا توجد عناصر خطة تطوير.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderFlowPageBlocks(blocks: AssessmentFlowBlock[]) {
  const output: React.ReactNode[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.kind !== "table-row") {
      output.push(<React.Fragment key={block.id}>{block.node}</React.Fragment>);
      continue;
    }

    const rows: React.ReactNode[] = [];
    let cursor = index;

    while (cursor < blocks.length && blocks[cursor].kind === "table-row") {
      rows.push(
        <React.Fragment key={blocks[cursor].id}>
          {blocks[cursor].node}
        </React.Fragment>,
      );
      cursor += 1;
    }

    output.push(
      <div className="development-table-wrap" key={`table-${block.id}`}>
        <table className="development-table">
          <DevelopmentTableHead />
          <tbody>{rows}</tbody>
        </table>
      </div>,
    );

    index = cursor - 1;
  }

  return output;
}

function AnalyticalReportPages({
  data,
}: {
  data: AssessmentAnalyticalReportData;
}) {
  const domains = data.domains ?? [];
  const followUp = data.analysis.followUpIndicators?.length
    ? data.analysis.followUpIndicators
    : [
        "متابعة تنفيذ الإجراءات المعتمدة.",
        "قياس أثر التدخلات في القياسات القادمة.",
        "مراجعة مؤشرات التحسن دوريًا.",
        "تحديث الخطة بناءً على النتائج اللاحقة.",
      ];

  const flowBlocks = useMemo<AssessmentFlowBlock[]>(() => {
    const blocks: AssessmentFlowBlock[] = [
      {
        id: "analysis-title",
        kind: "content",
        node: <SectionTitle title="التحليل التربوي وخطط التحسين" />,
      },
      {
        id: "analysis-summary",
        kind: "content",
        node: (
          <div className="analysis-summary">
            <h3>القراءة التحليلية</h3>
            <p>{data.analysis.executiveSummary}</p>
          </div>
        ),
      },
      {
        id: "strengths-improvements",
        kind: "content",
        node: (
          <div className="insights-grid">
            <div className="insight-card insight-card--green">
              <div className="insight-card__head">
                <span>✓</span>
                <h3>نقاط القوة</h3>
              </div>
              <InsightList items={data.analysis.strengths} tone="green" />
            </div>
            <div className="insight-card insight-card--amber">
              <div className="insight-card__head">
                <span>!</span>
                <h3>جوانب التحسين</h3>
              </div>
              <InsightList items={data.analysis.improvementAreas} tone="amber" />
            </div>
          </div>
        ),
      },
      {
        id: "causes-recommendations",
        kind: "content",
        node: (
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-card__head">
                <span>?</span>
                <h3>الأسباب المحتملة</h3>
              </div>
              <InsightList items={data.analysis.possibleCauses} />
            </div>
            <div className="insight-card">
              <div className="insight-card__head">
                <span>↗</span>
                <h3>التوصيات</h3>
              </div>
              <InsightList items={data.analysis.recommendations} />
            </div>
          </div>
        ),
      },
      {
        id: "remedial-enrichment",
        kind: "content",
        node: (
          <div className="plan-grid">
            <div className="plan-box plan-box--remedial">
              <h3>الخطة العلاجية</h3>
              <InsightList items={data.analysis.remedialPlan} tone="red" />
            </div>
            <div className="plan-box plan-box--enrichment">
              <h3>الخطة الإثرائية</h3>
              <InsightList items={data.analysis.enrichmentPlan} tone="green" />
            </div>
          </div>
        ),
      },
      {
        id: "development-title",
        kind: "table-title",
        node: <SectionTitle title="خطة التطوير" />,
      },
    ];

    if (data.developmentPlan.length) {
      data.developmentPlan.forEach((item, index) => {
        blocks.push({
          id: `development-row-${index}`,
          kind: "table-row",
          node: <DevelopmentTableRow item={item} />,
        });
      });
    } else {
      blocks.push({
        id: "development-empty-row",
        kind: "table-row",
        node: (
          <tr>
            <td colSpan={8}>لا توجد عناصر خطة تطوير.</td>
          </tr>
        ),
      });
    }

    return blocks;
  }, [data, domains]);

  const measurementRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<AssessmentFlowBlock[][] | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    const measureAndPaginate = () => {
      const root = measurementRef.current;
      const page = root?.querySelector<HTMLElement>("[data-flow-measure-page]");
      const content = root?.querySelector<HTMLElement>("[data-flow-measure-content]");

      if (!root || !page || !content) return;

      const pageStyle = getComputedStyle(page);
      const paddingTop = parseFloat(pageStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(pageStyle.paddingBottom) || 0;
      const brand = page.querySelector<HTMLElement>(".report-brand");
      const brandStyle = brand ? getComputedStyle(brand) : null;
      const brandHeight = brand
        ? brand.getBoundingClientRect().height + (parseFloat(brandStyle?.marginBottom || "0") || 0)
        : 0;
      const footerReserve = 38;
      const usableHeight = Math.max(
        100,
        page.getBoundingClientRect().height -
          paddingTop -
          paddingBottom -
          brandHeight -
          footerReserve,
      );
      const gap = parseFloat(getComputedStyle(content).rowGap || "0") || 0;
      const tableHead = root.querySelector<HTMLElement>(".assessment-report__measurement-table thead");
      const tableHeadHeight = tableHead?.getBoundingClientRect().height || 0;
      const measured = new Map<string, number>();

      root.querySelectorAll<HTMLElement>("[data-flow-measure-block]").forEach((element) => {
        measured.set(element.dataset.flowMeasureBlock || "", element.getBoundingClientRect().height);
      });
      root.querySelectorAll<HTMLElement>("[data-flow-measure-row]").forEach((element) => {
        measured.set(element.dataset.flowMeasureRow || "", element.getBoundingClientRect().height);
      });

      const result: AssessmentFlowBlock[][] = [];
      let current: AssessmentFlowBlock[] = [];
      let used = 0;

      const pushPage = () => {
        if (current.length) result.push(current);
        current = [];
        used = 0;
      };

      flowBlocks.forEach((block, index) => {
        const height = measured.get(block.id) || 1;
        const previous = flowBlocks[index - 1];
        const startsTable = block.kind === "table-row" && previous?.kind !== "table-row";
        const tableHeader = startsTable ? tableHeadHeight : 0;
        const next = flowBlocks[index + 1];
        const keepNext = block.kind === "table-title" && next;
        const nextHeight = keepNext ? measured.get(next.id) || 1 : 0;
        const nextHeader = keepNext && next.kind === "table-row" ? tableHeadHeight : 0;
        const required = height + tableHeader + (current.length ? gap : 0) + (keepNext ? gap + nextHeight + nextHeader : 0);

        if (current.length && used + required > usableHeight) {
          pushPage();
        }

        const currentPrevious = current[current.length - 1];
        const currentStartsTable = block.kind === "table-row" && currentPrevious?.kind !== "table-row";
        used += height + (current.length ? gap : 0) + (currentStartsTable ? tableHeadHeight : 0);
        current.push(block);
      });

      pushPage();

      if (!cancelled) setPages(result.length ? result : [flowBlocks]);
    };

    const fonts = document.fonts?.ready;
    if (fonts) {
      fonts.then(() => requestAnimationFrame(measureAndPaginate));
    } else {
      requestAnimationFrame(measureAndPaginate);
    }

    return () => {
      cancelled = true;
    };
  }, [flowBlocks]);

  const pageGroups = pages || [];
  const closingPageNumber = 3 + pageGroups.length;

  return (
    <>
      <div
        ref={measurementRef}
        className="assessment-report__measurement"
        aria-hidden="true"
      >
        <AssessmentReportPage className="report-page--flow" measurePage>
          <ReportBrand data={data} />
          <div className="assessment-report__flow-content" data-flow-measure-content="true">
            {flowBlocks.map((block) =>
              block.kind === "table-row" ? null : (
                <div key={block.id} data-flow-measure-block={block.id}>
                  {block.node}
                </div>
              ),
            )}
            <table className="development-table assessment-report__measurement-table">
              <DevelopmentTableHead />
              <tbody>
                {data.developmentPlan.map((item, index) => (
                  <tr key={index} data-flow-measure-row={`development-row-${index}`}>
                    <td>{item.domain}</td><td>{item.need}</td><td>{item.action}</td><td>{item.method}</td>
                    <td>{item.duration}</td><td>{item.responsible}</td><td>{item.indicator}</td><td>{item.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AssessmentReportPage>
      </div>

      <div className="assessment-report__pages">
        {pages ? pageGroups.map((group, index) => (
          <AssessmentReportPage className="report-page--flow report-page--dynamic" key={`analysis-page-${index}`}>
            <ReportBrand data={data} />
            <div className="assessment-report__flow-content">
              {renderFlowPageBlocks(group)}
            </div>
            <PageFooter page={3 + index} />
          </AssessmentReportPage>
        )) : (
          <AssessmentReportPage className="report-page--flow report-page--pending">
            <ReportBrand data={data} />
            <div className="assessment-report__pending">جاري تنسيق صفحات التقرير...</div>
          </AssessmentReportPage>
        )}

        {pages ? (
          <AssessmentReportPage className="report-page--closing report-page--dynamic">
            <ReportBrand data={data} />
            <SectionTitle title="الخاتمة" />
            <div className="closing-content">
              <div className="closing-summary">
                <p>يلخص هذا التقرير النتائج التحليلية المتاحة، ويوضح نقاط القوة ومجالات التحسين، ويدعم تنفيذ إجراءات علاجية وإثرائية وخطة تطوير قابلة للمتابعة. وينبغي الاستفادة من القياسات القادمة لتقييم أثر الإجراءات وتحديث الخطة وفق النتائج اللاحقة.</p>
              </div>
              <div className="follow-up-box follow-up-box--final">
                <h3>المتابعة الختامية</h3>
                <InsightList items={followUp} />
              </div>
            </div>
            <div className="report-signatures">
              <SignatureBox label="المعلم / المعلمة" name={data.school.teacherName} imageUrl={data.school.teacherSignatureUrl} />
              <SignatureBox label="مدير / مديرة المدرسة" name={data.school.principalName} imageUrl={data.school.principalSignatureUrl} />
            </div>
            <PageFooter page={closingPageNumber} />
          </AssessmentReportPage>
        ) : null}
      </div>
    </>
  );
}

export function AssessmentAnalyticalReport({ data }: Props) {
  const domains = data.domains ?? [], periodCount = Math.max(data.periods.length, 1);
  const followUp = data.analysis.followUpIndicators?.length ? data.analysis.followUpIndicators : data.presentation.hasComparison
    ? ["متابعة تنفيذ الإجراءات المعتمدة.", "قياس أثر التدخلات في القياسات القادمة.", "مراجعة مؤشرات التحسن دوريًا.", "تحديث الخطة بناءً على النتائج اللاحقة."]
    : ["متابعة تنفيذ الإجراءات المعتمدة.", "قياس مستويات الأداء في القياسات القادمة.", "مراجعة جوانب التحسين ذات الأولوية.", "تحديث الخطة بناءً على النتائج اللاحقة."];
  return <AssessmentAudienceContext.Provider value={{ audience: data.studentAudience || "الطلاب", presentation: data.presentation }}><div className={`assessment-report assessment-report--${data.presentation.mode}`} dir="rtl">
  <section className="report-page report-cover"><div className="cover-accent cover-accent--top" /><ReportBrand data={data} /><div className="cover-content"><div className="cover-badge">{data.analysisTypeLabel}</div><h1>{data.reportTitle}</h1>{data.reportSubtitle ? <p className="cover-subtitle">{data.reportSubtitle}</p> : null}<div className="cover-line" /><div className="cover-meta-grid"><div><span>المادة</span><strong>{data.metadata.subject}</strong></div><div><span>الصف</span><strong>{data.metadata.grade}</strong></div><div><span>الفصل</span><strong>{data.metadata.classroom || "—"}</strong></div><div><span>الدرجة الكلية</span><strong>{data.metadata.maximumScore}</strong></div><div><span>الفصل الدراسي</span><strong>{data.metadata.semester || "—"}</strong></div><div><span>العام الدراسي</span><strong>{data.metadata.academicYear || "—"}</strong></div></div><div className="cover-bottom"><div><span>عدد القياسات</span><strong>{periodCount}</strong></div><div><span>عدد الطلاب</span><strong>{data.metrics.studentCount}</strong></div><div><span>تاريخ التقرير</span><strong>{data.metadata.reportDate || "—"}</strong></div></div></div><div className="cover-accent cover-accent--bottom" /><PageFooter page={1} /></section>

    <section className="report-page"><ReportBrand data={data} />{data.presentation.periodCount === 1 ? <CurrentStateAnalytics data={data} /> : <><SectionTitle title="البيانات والمؤشرات التحليلية" /><div className="report-info-strip"><div><span>نوع التحليل</span><strong>{data.analysisTypeLabel}</strong></div><div><span>المادة</span><strong>{data.metadata.subject}</strong></div><div><span>الصف</span><strong>{data.metadata.grade}</strong></div><div><span>الفصل</span><strong>{data.metadata.classroom || "—"}</strong></div><div><span>الدرجة الكلية</span><strong>{data.metadata.maximumScore}</strong></div></div><div className="metrics-grid"><MetricCard label="عدد الطلاب" value={data.metrics.studentCount} tone="blue" /><MetricCard label="متوسط الدرجات" value={formatNumber(data.metrics.averageScore)} hint={`من ${data.metadata.maximumScore}`} tone="blue" /><MetricCard label="نسبة التحصيل" value={formatPercent(data.metrics.achievementRate)} tone="green" /><MetricCard label="أعلى درجة" value={formatNumber(data.metrics.highestScore)} hint={`من ${data.metadata.maximumScore}`} tone="blue" /><MetricCard label="أدنى درجة" value={formatNumber(data.metrics.lowestScore)} hint={`من ${data.metadata.maximumScore}`} tone="amber" /><MetricCard label="مؤشر التحسن" value={formatPercent(data.metrics.improvementRate)} tone={(data.metrics.improvementRate ?? 0) >= 0 ? "green" : "red"} /></div><div className="charts-grid charts-grid--top"><TrendChart periods={data.periods} /><div className="chart-shell"><div className="chart-shell__header"><strong>توزيع مستويات الأداء</strong></div><DonutChart levels={data.performanceLevels} /></div></div><div className="charts-grid charts-grid--bottom"><div className="chart-shell"><div className="chart-shell__header"><strong>مؤشرات الحركة والتحسن</strong></div><div className="movement-grid"><MetricCard label="تحسن" value={data.metrics.improvedCount ?? "—"} tone="green" /><MetricCard label="ثبات" value={data.metrics.stableCount ?? "—"} tone="blue" /><MetricCard label="تراجع" value={data.metrics.declinedCount ?? "—"} tone="red" /></div></div>{domains.length ? <div className="chart-shell"><div className="chart-shell__header"><strong>الأداء حسب المجالات / المهارات</strong></div><DomainBars domains={domains} /></div> : <div className="chart-shell chart-shell--summary"><div className="chart-shell__header"><strong>الملخص التنفيذي</strong></div><p className="executive-summary">{data.analysis.executiveSummary}</p></div>}</div></>}<PageFooter page={2} /></section>

    <section className="report-page report-page--flow"><ReportBrand data={data} /><SectionTitle title="التحليل التربوي وخطط التحسين" /><div className="analysis-summary"><h3>القراءة التحليلية</h3><p>{data.analysis.executiveSummary}</p></div><div className="insights-grid"><div className="insight-card insight-card--green"><div className="insight-card__head"><span>✓</span><h3>نقاط القوة</h3></div><InsightList items={data.analysis.strengths} tone="green" /></div><div className="insight-card insight-card--amber"><div className="insight-card__head"><span>!</span><h3>جوانب التحسين</h3></div><InsightList items={data.analysis.improvementAreas} tone="amber" /></div></div><div className="insights-grid"><div className="insight-card"><div className="insight-card__head"><span>?</span><h3>الأسباب المحتملة</h3></div><InsightList items={data.analysis.possibleCauses} /></div><div className="insight-card"><div className="insight-card__head"><span>↗</span><h3>التوصيات</h3></div><InsightList items={data.analysis.recommendations} /></div></div><div className="plan-grid"><div className="plan-box plan-box--remedial"><h3>الخطة العلاجية</h3><InsightList items={data.analysis.remedialPlan} tone="red" /></div><div className="plan-box plan-box--enrichment"><h3>الخطة الإثرائية</h3><InsightList items={data.analysis.enrichmentPlan} tone="green" /></div></div><SectionTitle title="خطة التطوير" /><div className="development-table-wrap"><table className="development-table"><thead><tr><th>المجال</th><th>وصف الاحتياج</th><th>إجراء التحسين</th><th>الأسلوب / الطريقة</th><th>المدة</th><th>المسؤول</th><th>مؤشر القياس</th><th>المستهدف</th></tr></thead><tbody>{data.developmentPlan.length ? data.developmentPlan.map((item, index) => <tr key={`${item.domain}-${index}`}><td>{item.domain}</td><td>{item.need}</td><td>{item.action}</td><td>{item.method}</td><td>{item.duration}</td><td>{item.responsible}</td><td>{item.indicator}</td><td>{item.target}</td></tr>) : <tr><td colSpan={8}>لا توجد عناصر خطة تطوير.</td></tr>}</tbody></table></div>{data.analysis.followUpIndicators?.length ? <div className="follow-up-box"><h3>مؤشرات المتابعة</h3><InsightList items={data.analysis.followUpIndicators} /></div> : null}<PageFooter page={3} /></section>

    <section className="report-page report-page--closing"><ReportBrand data={data} /><SectionTitle title="الخاتمة" /><div className="closing-content"><div className="closing-summary"><p>يلخص هذا التقرير النتائج التحليلية المتاحة، ويوضح نقاط القوة ومجالات التحسين، ويدعم تنفيذ إجراءات علاجية وإثرائية وخطة تطوير قابلة للمتابعة. وينبغي الاستفادة من القياسات القادمة لتقييم أثر الإجراءات وتحديث الخطة وفق النتائج اللاحقة.</p></div><div className="follow-up-box follow-up-box--final"><h3>المتابعة الختامية</h3><InsightList items={followUp} /></div></div><div className="report-signatures"><SignatureBox label="المعلم / المعلمة" name={data.school.teacherName} imageUrl={data.school.teacherSignatureUrl} /><SignatureBox label="مدير / مديرة المدرسة" name={data.school.principalName} imageUrl={data.school.principalSignatureUrl} /></div><PageFooter page={4} /></section>

    <AnalyticalReportPages data={data} />

    <style jsx global>{`
      .assessment-report--SINGLE_MEASUREMENT .charts-grid--bottom,.assessment-report--SINGLE_STUDENT .charts-grid--top,.assessment-report--SINGLE_STUDENT .charts-grid--bottom,.assessment-report--SINGLE_STUDENT_COMPARISON .charts-grid--top>.chart-shell,.assessment-report--SINGLE_STUDENT_MULTI_PERIOD .charts-grid--top>.chart-shell{display:none}
      .assessment-report--SINGLE_STUDENT_COMPARISON .charts-grid--top,.assessment-report--SINGLE_STUDENT_MULTI_PERIOD .charts-grid--top{grid-template-columns:1fr}
      .assessment-report{--report-navy:${COLORS.navy};--report-teal:${COLORS.teal};--report-turquoise:${COLORS.turquoise};--report-blue:${COLORS.blue};--report-green:${COLORS.green};--report-border:${COLORS.border};--report-soft:${COLORS.soft};--report-text:${COLORS.text};width:210mm;min-width:210mm;max-width:210mm;margin:0;padding:32px 0;color:var(--report-text);font-family:var(--font-cairo),"Cairo",Tahoma,Arial,sans-serif;background:#edf3f8}
      .assessment-report>.report-page--flow:not(.report-page--dynamic),.assessment-report>.report-page--closing:not(.report-page--dynamic){display:none!important}
      .report-page{position:relative;width:210mm;height:297mm;min-height:297mm;max-height:297mm;margin:0 auto 28px;box-sizing:border-box;background:#fff;padding:14mm 13mm 18mm;box-shadow:0 20px 55px rgba(31,63,91,.1);break-after:page;page-break-after:always;overflow:hidden}
      .report-page--flow{height:297mm;min-height:297mm;max-height:297mm;overflow:hidden;break-after:page;page-break-after:always}.report-page--flow>.page-footer{position:absolute;bottom:8mm;margin-top:0}
      .assessment-report__pages{display:flex;flex-direction:column;gap:28px}.assessment-report__flow-content{display:flex;min-width:0;flex-direction:column;gap:10px}.assessment-report__pending{display:grid;min-height:220mm;place-items:center;color:#536b80;font-size:15px;font-weight:800}.assessment-report__measurement{position:fixed;top:0;left:-100000px;width:210mm;visibility:hidden;pointer-events:none;contain:layout style paint}.assessment-report__measurement .report-page{margin:0}.assessment-report__measurement-table{margin-top:0}
      .report-page--closing{break-before:page;page-break-before:always;break-after:auto;page-break-after:auto;display:flex;flex-direction:column}
      .report-brand{display:grid;grid-template-columns:94px minmax(0,1fr) 145px;gap:22px;align-items:center;padding-bottom:14px;border-bottom:2px solid #e2ebf2;margin-bottom:20px;direction:ltr}.report-brand__vision{display:flex;justify-content:flex-start;align-items:center}.report-brand__vision img{width:88px;max-height:68px;object-fit:contain}.report-brand__identity{display:flex;justify-content:flex-end;align-items:center}.report-brand__ministry{max-height:58px;max-width:145px;object-fit:contain}.report-brand__ministry-placeholder{font-size:19px;font-weight:800;color:var(--report-teal)}.report-brand__school{display:flex;flex-direction:column;text-align:center;gap:2px;line-height:1.6;min-width:0}.report-brand__school strong{color:var(--report-navy);font-size:19px;font-weight:900}.report-brand__school span{font-size:13px;color:#536b80;font-weight:700}.report-brand__school-logo,.report-brand__school-mark{display:none}
      .report-cover{display:flex;flex-direction:column}.cover-accent{position:absolute;left:0;right:0;height:12px;background:linear-gradient(90deg,var(--report-blue),var(--report-turquoise),var(--report-green))}.cover-accent--top{top:0}.cover-accent--bottom{bottom:0}.cover-content{max-width:630px;margin:auto;width:100%;text-align:center;padding:35px 0 25px}.cover-badge{width:max-content;margin:0 auto 24px;border-radius:999px;padding:9px 20px;background:#e8f7f5;color:var(--report-teal);font-weight:900;font-size:15px}.cover-content h1{margin:0;color:var(--report-navy);font-size:42px;line-height:1.5;letter-spacing:-1px;font-weight:950}.cover-subtitle{color:#536b80;font-size:19px;font-weight:700;margin:10px 0 0}.cover-line{width:90px;height:5px;border-radius:999px;background:linear-gradient(90deg,var(--report-teal),var(--report-blue));margin:26px auto 34px}.cover-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--report-border);border-radius:24px;overflow:hidden;background:#fff}.cover-meta-grid>div{padding:18px 14px;border-left:1px solid var(--report-border);border-bottom:1px solid var(--report-border)}.cover-meta-grid span{display:block;color:#536b80;font-size:13px;font-weight:800;margin-bottom:7px}.cover-meta-grid strong{color:var(--report-navy);font-size:17px;font-weight:900}.cover-bottom{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:36px}.cover-bottom>div{border:1px solid var(--report-border);border-radius:16px;padding:14px;text-align:center;background:var(--report-soft)}.cover-bottom span{display:block;font-size:12px;color:#536b80;font-weight:800;margin-bottom:4px}.cover-bottom strong{font-size:17px;color:var(--report-navy);font-weight:900}.report-cover--current-state{padding-bottom:25mm}.report-cover--current-state .cover-content{margin:0 auto;padding:20px 0 12px}.report-cover--current-state .cover-badge{margin-bottom:12px;padding:7px 18px}.report-cover--current-state .cover-content h1{font-size:34px;line-height:1.3}.report-cover--current-state .cover-subtitle{font-size:16px;margin-top:6px}.report-cover--current-state .cover-line{margin:14px auto 18px}.report-cover--current-state .cover-meta-grid>div{padding:11px 10px}.report-cover--current-state .cover-meta-grid span{font-size:11px;margin-bottom:4px}.report-cover--current-state .cover-meta-grid strong{font-size:15px}.cover-current-state__kpis{grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:9px}.cover-current-state__kpis .metric-card{min-height:66px;padding:8px}.cover-current-state__kpis .metric-card__label{font-size:10px;margin-bottom:4px}.cover-current-state__kpis .metric-card__value{font-size:18px}.cover-current-state__visuals{gap:9px;margin-bottom:9px}.cover-current-state__visuals .chart-shell{min-height:165px;padding:10px}.cover-current-state__visuals .chart-shell__header{margin-bottom:3px}.cover-current-state__visuals .chart-shell__header strong{font-size:12px}.cover-current-state__visuals .donut-layout{height:132px;gap:4px}.cover-current-state__visuals .donut-chart svg{width:118px}.cover-current-state__visuals .donut-legend{gap:4px}.cover-current-state__visuals .donut-legend__row{font-size:9px;gap:4px}.cover-current-state__footer{grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:0!important}.cover-current-state__footer .metric-card{min-height:58px;padding:7px}.cover-current-state__footer .metric-card__label{font-size:10px;margin-bottom:3px}.cover-current-state__footer .metric-card__value{font-size:17px}
      .section-title{display:flex;align-items:flex-start;gap:10px;margin:4px 0 18px;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid}.section-title__mark{width:5px;min-width:5px;height:43px;border-radius:999px;background:linear-gradient(180deg,var(--report-blue),var(--report-teal))}.section-title h2{margin:0;color:var(--report-navy);font-size:24px;font-weight:950}.section-title p{margin:3px 0 0;font-size:13px;color:#536b80;font-weight:700}.report-info-strip{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--report-border);border-radius:15px;background:#f2f7fb;overflow:hidden;margin-bottom:14px}.report-info-strip>div{padding:12px 8px;text-align:center;border-left:1px solid var(--report-border)}.report-info-strip span{display:block;font-size:11px;color:#40596e;font-weight:900;margin-bottom:4px}.report-info-strip strong{font-size:13px;color:var(--report-navy);font-weight:900}
      .metrics-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px}.metric-card{min-height:82px;box-sizing:border-box;border:1px solid var(--report-border);border-radius:14px;padding:12px;text-align:center;display:flex;flex-direction:column;justify-content:center;background:#f2f7fd;break-inside:avoid;page-break-inside:avoid}.metric-card--default,.metric-card--blue{background:#f2f7fd}.metric-card--green{background:#edf9f3;border-color:#c8e7d9}.metric-card--amber{background:#fff8e8;border-color:#efdca9}.metric-card--red{background:#fff0f0;border-color:#efc9c9}.metric-card__label{color:#40596e;font-size:11px;font-weight:900;margin-bottom:6px}.metric-card__value{color:var(--report-navy);font-size:22px;line-height:1;font-weight:950}.metric-card--green .metric-card__value{color:var(--report-green)}.metric-card--blue .metric-card__value{color:var(--report-blue)}.metric-card--amber .metric-card__value{color:#996600}.metric-card--red .metric-card__value{color:var(--report-red)}.metric-card__hint{color:#536b80;font-size:10px;font-weight:700;margin-top:5px}
      .charts-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:12px;margin-bottom:12px}.charts-grid--bottom{grid-template-columns:.8fr 1.2fr}.chart-shell{border:1px solid var(--report-border);border-radius:16px;background:#fff;padding:13px;min-height:226px;box-sizing:border-box;break-inside:avoid;page-break-inside:avoid}.chart-shell__header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:7px}.chart-shell__header strong{font-size:14px;color:var(--report-navy);font-weight:950}.chart-shell__header span{color:#536b80;font-size:10px;font-weight:700}.trend-chart{display:block;width:100%;height:190px}.donut-layout{height:190px;display:grid;grid-template-columns:.9fr 1.1fr;align-items:center;gap:8px}.donut-chart svg{width:150px;max-width:100%;margin:auto;display:block}.donut-legend{display:flex;flex-direction:column;gap:9px}.donut-legend__row{display:grid;grid-template-columns:10px 1fr auto auto;align-items:center;gap:7px;font-size:11px}.donut-legend__row strong{color:var(--report-navy);font-weight:900}.donut-legend__row span,.donut-legend__row b{color:#40596e;font-weight:800}.donut-legend__color{width:10px;height:10px;border-radius:50%}.movement-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:24px}.domain-bars{display:flex;flex-direction:column;gap:12px;padding-top:9px}.domain-bar__head{display:flex;justify-content:space-between;gap:10px;font-size:11px;margin-bottom:5px;font-weight:800}.domain-bar__head span{color:#40596e}.domain-bar__head strong{color:var(--report-teal);font-weight:950}.domain-bar__track{width:100%;height:9px;background:#e4edf3;border-radius:999px;overflow:hidden}.domain-bar__value{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--report-teal),var(--report-turquoise))}.chart-shell--summary{display:flex;flex-direction:column}.executive-summary{border-radius:14px;background:#f7fafc;padding:15px;font-size:12px;line-height:2.1;color:#40596e;font-weight:700;margin:10px 0 0}.cover-current-state__visuals{grid-template-columns:.85fr 1.15fr}.current-state-summary-card{min-height:226px}.current-state-summary-card .executive-summary{min-height:150px;font-size:13px;line-height:2.15}
      .analysis-summary{border:1px solid #c9dde8;border-right:5px solid var(--report-teal);border-radius:14px;background:#f5fbfc;padding:14px 16px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid}.analysis-summary h3{color:var(--report-teal);font-size:15px;font-weight:950;margin:0 0 7px}.analysis-summary p{color:#304d63;font-size:12px;line-height:2.1;font-weight:700;margin:0}.insights-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}.insight-card{border:1px solid var(--report-border);border-radius:14px;padding:12px 14px;background:#fff;break-inside:avoid;page-break-inside:avoid}.insight-card--green{background:#f8fdfb}.insight-card--amber{background:#fffdf7}.insight-card__head{display:flex;gap:8px;align-items:center;margin-bottom:9px}.insight-card__head>span{width:23px;height:23px;border-radius:7px;display:grid;place-items:center;background:#edf5fa;color:var(--report-blue);font-size:12px;font-weight:950}.insight-card h3,.plan-box h3{font-size:14px;color:var(--report-navy);font-weight:950;margin:0 0 9px}.insight-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}.insight-list li{display:flex;gap:7px;align-items:flex-start}.insight-list li>span{width:20px;height:20px;flex:0 0 20px;border-radius:6px;display:grid;place-items:center;background:#edf5fb;color:var(--report-blue);font-size:9px;font-weight:950}.insight-list--green li>span{background:#e5f6ed;color:var(--report-green)}.insight-list--amber li>span{background:#fff1cf;color:#946300}.insight-list--red li>span{background:#ffeded;color:var(--report-red)}.insight-list p{margin:0;color:#304d63;font-size:11px;font-weight:700;line-height:1.9}.empty-insight{color:#536b80;font-size:11px;font-weight:700;padding:8px 0}.plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:13px}.plan-box{border-radius:14px;border:1px solid var(--report-border);padding:12px 14px;break-inside:avoid;page-break-inside:avoid}.plan-box--remedial{background:#fffafa}.plan-box--enrichment{background:#f8fdfb}.development-table-wrap{border:1px solid #aebfcb;border-radius:12px;overflow-x:auto;margin-bottom:10px;break-inside:auto;page-break-inside:auto}.development-table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #9fb3c1}.development-table thead{background:linear-gradient(90deg,var(--report-teal),#087a82);color:#fff;display:table-header-group}.development-table th,.development-table td{border:1px solid #aebfcb;padding:9px 7px;text-align:center;vertical-align:top;overflow-wrap:anywhere;word-break:normal}.development-table th{font-size:10px;font-weight:950;line-height:1.5}.development-table td{color:#304d63;font-size:10px;font-weight:700;line-height:1.8}.development-table tbody tr:nth-child(even){background:#f8fbfd}.development-table tbody tr{break-inside:avoid;page-break-inside:avoid}.follow-up-box{border:1px solid #c3d9e5;border-radius:12px;background:#f4fafc;padding:11px 13px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}.follow-up-box h3{color:var(--report-blue);font-size:14px;font-weight:950;margin:0 0 8px}.closing-content{display:flex;flex-direction:column;gap:20px}.closing-summary{border:1px solid #c9dde8;border-right:5px solid var(--report-teal);border-radius:16px;background:#f5fbfc;padding:20px}.closing-summary p{margin:0;color:#304d63;font-size:14px;font-weight:700;line-height:2.2}.follow-up-box--final{padding:17px}.report-signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:36px;margin-top:auto;margin-bottom:28px;padding-top:44px;break-inside:avoid;page-break-inside:avoid;text-align:center}.signature-box{min-height:120px;border-top:1px dashed #91a8b8;padding-top:11px}.signature-box>span{display:block;color:#40596e;font-size:12px;font-weight:900}.signature-box strong{display:block;color:var(--report-navy);font-size:14px;font-weight:950}.signature-image-area{height:58px;display:grid;place-items:center;margin:5px auto}.signature-image-area img{max-width:155px;max-height:55px;object-fit:contain}.signature-line{width:155px;border-bottom:1px solid #7992a3}.page-footer{position:absolute;bottom:8mm;left:13mm;right:13mm;border-top:1px solid #dce5eb;padding-top:7px;display:flex;justify-content:space-between;align-items:center;color:#536b80;font-size:10px;font-weight:700}.page-footer strong{width:23px;height:23px;border-radius:50%;background:#edf3f7;color:var(--report-navy);display:grid;place-items:center;font-size:10px;font-weight:950}
      @media print{@page{size:A4 portrait;margin:0}html,body{margin:0!important;padding:0!important;background:#fff!important}.assessment-report{padding:0!important;background:#fff!important}.assessment-report__pages{gap:0!important}.report-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;box-shadow:none!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important}.report-page--flow{height:297mm!important;min-height:297mm!important;max-height:297mm!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important}.report-page--closing{break-before:page!important;page-break-before:always!important;break-after:auto!important;page-break-after:auto!important}.page-footer{position:absolute!important;bottom:8mm!important}.report-page--closing>.page-footer{position:absolute!important;bottom:8mm!important;left:13mm!important;right:13mm!important}.chart-shell,.metric-card,.insight-card,.plan-box,.analysis-summary,.closing-summary,.follow-up-box,.report-signatures{break-inside:avoid;page-break-inside:avoid}.development-table-wrap{break-inside:auto!important;page-break-inside:auto!important;overflow:hidden!important}.development-table{break-inside:auto;page-break-inside:auto}.development-table thead{display:table-header-group}.development-table tr{break-inside:avoid;page-break-inside:avoid}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    `}</style>
  </div></AssessmentAudienceContext.Provider>;
}
