import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartReportDocumentRendererProps = {
  payload: SmartReportPayload;
  className?: string;
};

function renderFieldValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join("، ") : "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

function getField(payload: SmartReportPayload, key: string) {
  return payload.primaryFields.find((field) => field.key === key);
}

function ReportInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[74px] flex-col items-end justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-right shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <p className="text-[13px] font-black leading-5 text-slate-400">{label}</p>
      <p className="mt-1 text-[18px] font-black leading-7 text-slate-800">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 mt-7 flex items-center justify-end gap-3">
      <h2 className="text-[28px] font-black leading-none text-[#24563a]">
        {children}
      </h2>
      <span className="h-9 w-2 rounded-full bg-[#d7b63c]" />
    </div>
  );
}

function EvidenceBox({
  item,
  index,
}: {
  item: SmartReportPayload["evidence"]["items"][number];
  index: number;
}) {
  const initials = index === 0 ? "شاهد" : index === 1 ? "نشاط" : "توثيق";

  return (
    <div className="h-[154px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      {item.url ? (
        <img
          src={item.url}
          alt={item.title}
          className="h-full w-full rounded-xl object-contain"
        />
      ) : (
        <div className="grid h-full grid-cols-[1fr_1.6fr_1fr] overflow-hidden rounded-xl bg-[#f4f7f4]">
          <div className="bg-[#f1f5f2]" />
          <div className="flex flex-col items-center justify-center bg-white text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f6f2] text-sm font-black text-[#24563a]">
              {initials}
            </div>
            <p className="mt-3 text-xs font-black text-slate-500">
              {item.title}
            </p>
          </div>
          <div className="bg-[#f1f5f2]" />
        </div>
      )}
    </div>
  );
}

function SignatureBox({
  signature,
}: {
  signature: SmartReportPayload["signatures"][number];
}) {
  return (
    <div className="min-h-[116px] rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center">
      <p className="text-[13px] font-black text-slate-500">
        {signature.label}
      </p>

      <div className="mx-auto mt-5 w-32 border-t border-dotted border-slate-500" />

      <p className="mt-4 text-[18px] font-black text-slate-900">
        {signature.signerName || "—"}
      </p>
    </div>
  );
}

export function SmartReportDocumentRenderer({
  payload,
  className = "",
}: SmartReportDocumentRendererProps) {
  const executionDate = getField(payload, "execution_date");
  const semester = getField(payload, "semester");
  const executor = getField(payload, "executor");
  const targetGroup = getField(payload, "target_group");
  const executionMethod = getField(payload, "execution_method");
  const week = getField(payload, "week");

  return (
    <article
      dir="rtl"
      className={[
        "mx-auto w-full max-w-[210mm] bg-white text-slate-950 print:shadow-none",
        className,
      ].join(" ")}
    >
      <section className="relative min-h-[297mm] overflow-hidden bg-white px-[46px] py-[34px] shadow-sm print:shadow-none">
        <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-slate-100/70" />

        <header className="relative overflow-hidden rounded-t-[2rem] bg-gradient-to-l from-[#2f7b55] via-[#1f5f43] to-[#071523] px-11 py-8 text-white">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -right-16 -bottom-20 h-60 w-60 rounded-full bg-white/10" />

          <div className="relative grid grid-cols-[230px_1fr] items-center gap-8">
            <div className="text-left">
              <img
                src={payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png"}
                alt="وزارة التعليم"
                className="h-16 w-auto object-contain brightness-0 invert"
              />
              <p className="mt-3 text-sm font-bold leading-5 text-white/85">
                وزارة التعليم
              </p>
              <p className="text-xs font-bold text-white/75">
                Ministry of Education
              </p>
            </div>

            <div className="text-right">
              <p className="text-[15px] font-black text-white/85">
                تقرير برنامج نشاط طلابي
              </p>
              <h1 className="mt-2 text-[42px] font-black leading-tight tracking-tight text-white">
                {payload.title}
              </h1>
              <p className="mt-1 text-[16px] font-black text-white/90">
                {payload.service.name} - {payload.identity.schoolName}
              </p>
            </div>
          </div>
        </header>

        <section className="relative mt-7 grid grid-cols-4 gap-3">
          <ReportInfoCard
            label={executionDate?.label || "تاريخ التنفيذ / اليوم"}
            value={renderFieldValue(executionDate?.value ?? payload.caseInfo.issuedAt ?? null)}
          />
          <ReportInfoCard
            label={semester?.label || "الفصل الدراسي"}
            value={renderFieldValue(semester?.value ?? payload.identity.currentSemester ?? null)}
          />
          <ReportInfoCard
            label={executor?.label || "المعلم المنفذ"}
            value={renderFieldValue(executor?.value ?? payload.caseInfo.issuedBy ?? null)}
          />
          <ReportInfoCard
            label={targetGroup?.label || "الفئة المستهدفة"}
            value={renderFieldValue(targetGroup?.value || "—")}
          />
        </section>

        <section className="relative mt-3 grid grid-cols-4 gap-3">
          <div className="col-start-1">
            <ReportInfoCard
              label={executionMethod?.label || "طريقة التنفيذ"}
              value={renderFieldValue(executionMethod?.value || "—")}
            />
          </div>

          <div className="col-start-2">
            <ReportInfoCard
              label={week?.label || "الأسبوع"}
              value={renderFieldValue(week?.value || "—")}
            />
          </div>
        </section>

        <SectionTitle>{payload.narrative.title || "وصف التنفيذ"}</SectionTitle>

        <section className="rounded-3xl border border-slate-200 bg-white px-7 py-6">
          <p className="text-[21px] font-black leading-[2.05] text-slate-700">
            {payload.narrative.body}
          </p>
        </section>

        <SectionTitle>الشواهد والمرفقات</SectionTitle>

        <section className="grid grid-cols-2 gap-4">
          {payload.evidence.items.slice(0, 4).map((item, index) => (
            <EvidenceBox key={item.id} item={item} index={index} />
          ))}
        </section>

        <section className="mt-28 grid grid-cols-3 gap-4">
          {payload.signatures.map((signature) => (
            <SignatureBox key={signature.key} signature={signature} />
          ))}
        </section>

        <footer className="absolute bottom-[34px] left-[46px] right-[46px]">
          <div className="h-[3px] bg-[#24563a]" />
          <div className="grid grid-cols-3 pt-4 text-[13px] font-black text-slate-500">
            <p className="text-right">{payload.identity.schoolName}</p>
            <p className="text-center">
              {payload.identity.academicYear} - {payload.identity.currentSemester}
            </p>
            <p className="text-left">منصة التوجيه الطلابي</p>
          </div>
        </footer>
      </section>
    </article>
  );
}