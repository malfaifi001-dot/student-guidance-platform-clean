type ReportField = {
  key: string;
  label: string;
  value: string;
  items: string[];
  isRepeater: boolean;
  order: number;
};

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  note: string;
};

type SpecialReportDocumentProps = {
  data: {
    id: string;

    title: string;

    status: string;

    performanceElement: string;

    createdAt: Date;

    submittedAt: Date | null;

    schoolName: string;

    createdByName: string | null;

    fields: ReportField[];

    evidences: EvidenceItem[];
  };
};

function chunkItems<T>(
  items: T[],
  size: number
) {
  const result: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    result.push(
      items.slice(
        index,
        index + size
      )
    );
  }

  return result;
}

export function SpecialReportDocument({
  data,
}: SpecialReportDocumentProps) {
  const executionDate =
    data.fields.find(
      (field) =>
        field.key ===
        "special_report_execution_date"
    )?.value || "—";

  const visibleFields =
    data.fields.filter(
      (field) =>
        ![
          "special_report_title",
          "special_report_execution_date",
        ].includes(field.key)
    );

  const firstEvidenceItems =
    data.evidences.slice(0, 4);

  const additionalEvidencePages =
    chunkItems(
      data.evidences.slice(4),
      4
    );

  return (
    <div
      dir="rtl"
      className="bg-slate-100 py-6 print:bg-white print:py-0"
    >
      <article className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[14mm] shadow-xl print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-5 text-center">
          <p className="text-sm font-black text-slate-600">
            {data.schoolName}
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            {data.title}
          </h1>

          <p className="mt-2 text-sm font-bold text-sky-800">
            عنصر الأداء:{" "}
            {data.performanceElement}
          </p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <InfoCard
            label="تاريخ التنفيذ"
            value={executionDate}
          />

          <InfoCard
            label="حالة التقرير"
            value={
              data.status === "SUBMITTED"
                ? "تقرير رسمي"
                : "مسودة"
            }
          />

          <InfoCard
            label="معد التقرير"
            value={
              data.createdByName ||
              "—"
            }
          />

          <InfoCard
            label="رقم الحالة"
            value={data.id}
          />
        </section>

        <section className="mt-6 space-y-4">
          {visibleFields.map(
            (field) => (
              <div
                key={field.key}
                className="break-inside-avoid rounded-2xl border border-slate-200 p-4"
              >
                <h2 className="text-sm font-black text-slate-950">
                  {field.label}
                </h2>

                {field.isRepeater &&
                field.items.length > 0 ? (
                  <ol className="mt-2 space-y-2 pr-5 text-sm font-semibold leading-7 text-slate-700">
                    {field.items.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={`${field.key}-${index}`}
                          className="list-decimal"
                        >
                          {item}
                        </li>
                      )
                    )}
                  </ol>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                    {field.value}
                  </p>
                )}
              </div>
            )
          )}
        </section>

        {firstEvidenceItems.length >
        0 ? (
          <section className="mt-7">
            <h2 className="border-b border-slate-200 pb-2 text-lg font-black text-slate-950">
              الشواهد والمرفقات
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {firstEvidenceItems.map(
                (evidence) => (
                  <EvidenceCard
                    key={evidence.id}
                    evidence={evidence}
                  />
                )
              )}
            </div>
          </section>
        ) : null}
      </article>

      {additionalEvidencePages.map(
        (
          pageItems,
          pageIndex
        ) => (
          <article
            key={pageIndex}
            className="mx-auto mt-6 min-h-[297mm] w-[210mm] break-before-page bg-white p-[14mm] shadow-xl print:mt-0 print:shadow-none"
          >
            <header className="border-b-2 border-slate-900 pb-4">
              <h2 className="text-xl font-black text-slate-950">
                الشواهد والمرفقات
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {data.title}
              </p>
            </header>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {pageItems.map(
                (evidence) => (
                  <EvidenceCard
                    key={evidence.id}
                    evidence={evidence}
                  />
                )
              )}
            </div>
          </article>
        )
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EvidenceCard({
  evidence,
}: {
  evidence: EvidenceItem;
}) {
  const isImage =
    evidence.mimeType.startsWith(
      "image/"
    ) &&
    Boolean(evidence.fileUrl);

  return (
    <figure className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {isImage ? (
        <div className="flex h-[70mm] items-center justify-center bg-white p-2">
          <img
            src={evidence.fileUrl}
            alt={evidence.fileName}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="grid h-[38mm] place-items-center p-4 text-center text-sm font-black text-slate-600">
          {evidence.fileName}
        </div>
      )}

      {evidence.note ? (
        <figcaption className="border-t border-slate-200 p-3 text-xs font-bold text-slate-600">
          {evidence.note}
        </figcaption>
      ) : null}
    </figure>
  );
}
