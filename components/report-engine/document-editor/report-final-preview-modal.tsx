"use client";

import type {
  ReportDocumentBlock,
  ReportDocumentDraft,
  ReportDocumentPage,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import { paginateReportDocumentDraftForA4 } from "@/lib/report-engine/document-draft/report-document-a4-paginator";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

type ReportFinalPreviewModalProps = {
  draft: ReportDocumentDraft;
  open: boolean;
  onClose: () => void;
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

function translateTechnicalValue(value: string) {
  const normalized = value.trim().toLowerCase();

  return ARABIC_VALUE_MAP[normalized] || ARABIC_VALUE_MAP[value] || value;
}

function translateFieldLabel(key: string, label: string) {
  if (label && label !== key && !/^[a-z0-9_]+$/i.test(label)) return label;

  return ARABIC_LABEL_MAP[key] || label || key;
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value.map((item) => translateTechnicalValue(String(item))).join("، ");
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return translateTechnicalValue(String(value));
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      dir="rtl"
      className="mb-4 flex items-center justify-start gap-2 text-right text-[22px] font-black text-emerald-950"
    >
      <span className="block h-8 w-2 rounded-full bg-[#d4af37]" />
      <span>{children}</span>
    </h2>
  );
}

function FinalA4Header({
  payload,
  page,
}: {
  payload: SmartReportPayload;
  page: ReportDocumentPage;
}) {
  const schoolName =
    payload.identity.schoolName || "مدرسة عنوان المتوسطة والثانوية";
  const educationDepartment =
    payload.identity.educationDepartment || "الإدارة العامة للتعليم بمنطقة";
  const educationOffice =
    payload.identity.educationOffice || "مكتب التعليم";
  const logoUrl = payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png";

  return (
    <header className="relative h-[126px] shrink-0 border-t-[4px] border-white bg-white">
      <div className="relative h-[106px] overflow-hidden rounded-b-[2.4rem] bg-[#143840] text-white">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/90" />
        <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-white/5" />

        <div dir="rtl" className="relative mx-auto flex h-full w-[78%] items-center justify-between gap-8">
          <img
            src={logoUrl}
            alt="شعار وزارة التعليم"
            className="h-[76px] w-[154px] object-contain"
          />

          <div className="text-center text-[14px] font-black leading-7 text-white/95">
            <div>{educationDepartment}</div>
            <div>{educationOffice}</div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[34px] w-[430px] items-center justify-center rounded-b-[1rem] bg-[#143840] px-6 text-center text-[15px] font-black text-white">
        {schoolName}
      </div>
    </header>
  );
}
function FinalA4Footer({ payload }: { payload: SmartReportPayload }) {
  const schoolName =
    payload.identity.schoolName || "مدرسة عنوان المتوسطة والثانوية";
  const serviceName = payload.service.name || "برامج النشاط";
  const title = payload.title || payload.caseInfo.title || "التقرير";
  const logoUrl = payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png";

  return (
    <footer className="h-[54px] shrink-0 px-8 pb-4">
      <div className="relative overflow-hidden border-b-[6px] border-[#143840]">
        <div dir="rtl" className="grid h-[24px] grid-cols-[74px_minmax(0,1fr)_170px] items-center bg-[#dfeee1]">
          <div className="flex h-full items-center justify-center bg-white">
            <img
              src={logoUrl}
              alt="شعار وزارة التعليم"
              className="h-[18px] w-[54px] object-contain"
            />
          </div>

          <div className="flex h-full min-w-0 items-center justify-center overflow-hidden bg-[#6f9f73] px-4 text-[10px] font-black leading-none text-white">
            <span className="max-w-full truncate">
              {title} - {serviceName} - {schoolName}
            </span>
          </div>

          <div className="h-full bg-[linear-gradient(135deg,rgba(34,115,75,0.25),rgba(255,255,255,0.1))]" />
        </div>
      </div>
    </footer>
  );
}
function getEvidenceCardClass(itemsPerPage?: number) {
  if (itemsPerPage === 1) return "h-[520px] w-full";
  if (itemsPerPage === 2) return "h-[330px] w-full";

  return "h-[210px] w-full";
}

function getEvidenceGridClass(itemsPerPage?: number) {
  if (itemsPerPage === 1) return "grid-cols-1";

  return "grid-cols-2";
}

function FinalTable({ table }: { table: ReportTableBlock }) {
  return (
    <section>
      <SectionTitle>{table.title || "جدول"}</SectionTitle>

      <div
        className={[
          "overflow-hidden border border-emerald-100 bg-white",
          table.settings.rounded ? "rounded-[1.25rem]" : "rounded-none",
        ].join(" ")}
      >
        <table dir="rtl" className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="border-b border-emerald-100 bg-emerald-50 px-3 py-3 text-right text-xs font-black text-emerald-900"
                >
                  {column.title || "عمود"}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id}>
                {table.columns.map((column, columnIndex) => (
                  <td
                    key={column.id}
                    className={[
                      "border-b border-slate-100 px-3 align-top text-xs font-bold leading-6 text-slate-700",
                      table.settings.compact ? "py-2" : "py-3",
                      table.settings.highlightFirstColumn && columnIndex === 0
                        ? "bg-emerald-50/60 text-emerald-950"
                        : "bg-white",
                    ].join(" ")}
                  >
                    {row.cells[columnIndex]?.value || "—"}
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

function getSignatureLayoutClass(count: number) {
  if (count <= 1) return "mx-auto grid w-[260px] grid-cols-1";
  if (count === 2) return "grid grid-cols-2 gap-[170px]";

  return "grid grid-cols-3 gap-4";
}

function FinalBlock({ block }: { block: ReportDocumentBlock }) {
  if (block.type === "META_FIELDS") {
    return (
      <section>
        <div className="grid grid-cols-4 gap-3">
          {block.fields.map((field) => (
            <div
              key={field.key}
              className="min-h-[62px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right"
            >
              <div className="text-[12px] font-black text-slate-500">
                {translateFieldLabel(field.key, field.label)}
              </div>
              <div className="mt-1 text-[15px] font-black leading-6 text-slate-950">
                {renderValue(field.value) || "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "NARRATIVE" || block.type === "PARAGRAPH") {
    return (
      <section>
        <SectionTitle>{block.title || "وصف التنفيذ"}</SectionTitle>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p dir="rtl" className="whitespace-pre-wrap text-right text-[19px] font-bold leading-[2.15] text-slate-800">
            {block.body || ""}
          </p>
        </div>
      </section>
    );
  }

  if (block.type === "BULLET_LIST") {
    const lines = block.body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <section>
        <SectionTitle>{block.title || "قائمة"}</SectionTitle>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <ul dir="rtl" className="space-y-3 text-right">
            {lines.map((line, index) => (
              <li
                key={`${line}-${index}`}
                className="text-[18px] font-bold leading-8 text-slate-800"
              >
                • {line}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (block.type === "TABLE") {
    return <FinalTable table={block} />;
  }

  if (block.type === "EVIDENCE") {
    if (block.evidenceConfig?.visible === false) return null;

    return (
      <section>
        <SectionTitle>{block.title || "الشواهد والمرفقات"}</SectionTitle>

        <div
          className={[
            "grid gap-4",
            getEvidenceGridClass(block.evidenceConfig?.itemsPerPage),
          ].join(" ")}
        >
          {block.evidenceItems.map((item, index) => (
            <div
              key={item.id || index}
              className={[
                "flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1",
                getEvidenceCardClass(block.evidenceConfig?.itemsPerPage),
              ].join(" ")}
            >
              {item.type === "IMAGE" && item.url ? (
                <img
                  src={item.url}
                  alt={item.title || `شاهد ${index + 1}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-50 px-4 text-center text-xs font-black text-slate-500">
                  {item.title || `شاهد ${index + 1}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "SIGNATURES") {
    return (
      <section className={["mt-auto pt-8", getSignatureLayoutClass(block.signatures.length)].join(" ")}>
        {block.signatures.map((signature) => (
          <div
            key={signature.key}
            className="min-h-[102px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center"
          >
            <div className="text-[13px] font-black text-slate-500">
              {signature.label}
            </div>

            <div className="my-6 border-b border-dashed border-slate-400" />

            <div className="text-[16px] font-black text-slate-950">
              {signature.signerName || "—"}
            </div>
          </div>
        ))}
      </section>
    );
  }

  return null;
}

export function ReportFinalPreviewModal({
  draft,
  open,
  onClose,
}: ReportFinalPreviewModalProps) {
  const pages = paginateReportDocumentDraftForA4(draft);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/70 print:static print:bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white px-5 py-3 shadow-sm print:hidden">
        <div>
          <h2 className="text-sm font-black text-slate-950">المعاينة النهائية</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            هذه نسخة نظيفة قبل الاعتماد والتصدير.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            تصدير PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-5 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
          >
            إغلاق
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-68px)] overflow-auto px-6 py-6 print:h-auto print:overflow-visible print:p-0">
        <div className="mx-auto flex w-fit flex-col gap-6 print:gap-0">
          {pages.map((page) => (
            <article
              key={page.id}
              dir="rtl"
              className="flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white px-0 pb-3 shadow-2xl print:h-[1123px] print:w-[794px] print:break-after-page print:shadow-none"
            >
              <FinalA4Header payload={draft.payload} page={page} />

              <main className="min-h-0 flex flex-1 flex-col gap-7 overflow-hidden px-10 py-5">
                {page.blocks.map((block) => (
                  <FinalBlock key={block.id} block={block} />
                ))}
              </main>

              <FinalA4Footer payload={draft.payload} />
            </article>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          .fixed.z-\\[90\\],
          .fixed.z-\\[90\\] * {
            visibility: visible;
          }

          .fixed.z-\\[90\\] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}