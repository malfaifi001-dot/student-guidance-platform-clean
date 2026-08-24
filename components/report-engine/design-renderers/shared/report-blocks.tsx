import { normalizeStructuredTableBlockPresentation } from "@/lib/report-engine/report-structured-table-display";
import { isStudentIdentityField } from "@/lib/workflow-values/structured-value-metadata";
import { getReportDesignImplementation } from "../report-design-implementations";
import type { ReportDesignId } from "../report-design-types";
import { collectFinalValues, getFinalFieldListItems } from "./final-report";
import { getValidPreviewEvidences } from "./report-evidence-data";
import { getDesignHeaderAlign, getDesignHeaderText, getDesignLogoSrc } from "./report-logo";
import type { PreviewCaseData } from "./report-types";
import { cleanWorkflowDynamicText, getWorkflowDynamicFieldCards, translateWorkflowDynamicValueItems } from "./report-workflow-fields";
import { getBlockShellClass, getPlacementClass } from "./report-block-presentation";
import { EvidenceBlock } from "./report-evidence";
import { BlockTitle, DesignFooter, MetaCard, MiniStat, SideMeta } from "./report-primitives";
import { getBlockSetting, getReportFontSizeClass, getReportFontSizeMultiplier, renderText, splitLines, splitParagraphs } from "./report-text";
import { DesignValueGrid } from "./report-values";
import { SignatureImage } from "@/components/signatures/signature-image";
import styles from "./a4-design-page.module.css";

export function A4DesignPage({
  designId,
  page,
  context,
  previewCase,
  pageLabel,
}: {
  designId: ReportDesignId;
  page?: any;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  pageLabel: string;
}) {
  const implementation = getReportDesignImplementation(designId);
  const PageComponent = implementation.Page;

  return (
    <div className={styles.presentation} data-a4-sheet-presentation="true">
      <PageComponent
        page={page}
        context={context}
        previewCase={previewCase}
        pageLabel={pageLabel}
        PageBlocks={PageBlocks}
        MetaCard={MetaCard}
        SideMeta={SideMeta}
        MiniStat={MiniStat}
        DesignFooter={DesignFooter}
        getDesignLogoSrc={getDesignLogoSrc}
        getDesignHeaderAlign={getDesignHeaderAlign}
        getDesignHeaderText={getDesignHeaderText}
        collectFinalValues={collectFinalValues}
        getValidPreviewEvidences={getValidPreviewEvidences}
      />
    </div>
  );
}

export function PageBlocks({
  page,
  context,
  previewCase,
  designId,
  className,
}: {
  page?: any;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  designId: ReportDesignId;
  className: string;
}) {
  const blocks = (page?.blocks || []).filter((block: any) => block.visible !== false);
  const flowBlocks = blocks.filter(
    (block: any) =>
      isSignatureGridDesignBlock(block) || (block.placement || "flow") === "flow",
  );
  const fixedBlocks = blocks.filter(
    (block: any) =>
      !isSignatureGridDesignBlock(block) && (block.placement || "flow") !== "flow",
  );

  return (
    <main className={`relative flex flex-col ${className}`}>
      <div className="flex min-h-[inherit] flex-1 flex-col gap-[var(--report-block-gap,1rem)]">
        {flowBlocks.map((block: any) => (
          <div
            key={block.id}
            data-report-smart-block={block.kind || "content"}
            data-report-smart-placement={block.placement || "flow"}
            data-report-smart-movable={
              block.kind === "evidence-gallery" ? "evidence" : "content"
            }
            data-report-priority-block={
              isSignatureGridDesignBlock(block) ? "signature" : undefined
            }
            className={
              isSignatureGridDesignBlock(block)
                ? "mt-auto break-inside-avoid pt-[var(--report-signature-top-gap,1.5rem)]"
                : ""
            }
            style={
              isSignatureGridDesignBlock(block)
                ? { breakInside: "avoid", pageBreakInside: "avoid" }
                : undefined
            }
          >
            <DesignBlock block={block} context={context} previewCase={previewCase} designId={designId} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {fixedBlocks.map((block: any) => (
          <div
            key={block.id}
            data-report-smart-block={block.kind || "fixed-content"}
            data-report-smart-placement={block.placement || "flow"}
            data-report-smart-fixed="true"
            className={getPlacementClass(block.placement || "flow")}
          >
            <div className="pointer-events-auto">
              <DesignBlock block={block} context={context} previewCase={previewCase} designId={designId} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}



function isDynamicFieldsDesignBlock(block: any) {
  const kind = String(block?.kind || "").trim();
  const smartKind = String(block?.settings?.smartBlockKind || "").trim();
  const title = String(block?.title || "").trim();

  return (
    kind === "dynamic-fields" ||
    kind === "field-list" ||
    kind === "case-meta" ||
    kind === "student-summary" ||
    kind === "service-summary" ||
    smartKind === "dynamic-fields" ||
    smartKind === "field-list" ||
    title.includes("حقول") ||
    title.includes("بيانات الحالة") ||
    Array.isArray(block?.dynamicFields)
  );
}
function getDynamicFieldCardsForBlock(block: any, previewCase: any) {
  const configuredItems = Array.isArray(block?.dynamicFields)
    ? block.dynamicFields
    : [];

  if (configuredItems.length) {
    return configuredItems
      .map((item: any, index: number) => {
        const id =
          cleanWorkflowDynamicText(item.id) ||
          cleanWorkflowDynamicText(item.key) ||
          `dynamic-field-${index + 1}`;
        const valueItems = Array.isArray(item.valueItems)
          ? translateWorkflowDynamicValueItems(item.valueItems)
          : translateWorkflowDynamicValueItems(item.value);

        return {
          id,
          key:
            cleanWorkflowDynamicText(item.key) ||
            id,
          label:
            item.label !== undefined
              ? cleanWorkflowDynamicText(item.label)
              : `حقل ${index + 1}`,
          value:
            item.value !== undefined
              ? cleanWorkflowDynamicText(item.value)
              : "",
          valueItems,
          visible: item.visible !== false,
        };
      })
      .filter((item: any) => item.visible && item.label)
      .filter(
        (item: any) =>
          !previewCase?.hasStudentDataTable || !isStudentIdentityField(item),
      );
  }

  return getWorkflowDynamicFieldCards(previewCase)
    .map((item: any, index: number) => {
      const id =
        cleanWorkflowDynamicText(item.key) ||
        cleanWorkflowDynamicText(item.label) ||
        `workflow-field-${index + 1}`;

      return {
        id,
        key: id,
        label: cleanWorkflowDynamicText(item.label),
        value: cleanWorkflowDynamicText(item.value),
        valueItems: Array.isArray(item.valueItems)
          ? item.valueItems.map((valueItem: unknown) => cleanWorkflowDynamicText(valueItem)).filter(Boolean)
          : [],
        visible: true,
      };
    })
    .filter((item: any) => item.visible && item.label && item.value)
    .filter(
      (item: any) =>
        !previewCase?.hasStudentDataTable || !isStudentIdentityField(item),
    );
}
function isSignatureGridDesignBlock(block: any) {
  const kind = String(block?.kind || "").trim();
  const smartKind = String(block?.settings?.smartBlockKind || "").trim();
  const title = String(block?.title || "").trim();

  return (
    kind === "signature-grid" ||
    kind === "signatures" ||
    kind === "approval-signatures" ||
    smartKind === "signature-grid" ||
    smartKind === "signatures" ||
    title.includes("توقيع") ||
    title.includes("اعتماد") ||
    Array.isArray(block?.signatures)
  );
}

function getDesignSignatureCards(block: any) {
  const signatures = Array.isArray(block?.signatures) ? block.signatures : [];

  return signatures
    .map((signature: any, index: number) => ({
      key: String(signature?.key || `signature-${index + 1}`),
      label: String(signature?.label || "التوقيع"),
      signerName: String(signature?.signerName || ""),
      signerTitle: String(signature?.signerTitle || ""),
      imageUrl: String(signature?.imageUrl || ""),
      required: Boolean(signature?.required),
    }))
    .filter((signature: any) => signature.label || signature.signerName || signature.imageUrl);
}
function DesignBlock({
  block,
  context,
  previewCase,
  designId,
}: {
  block: any;
  context: Record<string, string>;
  previewCase: PreviewCaseData | null;
  designId: ReportDesignId;
}) {
  if (block.hideWhenMissing && block.boundFieldKey) {
    const value = String(context[`field.${block.boundFieldKey}`] || "").trim();
    if (!value) return null;
  }

  const rendered = renderText(block.content || "", context);
  const textAlign = block.align === "center" ? "text-center" : "text-right";
  const implementation = getReportDesignImplementation(designId);
  const accent = implementation.palette;
  const BlockRenderer = implementation.BlockRenderer;

  if (BlockRenderer) {
    return (
      <BlockRenderer
        block={block}
        renderedContent={rendered}
        textAlign={textAlign}
        context={context}
        splitLines={splitLines}
        splitParagraphs={splitParagraphs}
      />
    );
  }

  if (block.kind === "hero-title") {
    return (
      <section className={getBlockShellClass(implementation, "hero", "text-center")}>
        {block.showServiceName !== false ? <p
          className={["text-sm font-black", accent.subtleTextClass].join(" ")}
          style={{
            fontSize: "calc(0.875rem * var(--report-content-font-scale, 1))",
            lineHeight: "var(--report-content-line-height, 1.75)",
          }}
        >
          {context["service.name"]}
        </p> : null}
        <h1
          className="mx-auto max-w-[145mm] font-black text-slate-950"
          style={{
            marginTop: "var(--report-heading-gap, 0.75rem)",
            fontSize: `calc(1.875rem * var(--report-content-font-scale, 1) * ${getReportFontSizeMultiplier(getBlockSetting(block, "titleFontSize"))})`,
            lineHeight: "var(--report-heading-line-height, 1.65)",
          }}
        >
          {rendered}
        </h1>
      </section>
    );
  }

  if (block.kind === "meta-strip") {
    return (
      <section className={getBlockShellClass(implementation, "soft", textAlign)}>
        <div
          className="grid md:grid-cols-2"
          style={{
            gap: "var(--report-value-grid-gap, 0.5rem)",
          }}
        >
          {splitLines(rendered).map((line) => (
            <div
              key={line}
              className="rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-700"
              style={{
                paddingInline: "calc(1rem * var(--report-field-spacing-scale, 1))",
                paddingBlock: "calc(0.75rem * var(--report-field-spacing-scale, 1))",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "bullet-list") {
    const customBulletList = implementation.renderBulletList?.({
      block,
      renderedContent: rendered,
      textAlign,
      context,
      splitLines,
      splitParagraphs,
    });

    if (customBulletList !== undefined) return customBulletList;

    const contentFontSizeClass = getReportFontSizeClass(
      getBlockSetting(block, "contentFontSize"),
      "text-sm",
    );

    return (
      <section className={getBlockShellClass(implementation, block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
        <ul
          style={{
            display: "grid",
            gap: "var(--report-bullet-gap, 0.5rem)",
          }}
        >
          {splitLines(rendered).map((line) => (
            <li
              key={line}
              className={["flex text-slate-700", contentFontSizeClass].join(" ")}
              style={{
                gap: "var(--report-field-gap, 0.5rem)",
                lineHeight: "var(--report-bullet-line-height, 1.75)",
                fontSize: "calc(0.875rem * var(--report-bullet-font-scale, 1))",
              }}
            >
              <span className={["mt-2 h-2 w-2 shrink-0 rounded-full", accent.dotClass].join(" ")} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (block.kind === "multi-paragraph") {
    const customNarrative = implementation.renderNarrative?.({
      block,
      renderedContent: rendered,
      textAlign,
      context,
      splitLines,
      splitParagraphs,
    });

    if (customNarrative !== undefined) return customNarrative;

    return (
      <section className={getBlockShellClass(implementation, block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
        <div
          style={{
            display: "grid",
            gap: "var(--report-paragraph-gap, 0.75rem)",
          }}
        >
          {splitParagraphs(rendered).map((paragraph) => (
            <p
              key={paragraph}
              className={["text-slate-700", getReportFontSizeClass(getBlockSetting(block, "contentFontSize"), "text-base")].join(" ")}
              style={{
                margin: 0,
                lineHeight: "var(--report-narrative-line-height, 2)",
                fontSize: `calc(1rem * var(--report-content-font-scale, 1) * ${getReportFontSizeMultiplier(getBlockSetting(block, "contentFontSize"))})`,
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    );
  }
  if (block.kind === "report-one-table" || block.kind === "structured-table") {
    const tableBlock = block.kind === "structured-table"
      ? normalizeStructuredTableBlockPresentation(block)
      : block;
    const columns = tableBlock.kind === "structured-table"
      ? (Array.isArray(tableBlock.columns) ? tableBlock.columns : [])
      : Array.isArray(tableBlock.columns) && tableBlock.columns.length
        ? tableBlock.columns
        : ["المجال", "الإجراء", "ملاحظات"];

    const rows = tableBlock.kind === "structured-table"
      ? (Array.isArray(tableBlock.rows) ? tableBlock.rows : [])
      : Array.isArray(tableBlock.rows) && tableBlock.rows.length
        ? tableBlock.rows
        : [["", "", ""]];

    const tableSettings = tableBlock.tableSettings || {};
    const compact = Boolean(tableSettings.compact);
    const rounded = tableSettings.rounded !== false;
    const highlightHeader = tableSettings.highlightHeader !== false;
    const highlightFirstColumn = Boolean(tableSettings.highlightFirstColumn);
    const stripedRows = Boolean(tableSettings.stripedRows);
    const colorTheme = tableSettings.colorTheme || "light-gray";
    const columnWidths = Array.isArray(tableBlock.columnWidths) ? tableBlock.columnWidths : [];
    const cellImages = Array.isArray((tableBlock as any).cellImages)
      ? (tableBlock as any).cellImages
      : [];

    const themeColors: Record<string, { border: string; headerBg: string; firstColBg: string; stripedBg: string; headerText: string; cellText: string; firstColText: string }> = {
      "light-gray": { border: "border-slate-200", headerBg: "bg-slate-50", firstColBg: "bg-slate-50", stripedBg: "bg-slate-50/40", headerText: "text-slate-800", cellText: "text-slate-600", firstColText: "text-slate-900" },
      "soft-blue": { border: "border-sky-200", headerBg: "bg-sky-50", firstColBg: "bg-sky-50", stripedBg: "bg-sky-50/40", headerText: "text-sky-900", cellText: "text-slate-700", firstColText: "text-sky-900" },
      "green": { border: "border-emerald-200", headerBg: "bg-emerald-50", firstColBg: "bg-emerald-50", stripedBg: "bg-emerald-50/40", headerText: "text-emerald-900", cellText: "text-slate-700", firstColText: "text-emerald-900" },
      "none": { border: "border-slate-200", headerBg: "bg-white", firstColBg: "bg-white", stripedBg: "bg-white", headerText: "text-slate-800", cellText: "text-slate-600", firstColText: "text-slate-900" },
    };
    const tc = themeColors[colorTheme] || themeColors["light-gray"];
    return (
      <section
        dir="rtl"
        data-report-structured-table={tableBlock.kind === "structured-table" ? tableBlock.sourceTableId || "true" : undefined}
        className={
          tableBlock.kind === "structured-table"
            ? `mb-3 mt-5 break-inside-avoid ${textAlign}`
            : getBlockShellClass(implementation, tableBlock.variant, textAlign)
        }
        style={{ breakInside: "avoid" }}
      >
        {tableBlock.showTitle ? <BlockTitle title={tableBlock.title} fontSize={getBlockSetting(tableBlock, "titleFontSize")} /> : null}

        <div className={rounded ? `overflow-hidden rounded-2xl border ${tc.border}` : `overflow-hidden border ${tc.border}`}>
          <table className="w-full table-fixed border-collapse text-xs">
            <thead
              className={highlightHeader ? tc.headerBg : "bg-white"}
              style={{ display: tableSettings.repeatHeader === false ? undefined : "table-header-group" }}
            >
              <tr>
                {columns.map((column: string, columnIndex: number) => (
                  <th
                    key={`${column}-${columnIndex}`}
                    className={[
                      `border ${tc.border} text-center font-black ${tc.headerText}`,
                    ].join(" ")}
                    style={{
                      ...(Number(columnWidths[columnIndex]) > 0
                        ? { width: `${Number(columnWidths[columnIndex])}%` }
                        : {}),
                      paddingInline: `calc(var(--report-table-padding-x, 0.75rem) * ${compact ? 0.78 : 1})`,
                      paddingBlock: `calc(var(--report-table-header-padding-y, 0.75rem) * ${compact ? 0.72 : 1})`,
                      fontSize: "calc(0.75rem * var(--report-table-font-scale, 1))",
                      lineHeight: "calc(1.25rem * var(--report-narrative-density-scale, 1))",
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row: string[], rowIndex: number) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={stripedRows && rowIndex % 2 === 1 ? tc.stripedBg : "bg-white"}
                  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                >
                  {columns.map((_: string, columnIndex: number) => (
                    <td
                      key={`cell-${rowIndex}-${columnIndex}`}
                      className={[
                        `break-words whitespace-pre-wrap border ${tc.border} text-center font-bold ${tc.cellText}`,
                        highlightFirstColumn && columnIndex === 0
                          ? `${tc.firstColBg} font-black ${tc.firstColText}`
                          : "",
                      ].join(" ")}
                      style={{
                        paddingInline: `calc(var(--report-table-padding-x, 0.75rem) * ${compact ? 0.78 : 1})`,
                        paddingBlock: `calc(var(--report-table-padding-y, 0.75rem) * ${compact ? 0.72 : 1})`,
                        fontSize: "calc(0.75rem * var(--report-table-font-scale, 1))",
                        lineHeight: "calc(1.5rem * var(--report-narrative-density-scale, 1))",
                      }}
                    >
                      {cellImages[rowIndex]?.[columnIndex] ? (
                        <SignatureImage
                          src={String(cellImages[rowIndex][columnIndex])}
                          alt="توقيع المشرف"
                          className="mx-auto"
                          maxHeight="12mm"
                          style={{ maxHeight: "12mm", filter: "contrast(1.25) brightness(0.72)" }}
                        />
                      ) : (
                        String(row?.[columnIndex] || "—")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (isDynamicFieldsDesignBlock(block)) {
    const dynamicFieldItems = getDynamicFieldCardsForBlock(block, previewCase);

    if (
      !dynamicFieldItems.length &&
      (previewCase?.hasStudentDataTable ||
        previewCase?.serviceSlug === "activity-programs-school-broadcast")
    ) {
      return null;
    }

    return (
      <section
        className={getBlockShellClass(implementation, block.variant, textAlign)}
        data-report-dynamic-fields
      >
        {block.showTitle ? (
          <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} />
        ) : null}

        {dynamicFieldItems.length ? (
          <DesignValueGrid
            implementation={implementation}
            block={block}
            items={dynamicFieldItems.map(({ id, label, value, valueItems }: any) => ({
              key: id,
              label,
              value: Array.isArray(valueItems) && valueItems.length ? valueItems : value,
              valueItems,
            }))}
          />
        ) : (
          <p
            className="rounded-2xl bg-slate-50 text-sm font-bold text-slate-500"
            style={{
              paddingInline: "calc(1rem * var(--report-field-spacing-scale, 1))",
              paddingBlock: "calc(0.75rem * var(--report-field-spacing-scale, 1))",
              fontSize: "calc(0.875rem * var(--report-field-value-scale, 1))",
            }}
          >
            لا توجد حقول ظاهرة داخل هذا البلوك.
          </p>
        )}
      </section>
    );
  }
  if (block.kind === "field-list") {
    const values = getFinalFieldListItems(block, previewCase);

    return (
      <section className={getBlockShellClass(implementation, block.variant, textAlign)}>
        {block.showTitle ? (
          <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} />
        ) : null}

        {values.length ? (
          <DesignValueGrid
            implementation={implementation}
            block={block}
            items={values.map((item: any) => ({
              key: item.key || item.label || item.fieldKey || item.fieldLabel,
                label: item.label || item.fieldLabel || "تفصيل",
              value: Array.isArray(item.valueItems) && item.valueItems.length
                ? item.valueItems
                : item.value || "غير متوفر",
              valueItems: item.valueItems,
            }))}
          />
        ) : (
          <p
            className="rounded-2xl bg-slate-50 text-sm font-bold text-slate-500"
            style={{
              paddingInline: "calc(1rem * var(--report-field-spacing-scale, 1))",
              paddingBlock: "calc(0.75rem * var(--report-field-spacing-scale, 1))",
              fontSize: "calc(0.875rem * var(--report-field-value-scale, 1))",
            }}
          >
            لا توجد قيم مرتبطة بهذا البلوك.
          </p>
        )}
      </section>
    );
  }
  if (isSignatureGridDesignBlock(block)) {
    const signatures = getDesignSignatureCards(block);

    if (!signatures.length) return null;

    const SignatureRenderer = implementation.SignatureRenderer;
    if (SignatureRenderer) {
      return (
        <SignatureRenderer
          block={block}
          items={signatures}
          renderTitle={() => block.showTitle ? <BlockTitle title={block.title || "تواقيع الاعتماد"} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
        />
      );
    }

    return (
      <section
        data-report-design-signature-block
        className="report-design-signature-grid-block break-inside-avoid"
        style={{
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        {block.showTitle ? <BlockTitle title={block.title || "تواقيع الاعتماد"} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}

        <div
          className={[
            signatures.length === 2
              ? "mx-auto grid w-[72%] max-w-[132mm] grid-cols-2 items-end gap-x-[8mm]"
              : "flex w-full items-end gap-6",
            signatures.length === 1
              ? "justify-center"
              : signatures.length >= 3
                ? "justify-between"
                : "",
          ].join(" ")}
        >
          {signatures.map((signature: any) => (
            <div
              key={signature.key}
              className={[
                "text-center",
                signatures.length >= 3
                  ? "w-[31%]"
                  : signatures.length === 2
                    ? "min-w-0 w-full"
                    : "w-[58mm]",
              ].join(" ")}
            >
              <div
                className="report-design-signature-image-frame flex items-end justify-center rounded-md bg-white"
                style={{ height: "var(--report-signature-image-height, 10mm)" }}
              >
                {signature.imageUrl ? (
                  <SignatureImage
                    src={signature.imageUrl}
                    alt={signature.label}
                    className="report-design-signature-image max-w-[42mm]"
                    style={{
                      maxHeight: "var(--report-signature-image-height, 10mm)",
                      background: "#ffffff",
                    }}
                  />
                ) : (
                  <div className="mb-1 w-full border-b border-dashed border-slate-400" />
                )}
              </div>

              <div
                className="report-design-signature-name font-black text-slate-950"
                style={{
                  marginTop: "var(--report-field-value-top-gap, 0.25rem)",
                  fontSize: "12px",
                  lineHeight: "1.25",
                }}
              >
                {signature.signerName || "—"}
              </div>

              {signature.signerTitle ? (
                <div
                  className="report-design-signature-role font-bold text-slate-500"
                  style={{
                    marginTop: "var(--report-field-value-top-gap, 0.125rem)",
                    fontSize: "10px",
                    lineHeight: "1.25",
                  }}
                >
                  {signature.signerTitle}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (block.kind === "evidence-gallery") {
    return <EvidenceBlock block={block} previewCase={previewCase} implementation={implementation} textAlign={textAlign} />;
  }

  if (block.kind === "closing-note") {
    return (
      <section className={getBlockShellClass(implementation, block.variant, textAlign)}>
        {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
        <p
          className={["text-slate-700", getReportFontSizeClass(getBlockSetting(block, "contentFontSize"), "text-base")].join(" ")}
          style={{
            margin: 0,
            fontSize: `calc(1rem * var(--report-content-font-scale, 1) * ${getReportFontSizeMultiplier(getBlockSetting(block, "contentFontSize"))})`,
            lineHeight: "var(--report-narrative-line-height, 2)",
          }}
        >
          {rendered}
        </p>
      </section>
    );
  }

  return (
    <section className={getBlockShellClass(implementation, block.variant, textAlign)}>
      {block.showTitle ? <BlockTitle title={block.title} fontSize={getBlockSetting(block, "titleFontSize")} /> : null}
      <p
        className={["whitespace-pre-line text-slate-700", getReportFontSizeClass(getBlockSetting(block, "contentFontSize"), "text-lg")].join(" ")}
        style={{
          margin: 0,
          fontSize: `calc(1.125rem * var(--report-content-font-scale, 1) * ${getReportFontSizeMultiplier(getBlockSetting(block, "contentFontSize"))})`,
          lineHeight: "var(--report-narrative-line-height, 2)",
        }}
      >
        {rendered}
      </p>
    </section>
  );
}

function DesignFieldValueBlock({
  title,
  showTitle,
  variant,
  textAlign,
  designId,
  items,
}: {
  title: string;
  showTitle?: boolean;
  variant: string;
  textAlign: string;
  designId: ReportDesignId;
  items: Array<{
    key?: string;
    label: string;
    value?: string | null;
  }>;
}) {
  const visibleItems = items.filter((item) => String(item.value || "").trim());
  const implementation = getReportDesignImplementation(designId);

  return (
    <section className={getBlockShellClass(implementation, variant, textAlign)}>
      {showTitle ? <BlockTitle title={title} /> : null}

      {visibleItems.length ? (
        <DesignValueGrid implementation={implementation} items={visibleItems} />
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
          لا توجد قيم مرتبطة بهذا البلوك.
        </p>
      )}
    </section>
  );
}
