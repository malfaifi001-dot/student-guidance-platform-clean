import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartGeneralA4ReportProps = {
  payload: SmartReportPayload;
};

function renderValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (Array.isArray(value)) return value.length ? value.join("، ") : "غير محدد";
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return String(value);
}

function UsefulFieldGrid({ fields }: { fields: SmartReportField[] }) {
  const visibleFields = fields
    .filter((field) => renderValue(field.value) !== "غير محدد")
    .slice(0, 18);

  if (!visibleFields.length) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
        لا توجد حقول إضافية مناسبة للعرض.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleFields.map((field) => (
        <div
          key={field.key}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-[11px] font-black text-slate-500">
            {field.label}
          </p>
          <p className="mt-1 text-sm font-black leading-7 text-slate-950">
            {renderValue(field.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SmartGeneralA4Report({ payload }: SmartGeneralA4ReportProps) {
  const firstEvidenceItems = payload.evidence.items.slice(0, 4);

  return (
    <article
      className="mx-auto min-h-[297mm] w-[210mm] overflow-hidden bg-white p-[14mm] text-slate-950 shadow-2xl print:min-h-[297mm] print:w-[210mm] print:shadow-none"
      dir="rtl"
    >
      <header className="rounded-[2rem] bg-slate-950 px-8 py-7 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-black text-slate-300">
              {payload.identity.ministryName || "وزارة التعليم"}
            </p>

            <h1 className="mt-3 text-3xl font-black leading-10">
              {payload.title}
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-300">
              {payload.service.name} - {payload.identity.schoolName}
            </p>
          </div>

          <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2">
            {payload.identity.schoolLogoUrl ? (
              <img
                src={payload.identity.schoolLogoUrl}
                alt={payload.identity.schoolName}
                className="h-full w-full object-contain brightness-0 invert"
              />
            ) : (
              <span className="text-xs font-black">الشعار</span>
            )}
          </div>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-4 gap-3">
        {payload.primaryFields.slice(0, 4).map((field) => (
          <div
            key={field.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-[11px] font-black text-slate-500">
              {field.label}
            </p>
            <p className="mt-1 text-sm font-black leading-7 text-slate-950">
              {renderValue(field.value)}
            </p>
          </div>
        ))}
      </section>

      {payload.narrative.body ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-7 w-2 rounded-full bg-emerald-600" />
            <h2 className="text-xl font-black text-slate-950">
              {payload.narrative.title || "وصف التقرير"}
            </h2>
          </div>

          <p className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-base font-bold leading-9 text-slate-700">
            {payload.narrative.body}
          </p>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-7 w-2 rounded-full bg-emerald-600" />
          <h2 className="text-xl font-black text-slate-950">
            بيانات الحالة
          </h2>
        </div>

        <UsefulFieldGrid fields={payload.detailFields} />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-7 w-2 rounded-full bg-emerald-600" />
          <h2 className="text-xl font-black text-slate-950">
            الشواهد والمرفقات
          </h2>
        </div>

        {firstEvidenceItems.length ? (
          <div className="grid grid-cols-2 gap-3">
            {firstEvidenceItems.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex h-[45mm] items-center justify-center overflow-hidden rounded-xl bg-white text-xs font-black text-slate-400">
                  {item.url && item.type === "IMAGE" ? (
                    <img
                      src={item.url}
                      alt={item.title || `شاهد ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    item.title || `شاهد ${index + 1}`
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
            لا توجد شواهد مرفقة.
          </p>
        )}
      </section>

      <section className="mt-8 grid grid-cols-3 gap-3">
        {payload.signatures.slice(0, 3).map((signature) => (
          <div
            key={signature.key}
            className="flex min-h-28 flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-center"
          >
            <p className="text-xs font-black text-slate-500">
              {signature.label}
            </p>

            {signature.imageUrl ? (
              <img
                src={signature.imageUrl}
                alt={signature.signerName || signature.label}
                className="h-10 max-w-full object-contain"
              />
            ) : (
              <p className="text-slate-400">............................</p>
            )}

            <p className="text-sm font-black text-slate-950">
              {signature.signerName || "غير محدد"}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-6 flex items-center justify-between border-t-4 border-slate-950 pt-3 text-xs font-black text-slate-500">
        <span>{payload.identity.schoolName}</span>
        <span>{payload.identity.academicYear}</span>
        <span>منصة التوجيه الطلابي</span>
      </footer>
    </article>
  );
}