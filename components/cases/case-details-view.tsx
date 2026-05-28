import { CaseValueRenderer } from "@/components/cases/case-value-renderer";

type CaseDetailsViewProps = {
  caseEntry: any;
};

function buildFieldLabelMap(caseEntry: any) {
  const map = new Map<string, string>();

  caseEntry.workflow?.steps?.forEach((step: any) => {
    step.fields?.forEach((field: any) => {
      map.set(field.key, field.label);
    });
  });

  return map;
}

function getValue(item: any) {
  return item.jsonValue ?? item.value;
}

export function CaseDetailsView({ caseEntry }: CaseDetailsViewProps) {
  const labelMap = buildFieldLabelMap(caseEntry);

  const displayValues = caseEntry.values.filter(
    (value: any) => !["student", "guardian", "metadata"].includes(value.fieldKey)
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Case Viewer</p>

        <h1 className="mt-3 text-4xl font-black">{caseEntry.title}</h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          عرض منظم للحالة بدل عرض البيانات الخام.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الخدمة</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.service.name}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الطالب</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.student?.fullName || "بدون طالب"}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الحالة</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {caseEntry.status}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">التاريخ</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {new Date(caseEntry.createdAt).toLocaleDateString("ar-SA")}
          </p>
        </div>
      </section>

      {caseEntry.student ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
          <h2 className="text-2xl font-black text-slate-900">بيانات الطالب/الطالبة</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <CaseValueRenderer label="الاسم" value={caseEntry.student.fullName} />
            <CaseValueRenderer label="المرحلة" value={caseEntry.student.stage} />
            <CaseValueRenderer label="الصف" value={caseEntry.student.grade} />
            <CaseValueRenderer label="الفصل" value={caseEntry.student.classroom} />
            <CaseValueRenderer label="ولي الأمر" value={caseEntry.student.guardian?.name} />
            <CaseValueRenderer label="رقم الجوال" value={caseEntry.student.guardian?.phone} />
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-2xl font-black text-slate-900">بيانات الحالة</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {displayValues.map((value: any) => (
            <CaseValueRenderer
              key={value.id}
              label={labelMap.get(value.fieldKey) || value.fieldKey}
              value={getValue(value)}
            />
          ))}

          {displayValues.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-400 md:col-span-2">
              لا توجد قيم محفوظة لهذه الحالة.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}