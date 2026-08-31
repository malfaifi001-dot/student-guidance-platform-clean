"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReportBrand, SignatureBox } from "./assessment-analytical-report";
import type { AssessmentAnalyticalReportData, AssessmentPerformanceLevel } from "./assessment-analytical-report";
import {
  normalizeSubjectPeriodicAi,
  type SubjectPeriodicAiAnalysis,
  type SubjectPeriodicEnrichmentItem,
  type SubjectPeriodicFollowUpIndicator,
  type SubjectPeriodicImprovementArea,
  type SubjectPeriodicRecommendation,
  type SubjectPeriodicRemedialItem,
  type SubjectPeriodicReinforcementItem,
  type SubjectPeriodicStrength,
} from "@/lib/assessments-center/subject-periodic-types";

type Props = {
  data: AssessmentAnalyticalReportData;
  snapshot: unknown;
};

type FlowBlock = {
  id: string;
  node: React.ReactNode;
  keepWithNext?: boolean;
};

const COLORS = {
  navy: "#123956",
  teal: "#0c8f8c",
  turquoise: "#12b4ae",
  blue: "#2878c7",
  green: "#159b71",
  amber: "#d59b22",
  red: "#d75050",
  slate: "#62748a",
  border: "#cddbe6",
  text: "#183247",
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function formatPercent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;
}

function text(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function PageFooter({ page }: { page: number }) {
  return <div className="subject-periodic-page-footer"><span>Teachix — مركز التحاليل والاختبارات</span><strong>{page}</strong></div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="subject-periodic-section-title"><div className="subject-periodic-section-title__mark" /><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>;
}

function MetricCard({ label, value, hint, tone = "blue" }: { label: string; value: React.ReactNode; hint?: string; tone?: "blue" | "green" | "amber" | "red" }) {
  return <div className={`subject-periodic-metric subject-periodic-metric--${tone}`}><span>{label}</span><strong>{value}</strong>{hint ? <small>{hint}</small> : null}</div>;
}

function DonutChart({ levels }: { levels: AssessmentPerformanceLevel[] }) {
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const palette = [COLORS.green, COLORS.blue, COLORS.amber, COLORS.red, COLORS.teal];
  let offset = 0;
  return <div className="subject-periodic-donut-layout">
    <div className="subject-periodic-donut"><svg viewBox="0 0 160 160" role="img" aria-label="نسبة الطلاب حسب مستوى الأداء">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#edf2f6" strokeWidth="21" />
      {levels.map((level, index) => {
        const dash = clamp(level.percentage) / 100 * circumference;
        const currentOffset = offset;
        offset += dash;
        return <circle key={`${level.label}-${index}`} cx="80" cy="80" r={radius} fill="none" stroke={palette[index % palette.length]} strokeWidth="21" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-currentOffset} transform="rotate(-90 80 80)" />;
      })}
      <text x="80" y="76" textAnchor="middle" fontSize="18" fontWeight="800" fill={COLORS.navy}>الأداء</text>
      <text x="80" y="98" textAnchor="middle" fontSize="11" fill={COLORS.slate}>حسب المستوى</text>
    </svg></div>
    <div className="subject-periodic-level-legend">{levels.map((level, index) => <div key={`${level.label}-${index}`}><i style={{ backgroundColor: palette[index % palette.length] }} /><b>{level.label}</b><span>{level.count}</span><strong>{formatPercent(level.percentage)}</strong></div>)}</div>
  </div>;
}

function PerformanceBars({ levels }: { levels: AssessmentPerformanceLevel[] }) {
  const maxCount = Math.max(...levels.map((level) => level.count), 1);
  const palette = [COLORS.green, COLORS.blue, COLORS.amber, COLORS.red, COLORS.teal];
  return <div className="subject-periodic-bars">{levels.map((level, index) => <div key={`${level.label}-${index}`} className="subject-periodic-bar-row"><div className="subject-periodic-bar-head"><span>{level.label}</span><strong>{level.count}</strong></div><div className="subject-periodic-bar-track"><div className="subject-periodic-bar-value" style={{ width: `${level.count / maxCount * 100}%`, backgroundColor: palette[index % palette.length] }} /></div></div>)}</div>;
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value || value === "—") return null;
  return <p className="subject-periodic-detail"><b>{label}:</b> {value}</p>;
}

function StringList({ items }: { items: string[] }) {
  return items.length ? <ul className="subject-periodic-bullet-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="subject-periodic-empty">لا توجد بيانات تفصيلية متاحة.</p>;
}

function StrengthCard({ item }: { item: SubjectPeriodicStrength }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--green"><h3>{text(item.title, "نقطة قوة")}</h3><Detail label="الدليل" value={item.evidence} /><Detail label="المعنى التربوي" value={item.educationalMeaning} /><Detail label="طريقة التعزيز" value={item.howToReinforce} /></article>;
}

function ImprovementCard({ item }: { item: SubjectPeriodicImprovementArea }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--amber"><h3>{text(item.title, "جانب تحسين")}</h3><Detail label="الدليل" value={item.evidence} /><Detail label="الأثر التربوي" value={item.educationalImpact} /><Detail label="الأولوية" value={item.priority} /></article>;
}

function RecommendationCard({ item }: { item: SubjectPeriodicRecommendation }) {
  return <article className="subject-periodic-education-card"><h3>{text(item.recommendation, "توصية تربوية")}</h3><Detail label="التنفيذ" value={item.implementation} /><Detail label="المسؤول" value={item.responsibleRole} /><Detail label="التوقيت" value={item.timing} /><Detail label="طريقة القياس" value={item.measurementMethod} /></article>;
}

function RemedialCard({ item }: { item: SubjectPeriodicRemedialItem }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--red"><h3>{text(item.targetNeed, "احتياج مستهدف")}</h3><Detail label="الهدف" value={item.objective} /><Detail label="الاستراتيجية" value={item.strategy} /><Detail label="المدة" value={item.duration} /><Detail label="المسؤول" value={item.responsible} /><Detail label="مؤشر القياس" value={item.measurementIndicator} /><Detail label="معيار النجاح" value={item.successCriteria} />{item.actions.length ? <div className="subject-periodic-sublist"><b>الإجراءات</b><StringList items={item.actions} /></div> : null}</article>;
}

function EnrichmentCard({ item }: { item: SubjectPeriodicEnrichmentItem }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--green"><h3>{text(item.targetStrength, "قوة مستهدفة")}</h3><Detail label="الهدف" value={item.objective} /><Detail label="النشاط" value={item.activity} /><Detail label="التنفيذ" value={item.implementation} /><Detail label="المتابعة" value={item.followUp} /><Detail label="مؤشر القياس" value={item.measurementIndicator} /></article>;
}

function ReinforcementCard({ item }: { item: SubjectPeriodicReinforcementItem }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--blue"><h3>{text(item.targetSkillOrBehavior, "مهارة أو سلوك مستهدف")}</h3><Detail label="الهدف" value={item.objective} /><Detail label="إجراء التعزيز" value={item.reinforcementAction} /><Detail label="التكرار" value={item.frequency} /><Detail label="المسؤول" value={item.responsible} /><Detail label="مؤشر القياس" value={item.measurementIndicator} /><Detail label="الناتج المتوقع" value={item.expectedOutcome} />{item.implementationSteps.length ? <div className="subject-periodic-sublist"><b>خطوات التنفيذ</b><StringList items={item.implementationSteps} /></div> : null}</article>;
}

function FollowUpCard({ item }: { item: SubjectPeriodicFollowUpIndicator }) {
  return <article className="subject-periodic-education-card subject-periodic-education-card--blue"><h3>{text(item.indicator, "مؤشر متابعة")}</h3><Detail label="المستهدف" value={item.target} /><Detail label="موعد المراجعة" value={item.reviewTiming} /><Detail label="معيار النجاح" value={item.successCriteria} /></article>;
}

function FallbackAi({ data }: { data: AssessmentAnalyticalReportData }): SubjectPeriodicAiAnalysis {
  return {
    analyticalReading: data.analysis.executiveSummary,
    strengths: data.analysis.strengths.map((title) => ({ title, evidence: "", educationalMeaning: "", howToReinforce: "" })),
    improvementAreas: data.analysis.improvementAreas.map((title) => ({ title, evidence: "", educationalImpact: "", priority: "" })),
    recommendations: data.analysis.recommendations.map((recommendation) => ({ recommendation, implementation: "", responsibleRole: "", timing: "", measurementMethod: "" })),
    remedialPlan: data.analysis.remedialPlan.map((targetNeed) => ({ targetNeed, objective: "", actions: [], strategy: "", duration: "", responsible: "", measurementIndicator: "", successCriteria: "" })),
    enrichmentPlan: data.analysis.enrichmentPlan.map((targetStrength) => ({ targetStrength, objective: "", activity: "", implementation: "", followUp: "", measurementIndicator: "" })),
    reinforcementPlan: [],
    followUpIndicators: (data.analysis.followUpIndicators || []).map((indicator) => ({ indicator, target: "", reviewTiming: "", successCriteria: "" })),
    finalConclusion: data.analysis.finalConclusion || "",
  };
}

function buildFlowBlocks(data: AssessmentAnalyticalReportData, ai: SubjectPeriodicAiAnalysis, signatures: React.ReactNode): FlowBlock[] {
  const blocks: FlowBlock[] = [];
  const addSection = (id: string, title: string, items: React.ReactNode[], emptyText = "لا توجد بيانات تفصيلية متاحة.") => {
    blocks.push({ id: `${id}-title`, keepWithNext: true, node: <SectionTitle title={title} /> });
    if (items.length) items.forEach((node, index) => blocks.push({ id: `${id}-${index}`, node }));
    else blocks.push({ id: `${id}-empty`, node: <article className="subject-periodic-education-card"><p className="subject-periodic-empty">{emptyText}</p></article> });
  };

  blocks.push({ id: "analytical-reading", node: <article className="subject-periodic-reading"><h3>القراءة التربوية</h3><p>{text(ai.analyticalReading, data.analysis.executiveSummary || "لم تتوفر قراءة تربوية بعد.")}</p></article> });
  addSection("strengths", "نقاط القوة", ai.strengths.map((item) => <StrengthCard key={item.title} item={item} />));
  addSection("improvements", "جوانب التحسين", ai.improvementAreas.map((item) => <ImprovementCard key={item.title} item={item} />));
  addSection("recommendations", "التوصيات", ai.recommendations.map((item) => <RecommendationCard key={item.recommendation} item={item} />));
  addSection("remedial", "الخطة العلاجية", ai.remedialPlan.map((item) => <RemedialCard key={item.targetNeed} item={item} />));
  addSection("enrichment", "الخطة الإثرائية", ai.enrichmentPlan.map((item) => <EnrichmentCard key={item.targetStrength} item={item} />));
  addSection("reinforcement", "الخطة التعزيزية", ai.reinforcementPlan.map((item) => <ReinforcementCard key={item.targetSkillOrBehavior} item={item} />));
  addSection("follow-up", "مؤشرات المتابعة", ai.followUpIndicators.map((item) => <FollowUpCard key={item.indicator} item={item} />));
  if (ai.finalConclusion) blocks.push({ id: "final-conclusion", node: <article className="subject-periodic-reading subject-periodic-reading--final"><h3>الخلاصة</h3><p>{ai.finalConclusion}</p></article> });
  blocks.push({ id: "signatures", node: signatures });
  return blocks;
}

function DynamicFlowPage({ data, blocks, page }: { data: AssessmentAnalyticalReportData; blocks: FlowBlock[]; page: number }) {
  return <section className="report-page subject-periodic-page subject-periodic-flow-page">
    <ReportBrand data={data} />
    <div className="subject-periodic-flow-content">{blocks.map((block) => <div className={`subject-periodic-flow-block${block.id === "signatures" ? " subject-periodic-flow-block--signatures" : ""}`} key={block.id}>{block.node}</div>)}</div>
    <PageFooter page={page} />
  </section>;
}

export function SubjectPeriodicReport({ data, snapshot }: Props) {
  const latest = data.presentation.availableMeasurements.at(-1);
  const scoreValues = latest?.scores.map((item) => item.score) ?? [];
  const totalScore = scoreValues.reduce((sum, value) => sum + value, 0);
  const normalizedAi = useMemo(() => normalizeSubjectPeriodicAi((snapshot && typeof snapshot === "object" ? snapshot as Record<string, unknown> : {}).ai), [snapshot]);
  const ai = useMemo(() => normalizedAi.analyticalReading || normalizedAi.strengths.length || normalizedAi.recommendations.length || normalizedAi.remedialPlan.length || normalizedAi.enrichmentPlan.length || normalizedAi.reinforcementPlan.length
    ? normalizedAi
    : FallbackAi({ data }), [data, normalizedAi]);
  const signatureContent = useMemo(() => <div className="subject-periodic-signatures"><SignatureBox label="المعلم / المعلمة" name={data.school.teacherName} imageUrl={data.school.teacherSignatureUrl} /><SignatureBox label="مدير / مديرة المدرسة" name={data.school.principalName} imageUrl={data.school.principalSignatureUrl} /></div>, [data.school.principalName, data.school.principalSignatureUrl, data.school.teacherName, data.school.teacherSignatureUrl]);
  const flowBlocks = useMemo(() => buildFlowBlocks(data, ai, signatureContent), [ai, data, signatureContent]);
  const measurementRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<FlowBlock[][] | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    const measureAndPaginate = () => {
      const root = measurementRef.current;
      const page = root?.querySelector<HTMLElement>("[data-subject-measure-page]");
      const content = root?.querySelector<HTMLElement>("[data-subject-measure-content]");
      if (!root || !page || !content) return;
      const pageStyle = getComputedStyle(page);
      const paddingTop = parseFloat(pageStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(pageStyle.paddingBottom) || 0;
      const brand = page.querySelector<HTMLElement>(".report-brand");
      const brandStyle = brand ? getComputedStyle(brand) : null;
      const brandHeight = brand ? brand.getBoundingClientRect().height + (parseFloat(brandStyle?.marginBottom || "0") || 0) : 0;
      const footerReserve = 38;
      const usableHeight = Math.max(120, page.getBoundingClientRect().height - paddingTop - paddingBottom - brandHeight - footerReserve);
      const gap = parseFloat(getComputedStyle(content).rowGap || "0") || 0;
      const measured = new Map<string, number>();
      root.querySelectorAll<HTMLElement>("[data-subject-flow-block]").forEach((element) => measured.set(element.dataset.subjectFlowBlock || "", element.getBoundingClientRect().height));
      const result: FlowBlock[][] = [];
      let current: FlowBlock[] = [];
      let used = 0;
      const pushPage = () => { if (current.length) result.push(current); current = []; used = 0; };
      flowBlocks.forEach((block, index) => {
        const height = measured.get(block.id) || 1;
        const next = flowBlocks[index + 1];
        const nextHeight = block.keepWithNext && next ? measured.get(next.id) || 1 : 0;
        const required = height + (current.length ? gap : 0) + (block.keepWithNext && next ? gap + nextHeight : 0);
        if (current.length && used + required > usableHeight) pushPage();
        used += height + (current.length ? gap : 0);
        current.push(block);
      });
      pushPage();
      if (!cancelled) setPages(result.length ? result : [flowBlocks]);
    };
    const fonts = document.fonts?.ready;
    if (fonts) fonts.then(() => requestAnimationFrame(measureAndPaginate));
    else requestAnimationFrame(measureAndPaginate);
    return () => { cancelled = true; };
  }, [flowBlocks]);

  const pageGroups = pages || [];
  return <div className="subject-periodic-report" dir="rtl">
    <section className="report-page subject-periodic-page subject-periodic-first-page">
      <ReportBrand data={data} />
      <header className="subject-periodic-title"><span>{data.analysisTypeLabel}</span><h1>تحليل نتائج الاختبار الفصلي</h1><p>مادة {data.metadata.subject}</p></header>
      <div className="subject-periodic-metadata">{[
        ["نوع التحليل", data.analysisTypeLabel], ["المادة", data.metadata.subject], ["الصف", data.metadata.grade], ["الفصل", data.metadata.classroom],
        ["الدرجة الكلية", String(data.metadata.maximumScore)], ["الفصل الدراسي", data.metadata.semester], ["العام الدراسي", data.metadata.academicYear], ["عدد الطلاب", String(data.metrics.studentCount)],
      ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{text(value)}</strong></div>)}</div>
      <SectionTitle title="المؤشرات الإحصائية" />
      <div className="subject-periodic-metrics">
        <MetricCard label="عدد الطلاب" value={data.metrics.studentCount} tone="blue" />
        <MetricCard label="أعلى درجة" value={formatNumber(data.metrics.highestScore)} hint={`من ${data.metadata.maximumScore}`} tone="green" />
        <MetricCard label="أدنى درجة" value={formatNumber(data.metrics.lowestScore)} hint={`من ${data.metadata.maximumScore}`} tone="amber" />
        <MetricCard label="متوسط الدرجات" value={formatNumber(data.metrics.averageScore)} hint={`من ${data.metadata.maximumScore}`} tone="blue" />
        <MetricCard label="نسبة التحصيل" value={formatPercent(data.metrics.achievementRate)} tone="green" />
        <MetricCard label="مجموع الدرجات" value={formatNumber(totalScore)} tone="blue" />
        <MetricCard label="مدى الدرجات" value={formatNumber(data.metrics.scoreRange)} tone="amber" />
        <MetricCard label="نسبة الإتقان" value={formatPercent(data.metrics.masteryPercentage)} hint={data.metrics.masteryCount != null ? `${data.metrics.masteryCount} طالب` : undefined} tone="green" />
      </div>
      <div className="subject-periodic-level-summary"><SectionTitle title="مستويات الأداء" subtitle="التوزيع نفسه المستخدم في المؤشرات الحتمية للتحليل" /><div className="subject-periodic-level-table">{data.performanceLevels.map((level, index) => <div key={`${level.label}-${index}`}><b>{level.label}</b><span>{level.count}</span><strong>{formatPercent(level.percentage)}</strong></div>)}</div></div>
      <div className="subject-periodic-charts"><div className="subject-periodic-chart-card"><h3>نسبة الطلاب حسب مستوى الأداء</h3><DonutChart levels={data.performanceLevels} /></div><div className="subject-periodic-chart-card"><h3>عدد الطلاب حسب مستوى الأداء</h3><PerformanceBars levels={data.performanceLevels} /></div></div>
      <PageFooter page={1} />
    </section>

    <div ref={measurementRef} className="subject-periodic-measurement" aria-hidden="true"><section className="report-page subject-periodic-page subject-periodic-flow-page" data-subject-measure-page="true"><ReportBrand data={data} /><div className="subject-periodic-flow-content" data-subject-measure-content="true">{flowBlocks.map((block) => <div className={`subject-periodic-flow-block${block.id === "signatures" ? " subject-periodic-flow-block--signatures" : ""}`} data-subject-flow-block={block.id} key={block.id}>{block.node}</div>)}</div></section></div>
    <div className="subject-periodic-pages">{pages ? pageGroups.map((group, index) => <DynamicFlowPage key={`subject-periodic-page-${index}`} data={data} blocks={group} page={index + 2} />) : <section className="report-page subject-periodic-page subject-periodic-flow-page"><ReportBrand data={data} /><div className="subject-periodic-pending">جاري تنسيق صفحات المحتوى التربوي...</div><PageFooter page={2} /></section>}</div>
    <style jsx global>{`
      .subject-periodic-report{--subject-navy:${COLORS.navy};--subject-teal:${COLORS.teal};--subject-blue:${COLORS.blue};--subject-green:${COLORS.green};--subject-amber:${COLORS.amber};--subject-red:${COLORS.red};--subject-border:${COLORS.border};--subject-text:${COLORS.text};--report-navy:${COLORS.navy};--report-teal:${COLORS.teal};width:210mm;min-width:210mm;max-width:210mm;margin:0;padding:32px 0;background:#edf3f8;color:var(--subject-text);font-family:var(--font-cairo),"Cairo",Tahoma,Arial,sans-serif}
      .subject-periodic-page{position:relative;width:210mm;height:297mm;min-height:297mm;max-height:297mm;margin:0 auto 28px;box-sizing:border-box;background:#fff;padding:14mm 13mm 18mm;box-shadow:0 20px 55px rgba(31,63,91,.1);break-after:page;page-break-after:always;overflow:hidden}
      .subject-periodic-report .report-brand{display:grid;grid-template-columns:94px minmax(0,1fr) 145px;gap:22px;align-items:center;padding-bottom:14px;border-bottom:2px solid #e2ebf2;margin-bottom:20px;direction:ltr}.subject-periodic-report .report-brand__vision{display:flex;justify-content:flex-start;align-items:center}.subject-periodic-report .report-brand__vision img{width:88px;max-height:68px;object-fit:contain}.subject-periodic-report .report-brand__identity{display:flex;justify-content:flex-end;align-items:center}.subject-periodic-report .report-brand__ministry{max-height:58px;max-width:145px;object-fit:contain}.subject-periodic-report .report-brand__ministry-placeholder{font-size:19px;font-weight:800;color:var(--report-teal)}.subject-periodic-report .report-brand__school{display:flex;flex-direction:column;text-align:center;gap:2px;line-height:1.6;min-width:0}.subject-periodic-report .report-brand__school strong{color:var(--report-navy);font-size:19px;font-weight:900}.subject-periodic-report .report-brand__school span{font-size:13px;color:#536b80;font-weight:700}.subject-periodic-report .report-brand__school-logo,.subject-periodic-report .report-brand__school-mark{display:none}
      .subject-periodic-first-page{display:flex;flex-direction:column}.subject-periodic-title{text-align:center;margin:2px 0 14px}.subject-periodic-title>span{display:inline-block;border-radius:999px;background:#e8f7f5;color:var(--subject-teal);padding:6px 16px;font-size:12px;font-weight:900}.subject-periodic-title h1{margin:9px 0 2px;color:var(--subject-navy);font-size:28px;line-height:1.35;font-weight:950}.subject-periodic-title p{margin:0;color:#536b80;font-size:16px;font-weight:800}.subject-periodic-metadata{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--subject-border);border-radius:13px;overflow:hidden;background:#f5f9fc;margin-bottom:10px}.subject-periodic-metadata>div{padding:8px 7px;text-align:center;border-left:1px solid var(--subject-border);border-bottom:1px solid var(--subject-border)}.subject-periodic-metadata span{display:block;color:#536b80;font-size:9px;font-weight:900;margin-bottom:3px}.subject-periodic-metadata strong{display:block;color:var(--subject-navy);font-size:11px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.subject-periodic-section-title{display:flex;align-items:flex-start;gap:8px;margin:3px 0 9px;break-after:avoid;page-break-after:avoid}.subject-periodic-section-title__mark{width:4px;min-width:4px;height:31px;border-radius:999px;background:linear-gradient(180deg,var(--subject-blue),var(--subject-teal))}.subject-periodic-section-title h2{margin:0;color:var(--subject-navy);font-size:17px;font-weight:950}.subject-periodic-section-title p{margin:2px 0 0;color:#536b80;font-size:9px;font-weight:700}.subject-periodic-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:9px}.subject-periodic-metric{min-height:56px;border:1px solid var(--subject-border);border-radius:11px;padding:8px 6px;box-sizing:border-box;text-align:center;display:flex;flex-direction:column;justify-content:center;break-inside:avoid;page-break-inside:avoid}.subject-periodic-metric span{color:#40596e;font-size:9px;font-weight:900}.subject-periodic-metric strong{color:var(--subject-navy);font-size:17px;line-height:1.2;font-weight:950}.subject-periodic-metric small{color:#536b80;font-size:8px;font-weight:700}.subject-periodic-metric--blue{background:#f2f7fd}.subject-periodic-metric--green{background:#edf9f3;border-color:#c8e7d9}.subject-periodic-metric--green strong{color:var(--subject-green)}.subject-periodic-metric--amber{background:#fff8e8;border-color:#efdca9}.subject-periodic-metric--amber strong{color:#996600}.subject-periodic-metric--red{background:#fff0f0;border-color:#efc9c9}.subject-periodic-metric--red strong{color:var(--subject-red)}.subject-periodic-level-summary{margin-bottom:8px}.subject-periodic-level-summary .subject-periodic-section-title{margin-bottom:5px}.subject-periodic-level-table{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--subject-border);border-radius:10px;overflow:hidden;margin-bottom:8px}.subject-periodic-level-table>div{padding:7px 5px;text-align:center;border-left:1px solid var(--subject-border);background:#fff}.subject-periodic-level-table b{display:block;color:var(--subject-navy);font-size:10px;font-weight:950}.subject-periodic-level-table span{display:block;color:#40596e;font-size:14px;font-weight:950;margin-top:2px}.subject-periodic-level-table strong{display:block;color:var(--subject-teal);font-size:9px;font-weight:900}.subject-periodic-charts{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:auto}.subject-periodic-chart-card{min-height:143px;border:1px solid var(--subject-border);border-radius:13px;background:#fff;padding:9px 10px;box-sizing:border-box;break-inside:avoid;page-break-inside:avoid}.subject-periodic-chart-card h3{margin:0 0 5px;text-align:center;color:var(--subject-navy);font-size:11px;font-weight:950}.subject-periodic-donut-layout{display:grid;grid-template-columns:.95fr 1.05fr;align-items:center;gap:4px}.subject-periodic-donut svg{display:block;width:122px;max-width:100%;margin:auto}.subject-periodic-level-legend{display:flex;flex-direction:column;gap:4px}.subject-periodic-level-legend>div{display:grid;grid-template-columns:8px 1fr auto auto;align-items:center;gap:4px;font-size:9px}.subject-periodic-level-legend i{width:8px;height:8px;border-radius:50%}.subject-periodic-level-legend b{color:var(--subject-navy);font-weight:900}.subject-periodic-level-legend span,.subject-periodic-level-legend strong{color:#40596e;font-weight:800}.subject-periodic-bars{display:flex;flex-direction:column;justify-content:center;gap:9px;height:112px;padding:0 4px}.subject-periodic-bar-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px;color:#40596e;font-size:10px;font-weight:900}.subject-periodic-bar-head strong{color:var(--subject-navy)}.subject-periodic-bar-track{height:10px;border-radius:999px;background:#e8eff4;overflow:hidden}.subject-periodic-bar-value{height:100%;min-width:0;border-radius:inherit}.subject-periodic-flow-page{display:flex;flex-direction:column}.subject-periodic-flow-content{display:flex;min-height:0;flex:1;flex-direction:column;gap:9px}.subject-periodic-flow-block{break-inside:avoid;page-break-inside:avoid}.subject-periodic-measurement{position:fixed;top:0;left:-100000px;width:210mm;visibility:hidden;pointer-events:none;contain:layout style paint}.subject-periodic-measurement .subject-periodic-page{margin:0}.subject-periodic-measurement .subject-periodic-signatures{margin-top:0}.subject-periodic-reading{border:1px solid #c9dde8;border-right:5px solid var(--subject-teal);border-radius:13px;background:#f5fbfc;padding:12px 14px}.subject-periodic-reading h3{margin:0 0 6px;color:var(--subject-teal);font-size:14px;font-weight:950}.subject-periodic-reading p{margin:0;color:#304d63;font-size:11px;line-height:2;font-weight:700;white-space:pre-wrap}.subject-periodic-reading--final{background:#f7fafc;border-right-color:var(--subject-blue)}.subject-periodic-education-card{border:1px solid var(--subject-border);border-right:4px solid var(--subject-blue);border-radius:12px;background:#fff;padding:10px 12px;break-inside:avoid;page-break-inside:avoid}.subject-periodic-education-card--green{border-right-color:var(--subject-green);background:#f8fdfb}.subject-periodic-education-card--amber{border-right-color:var(--subject-amber);background:#fffdf7}.subject-periodic-education-card--red{border-right-color:var(--subject-red);background:#fffafa}.subject-periodic-education-card--blue{border-right-color:var(--subject-blue);background:#f8fbff}.subject-periodic-education-card h3{margin:0 0 7px;color:var(--subject-navy);font-size:13px;font-weight:950}.subject-periodic-detail{margin:4px 0;color:#304d63;font-size:10px;line-height:1.8;font-weight:700;white-space:pre-wrap}.subject-periodic-detail b,.subject-periodic-sublist>b{color:var(--subject-teal);font-weight:950}.subject-periodic-sublist{margin-top:6px}.subject-periodic-bullet-list{margin:4px 0 0;padding:0 17px 0 0;color:#304d63;font-size:10px;line-height:1.8;font-weight:700}.subject-periodic-empty{margin:0;color:#536b80;font-size:10px;font-weight:700}.subject-periodic-signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:30px;margin-top:auto;padding-top:22px;text-align:center;break-inside:avoid;page-break-inside:avoid}.subject-periodic-signatures .signature-box{min-height:105px}.subject-periodic-signatures .signature-image-area{height:52px}.subject-periodic-signatures .signature-image-area img{max-width:145px;max-height:50px}.subject-periodic-pending{display:grid;flex:1;place-items:center;color:#536b80;font-size:14px;font-weight:800}.subject-periodic-page-footer{position:absolute;bottom:8mm;left:13mm;right:13mm;border-top:1px solid #dce5eb;padding-top:7px;display:flex;justify-content:space-between;align-items:center;color:#536b80;font-size:10px;font-weight:700}.subject-periodic-page-footer strong{width:23px;height:23px;border-radius:50%;background:#edf3f7;color:var(--subject-navy);display:grid;place-items:center;font-size:10px;font-weight:950}
      .subject-periodic-report .signature-box{min-height:105px;border-top:1px dashed #91a8b8;padding-top:11px}.subject-periodic-report .signature-box>span{display:block;color:#40596e;font-size:12px;font-weight:900}.subject-periodic-report .signature-box strong{display:block;color:var(--report-navy);font-size:14px;font-weight:950}.subject-periodic-report .signature-image-area{height:52px;display:grid;place-items:center;margin:5px auto}.subject-periodic-report .signature-image-area img{max-width:145px;max-height:50px;object-fit:contain}.subject-periodic-report .signature-line{width:155px;border-bottom:1px solid #7992a3}
      .subject-periodic-flow-block--signatures{margin-top:auto}.subject-periodic-measurement .subject-periodic-flow-block--signatures{margin-top:0}
      @media print{@page{size:A4 portrait;margin:0}html,body{margin:0!important;padding:0!important;background:#fff!important}.subject-periodic-report{padding:0!important;background:#fff!important}.subject-periodic-pages{display:flex;flex-direction:column;gap:0}.subject-periodic-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;box-shadow:none!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important}.subject-periodic-flow-page{break-after:page!important;page-break-after:always!important}.subject-periodic-measurement{display:none!important}.subject-periodic-chart-card,.subject-periodic-metric,.subject-periodic-education-card,.subject-periodic-reading,.subject-periodic-signatures{break-inside:avoid;page-break-inside:avoid}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    `}</style>
  </div>;
}
