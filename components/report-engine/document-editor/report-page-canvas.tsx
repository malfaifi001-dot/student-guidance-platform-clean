"use client";

import type {
  ReportDocumentBlock,
  ReportDocumentPage,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import {
  MinistryReportFooter,
  MinistryReportHeader,
} from "@/components/report-engine/document-renderers/ministry-report-shell";
import { ReportBlockFrame } from "@/components/report-engine/document-editor/report-block-frame";

type ReportPageCanvasProps = {
  page: ReportDocumentPage;
  payload: SmartReportPayload;
  selectedBlockId?: string | null;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, patch: Partial<ReportDocumentBlock>) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: "previous" | "next") => void;
  onOpenTableEditor: (table: ReportTableBlock) => void;
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
    const items = Array.from(
      new Set(
        value
          .map((item) => translateTechnicalValue(String(item)))
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );

    if (!items.length) return "";

    return (
      <ul className="mt-1 space-y-1.5 text-right text-sm font-black leading-7 text-slate-950" dir="rtl">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start justify-start gap-2">
            <span className="mt-[0.75em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return translateTechnicalValue(String(value));
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      dir="rtl"
      className="mb-4 flex items-center justify-start gap-2 text-right text-[20px] font-black text-emerald-950"
    >
      <span className="block h-7 w-2 rounded-full bg-[#d4af37]" />
      <span>{children}</span>
    </h2>
  );
}

function EditableTitle({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      dir="rtl"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-black text-emerald-950 outline-none transition focus:border-emerald-300"
    />
  );
}

function EditableBody({
  value,
  onChange,
  placeholder,
  minRows = 4,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  minRows?: number;
}) {
  return (
    <textarea
      dir="rtl"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold leading-8 text-slate-800 outline-none transition focus:border-emerald-300"
    />
  );
}

function ReportA4Header({
  payload,
  page,
}: {
  payload: SmartReportPayload;
  page: ReportDocumentPage;
}) {
  return <MinistryReportHeader payload={payload} page={page} />;
}
function ReportA4Footer({ payload }: { payload: SmartReportPayload }) {
  return <MinistryReportFooter payload={payload} />;
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

function getSignatureLayoutClass(count: number) {
  if (count <= 1) return "mx-auto grid w-[260px] grid-cols-1";
  if (count === 2) return "grid grid-cols-2 gap-[150px]";

  return "grid grid-cols-3 gap-4";
}

function TablePreview({ table }: { table: ReportTableBlock }) {
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
                  className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-right text-xs font-black text-emerald-900"
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
                      "border-b border-slate-100 px-3 align-top text-right text-xs font-bold leading-6 text-slate-700",
                      table.settings.compact ? "py-1.5" : "py-2",
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

export function ReportPageCanvas({
  page,
  payload,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  onOpenTableEditor,
}: ReportPageCanvasProps) {
  const blocks = [...page.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-[2rem] bg-slate-100 p-4">
      <div className="mx-auto w-fit">
        <article
          dir="rtl"
          className="activity-a4-page flex h-[1123px] w-[794px] max-w-full flex-col overflow-hidden rounded-[2rem] bg-white px-0 pb-3 shadow-sm print:h-[1123px] print:w-[794px] print:rounded-none print:shadow-none"
        >
          <ReportA4Header payload={payload} page={page} />

          <main className="min-h-0 flex-1 overflow-hidden px-10 py-5">
            <div className="space-y-3">
              {blocks.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-10 text-center text-sm font-bold text-emerald-800">
                  هذه الصفحة فارغة. أضف فقرة أو قائمة أو جدول من لوحة الإضافة.
                </div>
              ) : null}

              {blocks.map((block) => (
                <ReportBlockFrame
                  key={block.id}
                  block={block}
                  selected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onRemove={() => onRemoveBlock(block.id)}
                  onMovePrevious={() => onMoveBlock(block.id, "previous")}
                  onMoveNext={() => onMoveBlock(block.id, "next")}
                  onEditTable={() => {
                    if (block.type === "TABLE") onOpenTableEditor(block);
                  }}
                >
                  {block.type === "META_FIELDS" ? (
                    <section>
                      <div className="grid grid-cols-3 gap-2">
                        {block.fields.map((field) => (
                          <div
                            key={field.key}
                            className="flex min-h-[54px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-center"
                          >
                            <div className="text-[10px] font-black text-slate-500">
                              {translateFieldLabel(field.key, field.label)}
                            </div>
                            <div className="mt-1 break-words text-center text-[11px] font-black leading-5 text-slate-950">
                              {renderValue(field.value) || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {block.type === "NARRATIVE" ? (
                    <section>
                      <SectionTitle>{block.title || "وصف التنفيذ"}</SectionTitle>
                      <EditableTitle
                        value={block.title}
                        placeholder="عنوان وصف التنفيذ"
                        onChange={(title) => onUpdateBlock(block.id, { title })}
                      />
                      <EditableBody
                        value={block.body}
                        placeholder="اكتب وصف التنفيذ"
                        minRows={4}
                        onChange={(body) => onUpdateBlock(block.id, { body })}
                      />
                    </section>
                  ) : null}

                  {block.type === "PARAGRAPH" ? (
                    <section>
                      <SectionTitle>{block.title || "فقرة"}</SectionTitle>
                      <EditableTitle
                        value={block.title}
                        placeholder="عنوان الفقرة"
                        onChange={(title) => onUpdateBlock(block.id, { title })}
                      />
                      <EditableBody
                        value={block.body}
                        placeholder="اكتب نص الفقرة"
                        minRows={4}
                        onChange={(body) => onUpdateBlock(block.id, { body })}
                      />
                    </section>
                  ) : null}

                  {block.type === "BULLET_LIST" ? (
                    <section>
                      <SectionTitle>{block.title || "قائمة"}</SectionTitle>
                      <EditableTitle
                        value={block.title}
                        placeholder="عنوان القائمة"
                        onChange={(title) => onUpdateBlock(block.id, { title })}
                      />
                      <EditableBody
                        value={block.body}
                        placeholder="اكتب كل نقطة في سطر مستقل"
                        minRows={4}
                        onChange={(body) => onUpdateBlock(block.id, { body })}
                      />
                    </section>
                  ) : null}

                  {block.type === "TABLE" ? <TablePreview table={block} /> : null}

                  {block.type === "EVIDENCE" ? (
                    <section>
                      <SectionTitle>{block.title || "الشواهد والمرفقات"}</SectionTitle>

                      <div
                        className={[
                          "grid gap-3",
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
                  ) : null}

                  {block.type === "SIGNATURES" ? (
                    <section className={["mt-auto pt-3", getSignatureLayoutClass(block.signatures.length)].join(" ")}>
                      {block.signatures.map((signature) => (
                        <div
                          key={signature.key}
                          className="min-h-[74px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-center"
                        >
                          <div className="text-[10px] font-bold text-slate-500">
                            {signature.label}
                          </div>

                          <div className="my-3 border-b border-dashed border-slate-400" />

                          <div className="text-[12px] font-bold text-slate-950">
                            {signature.signerName || "—"}
                          </div>
                        </div>
                      ))}
                    </section>
                  ) : null}
                </ReportBlockFrame>
              ))}
            </div>
          </main>

          <ReportA4Footer payload={payload} />
        </article>
      </div>
    </div>
  );
}