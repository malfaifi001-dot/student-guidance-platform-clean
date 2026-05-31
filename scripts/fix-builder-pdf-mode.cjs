const fs = require("fs");

function replaceRequired(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`لم أجد النص المطلوب: ${label}`);
  }

  return content.replace(search, replacement);
}

/* =========================================================
   1) components/report-engine/report-template-live-preview.tsx
========================================================= */

const livePreviewPath = "components/report-engine/report-template-live-preview.tsx";
let live = fs.readFileSync(livePreviewPath, "utf8");

live = replaceRequired(
  live,
`type ReportTemplateLivePreviewProps = {
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
};`,
`type ReportTemplateLivePreviewProps = {
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
};`,
  "add pdfMode prop type"
);

live = replaceRequired(
  live,
`export function ReportTemplateLivePreview({
  template,
  snippets,
  previewCaseData,
}: ReportTemplateLivePreviewProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">`,
`export function ReportTemplateLivePreview({
  template,
  snippets,
  previewCaseData,
  pdfMode = false,
}: ReportTemplateLivePreviewProps) {
  return (
    <section
      className={
        pdfMode
          ? "bg-white p-0"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      {!pdfMode ? (
        <div className="flex flex-wrap items-start justify-between gap-4">`,
  "wrap preview header with pdfMode"
);

live = replaceRequired(
  live,
`        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
          {previewCaseData ? "Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…Ù† Case Ø­Ù‚ÙŠÙ‚ÙŠ" : "Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¨Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ©"}
        </div>
      </div>

      <div className="mt-5 space-y-6">`,
`        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600">
          {previewCaseData ? "Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…Ù† Case Ø­Ù‚ÙŠÙ‚ÙŠ" : "Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¨Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ©"}
        </div>
      </div>
      ) : null}

      <div className={pdfMode ? "space-y-0" : "mt-5 space-y-6"}>`,
  "hide preview header in pdf"
);

live = replaceRequired(
  live,
`            className="mx-auto min-h-[720px] max-w-[820px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm"`,
`            className={
              pdfMode
                ? "mx-auto h-[297mm] min-h-[297mm] w-[210mm] max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none print:break-after-page"
                : "mx-auto min-h-[720px] max-w-[820px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm"
            }`,
  "make article A4 in pdf"
);

live = replaceRequired(
  live,
`            <div className="border-b border-slate-200 bg-white px-6 py-4">`,
`            <div className={pdfMode ? "hidden" : "border-b border-slate-200 bg-white px-6 py-4"}>`,
  "hide page chrome in pdf"
);

live = replaceRequired(
  live,
`              className={[
                "min-h-[640px] bg-white p-8",
                page.kind === "cover" ? "flex flex-col justify-between" : "",
              ].join(" ")}`,
`              className={[
                pdfMode
                  ? "min-h-[297mm] bg-white p-[16mm]"
                  : "min-h-[640px] bg-white p-8",
                page.kind === "cover" ? "flex flex-col justify-between" : "",
              ].join(" ")}`,
  "make page body A4 padding"
);

live = replaceRequired(
  live,
`    <footer className="border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">`,
`    <footer className="no-print border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">`,
  "hide cover metadata footer in pdf"
);

fs.writeFileSync(livePreviewPath, live, "utf8");

/* =========================================================
   2) app/dashboard/reports/[reportId]/preview/page.tsx
========================================================= */

const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

preview = replaceRequired(
  preview,
`    studio?: string;
    view?: string;
    v?: string;`,
`    studio?: string;
    view?: string;
    pdf?: string;
    v?: string;`,
  "add pdf search param"
);

preview = replaceRequired(
  preview,
`  const studioMode = resolvedSearchParams.studio === "true";
  const showCover = resolvedSearchParams.cover !== "false";`,
`  const studioMode = resolvedSearchParams.studio === "true";
  const pdfMode = resolvedSearchParams.pdf === "true";
  const showCover = resolvedSearchParams.cover !== "false";`,
  "read pdfMode"
);

preview = replaceRequired(
  preview,
`      className={
        studioMode
          ? "min-h-screen bg-slate-100 py-5"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#f8fafc_34%,_#f1f5f9_100%)] px-6 py-6"
      }`,
`      className={
        pdfMode
          ? "min-h-screen bg-white p-0"
          : studioMode
            ? "min-h-screen bg-slate-100 py-5"
            : "min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0,_#f8fafc_34%,_#f1f5f9_100%)] px-6 py-6"
      }`,
  "clean main in pdf"
);

preview = replaceRequired(
  preview,
`      <section className={studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`,
`      <section className={pdfMode ? "mx-auto bg-white" : studioMode ? "mx-auto" : "mx-auto max-w-[260mm]"}>`,
  "clean wrapper in pdf"
);

preview = replaceRequired(
  preview,
`            previewCaseData={builderPreviewCaseData as any}
          />`,
`            previewCaseData={builderPreviewCaseData as any}
            pdfMode={pdfMode}
          />`,
  "pass pdfMode to live preview"
);

fs.writeFileSync(previewPath, preview, "utf8");

console.log("تم تفعيل PDF mode نظيف داخل ReportTemplateLivePreview وصفحة المعاينة.");
