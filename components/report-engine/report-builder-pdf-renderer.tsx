import type { CSSProperties, ReactNode } from "react";
import type {
  ReportTemplateBlock,
  ReportTemplateBuilderModel,
} from "@/lib/report-engine/report-template-builder-types";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";
import type { ReportIdentity } from "@/lib/report-engine/report-types";

type EvidenceLayoutMode =
  | "auto"
  | "one-per-page"
  | "two-per-page"
  | "grid-2x2"
  | "compact";

type RenderReportPage = ReportTemplateBuilderModel["pages"][number] & {
  evidenceChunk?: RuntimeEvidenceItem[];
  evidencePageNumber?: number;
  evidenceTotalPages?: number;
};

type ReportBuilderPdfRendererProps = {
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
  identity: ReportIdentity;
  editorialBlocks?: Record<string, string>;
  evidenceLayoutMode?: EvidenceLayoutMode;
};

type RuntimeValueItem = {
  fieldKey?: string | null;
  fieldLabel?: string | null;
  value?: string | null;
};

type RuntimeEvidenceItem = {
  id?: string | null;
  title?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  description?: string | null;
  note?: string | null;
};

export function ReportBuilderPdfRenderer({
  template,
  previewCaseData,
  identity,
  editorialBlocks = {},
  evidenceLayoutMode = "two-per-page",
}: ReportBuilderPdfRendererProps) {
  const basePages: RenderReportPage[] = template.pages.length
    ? (template.pages as RenderReportPage[])
    : [
        {
          id: "fallback-cover",
          title: "غلاف التقرير",
          description: "",
          kind: "cover",
          blocks: [],
        } as RenderReportPage,
      ];

  const allEvidences = getRuntimeEvidences(previewCaseData);

  const pages: RenderReportPage[] = basePages.flatMap((page) => {
    if (page.kind !== "evidence") {
      return [page];
    }

    const chunks = chunkEvidencesForLayout(allEvidences, evidenceLayoutMode);

    if (!chunks.length) {
      return [
        {
          ...page,
          evidenceChunk: [],
          evidencePageNumber: 1,
          evidenceTotalPages: 1,
        },
      ];
    }

    return chunks.map((chunk, index) => ({
      ...page,
      id: `${page.id}-evidence-${index + 1}`,
      title:
        chunks.length > 1
          ? `${page.title || "الشواهد والمرفقات"} - صفحة ${index + 1}`
          : page.title,
      evidenceChunk: chunk,
      evidencePageNumber: index + 1,
      evidenceTotalPages: chunks.length,
    }));
  });

  return (
    <section className="space-y-4 bg-transparent print:space-y-0" dir="rtl">
      {pages.map((page, index) => {
        const pageStyle: CSSProperties = {
          width: "210mm",
          height: "297mm",
          minHeight: "297mm",
          maxHeight: "297mm",
          overflow: "hidden",
          breakAfter: index < pages.length - 1 ? "page" : "auto",
          pageBreakAfter: index < pages.length - 1 ? "always" : "auto",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        };

        return (
          <article
            key={page.id}
            className="pdf-report-page mx-auto rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm print:rounded-none print:border-0 print:shadow-none"
            style={pageStyle}
          >
            {page.kind === "cover" ? (
              <OfficialCoverPage
                template={template}
                identity={identity}
                previewCaseData={previewCaseData}
              />
            ) : page.kind === "evidence" ? (
              <OfficialEvidencePage
                pageTitle={page.title}
                evidences={page.evidenceChunk || []}
                evidenceLayoutMode={evidenceLayoutMode}
                pageNumber={page.evidencePageNumber || 1}
                totalPages={page.evidenceTotalPages || 1}
              />
            ) : page.kind === "approval" ? (
              <OfficialApprovalPage identity={identity} />
            ) : (
              <OfficialContentPage
                pageTitle={page.title}
                blocks={page.blocks}
                template={template}
                previewCaseData={previewCaseData}
                editorialBlocks={editorialBlocks}
              />
            )}
          </article>
        );
      })}
    </section>
  );
}

function OfficialPageFrame({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col p-[16mm]">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-xs font-bold text-slate-500">
          {eyebrow || "تقرير إرشادي"}
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{title}</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden pt-6">{children}</main>

      <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
        تم إنشاء التقرير من منصة التوجيه الطلابي
      </footer>
    </div>
  );
}

function OfficialCoverPage({
  template,
  identity,
  previewCaseData,
}: {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentity;
  previewCaseData: RuntimePreviewCaseData | null;
}) {
  return (
    <div className="flex h-full flex-col justify-between p-[18mm] text-center">
      <div>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-300 text-xs font-black text-slate-500">
          شعار
        </div>

        <div className="mt-6 space-y-1 text-sm font-bold text-slate-700">
          <p>{identity.ministryName || "وزارة التعليم"}</p>
          <p>{identity.educationDepartment || "إدارة التعليم"}</p>
          <p>{identity.schoolName || "اسم المدرسة"}</p>
        </div>
      </div>

      <div className="mx-auto max-w-[150mm]">
        <p className="text-sm font-black text-emerald-700">
          {getServiceName(template, previewCaseData)}
        </p>

        <h1 className="mt-5 text-4xl font-black leading-[1.7] text-slate-950">
          {template.name || getCaseTitle(previewCaseData)}
        </h1>

        <p className="mx-auto mt-6 max-h-24 overflow-hidden text-base leading-8 text-slate-600">
          {template.description ||
            "تقرير رسمي مبني على بيانات الحالة والشواهد المرتبطة بها."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-6 text-right text-sm">
        <InfoLine label="العام الدراسي" value={identity.academicYear || "العام الدراسي"} />
        <InfoLine label="الفصل الدراسي" value={identity.semester || "الفصل الدراسي"} />
        <InfoLine label="الموجه/الموجهة" value={identity.counselorName || "الموجه/الموجهة الطلابية"} />
        <InfoLine label="نوع التقرير" value="تقرير إرشادي رسمي" />
      </div>
    </div>
  );
}

function OfficialContentPage({
  pageTitle,
  blocks,
  template,
  previewCaseData,
  editorialBlocks = {},
}: {
  pageTitle: string;
  blocks: ReportTemplateBlock[];
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
  editorialBlocks?: Record<string, string>;
}) {
  const printableBlocks = blocks.filter(
    (block) =>
      block.kind !== "service-summary" &&
      block.kind !== "cover-title" &&
      block.kind !== "approval-signature" &&
      block.kind !== "evidence-gallery"
  );

  const editorialSections = getEditorialSectionsForPage(pageTitle, editorialBlocks);

  return (
    <OfficialPageFrame title={pageTitle} eyebrow={getServiceName(template, previewCaseData)}>
      <div className="space-y-5">
        {editorialSections.map((section) => (
          <OfficialSection key={section.key} title={section.title}>
            <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
              {section.content}
            </p>
          </OfficialSection>
        ))}

        {printableBlocks.length ? (
          printableBlocks.map((block) => (
            <OfficialBlock
              key={block.id}
              block={block}
              template={template}
              previewCaseData={previewCaseData}
            />
          ))
        ) : (
          <OfficialBlock
            block={{
              id: "case-meta-fallback",
              kind: "case-meta",
              title: "بيانات التقرير",
              settings: {},
            } as ReportTemplateBlock}
            template={template}
            previewCaseData={previewCaseData}
          />
        )}
      </div>
    </OfficialPageFrame>
  );
}

function getEditorialSectionsForPage(
  pageTitle: string,
  editorialBlocks: Record<string, string>
) {
  const normalizedTitle = pageTitle || "";

  const sections: Array<{
    key: string;
    title: string;
    content: string;
  }> = [];

  function add(key: string, title: string) {
    const content = editorialBlocks[key]?.trim();

    if (content) {
      sections.push({
        key,
        title,
        content,
      });
    }
  }

  if (
    normalizedTitle.includes("ملخص") ||
    normalizedTitle.includes("محتوى") ||
    normalizedTitle.includes("تقرير")
  ) {
    add("intro", "مقدمة التقرير");
    add("goals", "الأهداف");
    add("procedures", "الإجراءات");
  }

  if (
    normalizedTitle.includes("نتائج") ||
    normalizedTitle.includes("ملخص") ||
    normalizedTitle.includes("محتوى")
  ) {
    add("results", "النتائج");
    add("recommendations", "التوصيات");
    add("closingNotes", "ملاحظات ختامية");
  }

  return sections;
}

function OfficialBlock({
  block,
  template,
  previewCaseData,
}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
}) {
  if (block.kind === "identity-header") {
    return (
      <OfficialSection title={block.title || "هوية المدرسة"}>
        <div className="grid grid-cols-3 gap-3">
          <InfoBox label="الجهة" value="وزارة التعليم" />
          <InfoBox label="المدرسة" value="اسم المدرسة" />
          <InfoBox label="العام الدراسي" value="1447هـ" />
        </div>
      </OfficialSection>
    );
  }

  if (block.kind === "case-meta") {
    return (
      <OfficialSection title={block.title || "بيانات التقرير"}>
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="عنوان الحالة" value={getCaseTitle(previewCaseData)} />
          <InfoBox label="الخدمة" value={getServiceName(template, previewCaseData)} />
          <InfoBox label="عدد القيم" value={`${getRuntimeValues(previewCaseData).length}`} />
          <InfoBox label="عدد الشواهد" value={`${getRuntimeEvidences(previewCaseData).length}`} />
        </div>
      </OfficialSection>
    );
  }

  if (block.kind === "student-summary") {
    const student = getStudent(previewCaseData);

    return (
      <OfficialSection title={block.title || "بيانات الطالب/الطالبة"}>
        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="الاسم" value={student.fullName || "غير محدد"} />
          <InfoBox label="رقم الهوية" value={student.nationalId || "غير متوفر"} />
          <InfoBox label="المرحلة" value={student.stage || "غير محدد"} />
          <InfoBox label="الصف والفصل" value={[student.grade, student.classroom].filter(Boolean).join(" - ") || "غير محدد"} />
          <InfoBox label="ولي الأمر" value={student.guardianName || "غير متوفر"} />
          <InfoBox label="جوال ولي الأمر" value={student.guardianPhone || "غير متوفر"} />
        </div>
      </OfficialSection>
    );
  }

  if (block.kind === "field-list") {
    const values = getRuntimeValues(previewCaseData);

    return (
      <OfficialSection title={block.title || "بيانات الحالة"}>
        <div className="grid grid-cols-2 gap-3">
          {values.slice(0, 10).map((item, index) => (
            <InfoBox
              key={`${item.fieldKey || item.fieldLabel || index}`}
              label={item.fieldLabel || item.fieldKey || `قيمة ${index + 1}`}
              value={item.value || "—"}
            />
          ))}
        </div>
      </OfficialSection>
    );
  }

  if (block.kind === "custom-paragraph") {
    return (
      <OfficialSection title={block.customTitle || block.title || "نص التقرير"}>
        <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
          {block.customContent || "لم يتم إدخال محتوى مخصص بعد."}
        </p>
      </OfficialSection>
    );
  }

  if (block.kind === "paragraph") {
    return (
      <OfficialSection title={block.title || "نص التقرير"}>
        <p className="text-sm leading-8 text-slate-700">
          يتم عرض هذا القسم ضمن التقرير الرسمي بناءً على إعدادات القالب وبيانات الحالة.
        </p>
      </OfficialSection>
    );
  }

  if (block.kind === "text-library") {
    return (
      <OfficialSection title={block.title || "نص جاهز من المكتبة"}>
        <p className="text-sm leading-8 text-slate-700">
          سيتم ربط هذا القسم لاحقًا بمكتبة النصوص الرسمية حسب الخدمة والقالب.
        </p>
      </OfficialSection>
    );
  }

  return null;
}

function OfficialEvidencePage({
  pageTitle,
  evidences,
  evidenceLayoutMode,
  pageNumber,
  totalPages,
}: {
  pageTitle: string;
  evidences: RuntimeEvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  pageNumber: number;
  totalPages: number;
}) {
  const layout = getEvidenceLayoutClasses(evidenceLayoutMode);

  return (
    <OfficialPageFrame
      title={pageTitle || "الشواهد والمرفقات"}
      eyebrow={totalPages > 1 ? `الشواهد - صفحة ${pageNumber} من ${totalPages}` : "الشواهد"}
    >
      {evidences.length ? (
        <div className={layout.gridClassName}>
          {evidences.map((evidence, index) => {
            const imageUrl = evidence.imageUrl || evidence.fileUrl || "";
            const title =
              evidence.title ||
              evidence.caption ||
              evidence.fileName ||
              `شاهد ${index + 1}`;

            return (
              <article
                key={evidence.id || `${evidence.fileName}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-300 bg-white"
              >
                <div className={layout.imageBoxClassName}>
                  {isImageEvidence(evidence) && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="px-4 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-xl">
                        📎
                      </div>

                      <span className="mt-3 block text-xs font-black text-slate-500">
                        {evidence.fileName || "مرفق"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 p-3">
                  <p className="line-clamp-2 text-xs font-black leading-6 text-slate-800">
                    {title}
                  </p>

                  {evidence.description || evidence.note ? (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                      {evidence.description || evidence.note}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          لا توجد شواهد مرتبطة بهذا التقرير.
        </div>
      )}
    </OfficialPageFrame>
  );
}

function OfficialApprovalPage({ identity }: { identity: ReportIdentity }) {
  return (
    <OfficialPageFrame title="الاعتماد والتوقيع" eyebrow="اعتماد التقرير">
      <div className="mt-16 grid grid-cols-2 gap-8">
        <SignatureBox
          title="الموجه/الموجهة الطلابية"
          name={identity.counselorName || "الموجه/الموجهة الطلابية"}
        />
        <SignatureBox
          title="قائد/قائدة المدرسة"
          name="قائد/قائدة المدرسة"
        />
      </div>
    </OfficialPageFrame>
  );
}

function OfficialSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-300 bg-white p-4">
      <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-black text-slate-950">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black leading-7 text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value || "—"}</p>
    </div>
  );
}

function SignatureBox({ title, name }: { title: string; name: string }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{title}</p>
      <p className="mt-4 text-base font-black text-slate-950">{name}</p>
      <div className="mt-20 border-t border-dashed border-slate-400 pt-3 text-xs text-slate-500">
        التوقيع والختم
      </div>
    </div>
  );
}

function chunkEvidencesForLayout(
  evidences: RuntimeEvidenceItem[],
  evidenceLayoutMode: EvidenceLayoutMode
) {
  const perPage = getEvidenceItemsPerPage(evidenceLayoutMode, evidences.length);
  const chunks: RuntimeEvidenceItem[][] = [];

  for (let index = 0; index < evidences.length; index += perPage) {
    chunks.push(evidences.slice(index, index + perPage));
  }

  return chunks;
}

function getEvidenceItemsPerPage(
  evidenceLayoutMode: EvidenceLayoutMode,
  total: number
) {
  if (evidenceLayoutMode === "one-per-page") return 1;
  if (evidenceLayoutMode === "two-per-page") return 2;
  if (evidenceLayoutMode === "grid-2x2") return 4;
  if (evidenceLayoutMode === "compact") return 6;

  if (total <= 1) return 1;
  if (total <= 2) return 2;
  if (total <= 4) return 4;

  return 4;
}

function getEvidenceLayoutClasses(evidenceLayoutMode: EvidenceLayoutMode) {
  if (evidenceLayoutMode === "one-per-page") {
    return {
      gridClassName: "grid grid-cols-1 gap-4",
      imageBoxClassName: "flex h-[170mm] items-center justify-center bg-slate-100",
    };
  }

  if (evidenceLayoutMode === "two-per-page") {
    return {
      gridClassName: "grid grid-cols-1 gap-4",
      imageBoxClassName: "flex h-[74mm] items-center justify-center bg-slate-100",
    };
  }

  if (evidenceLayoutMode === "compact") {
    return {
      gridClassName: "grid grid-cols-2 gap-3",
      imageBoxClassName: "flex h-[42mm] items-center justify-center bg-slate-100",
    };
  }

  return {
    gridClassName: "grid grid-cols-2 gap-4",
    imageBoxClassName: "flex h-[58mm] items-center justify-center bg-slate-100",
  };
}

function getRuntimeValues(
  previewCaseData: RuntimePreviewCaseData | null
): RuntimeValueItem[] {
  const data = previewCaseData as { values?: RuntimeValueItem[] } | null;
  return Array.isArray(data?.values) ? data.values : [];
}

function getRuntimeEvidences(
  previewCaseData: RuntimePreviewCaseData | null
): RuntimeEvidenceItem[] {
  const data = previewCaseData as { evidences?: RuntimeEvidenceItem[] } | null;
  return Array.isArray(data?.evidences) ? data.evidences : [];
}

function getStudent(previewCaseData: RuntimePreviewCaseData | null) {
  const data = previewCaseData as
    | {
        student?: {
          fullName?: string | null;
          nationalId?: string | null;
          stage?: string | null;
          grade?: string | null;
          classroom?: string | null;
          guardianName?: string | null;
          guardianPhone?: string | null;
        } | null;
      }
    | null;

  return {
    fullName: data?.student?.fullName || "",
    nationalId: data?.student?.nationalId || "",
    stage: data?.student?.stage || "",
    grade: data?.student?.grade || "",
    classroom: data?.student?.classroom || "",
    guardianName: data?.student?.guardianName || "",
    guardianPhone: data?.student?.guardianPhone || "",
  };
}

function getCaseTitle(previewCaseData: RuntimePreviewCaseData | null) {
  const data = previewCaseData as { title?: string | null } | null;
  return data?.title || "تقرير إرشادي";
}

function getServiceName(
  template: ReportTemplateBuilderModel,
  previewCaseData: RuntimePreviewCaseData | null
) {
  const data = previewCaseData as { serviceName?: string | null } | null;

  if (data?.serviceName) {
    return data.serviceName;
  }

  if (template.scope === "SERVICE" && template.serviceSlug) {
    return template.serviceSlug;
  }

  return "الخدمة الإرشادية";
}

function isImageEvidence(evidence: RuntimeEvidenceItem) {
  if (evidence.mimeType?.startsWith("image/")) {
    return true;
  }

  const fileName = evidence.fileName || evidence.fileUrl || evidence.imageUrl || "";
  return /\.(png|jpg|jpeg|webp|gif)$/i.test(fileName);
}
