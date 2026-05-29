"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CaseItem = {
  id: string;
  title: string | null;
  status: string;
  createdAt: Date;
  service: {
    id: string;
    slug: string;
    name: string;
  };
  student: {
    fullName: string;
    gender: string;
    grade: string | null;
    classroom: string | null;
    guardian: {
      name: string;
      phone: string | null;
    } | null;
  } | null;
  values: Array<{
    fieldKey: string;
    value: string | null;
    jsonValue: unknown;
  }>;
  evidences: Array<{
    id: string;
    fileName: string | null;
    fileUrl: string | null;
    mimeType: string | null;
  }>;
};

type Props = {
  cases: CaseItem[];
};

export function NewReportCasePicker({ cases }: Props) {
  const router = useRouter();

  const [serviceSlug, setServiceSlug] = useState("ALL");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);

  const services = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of cases) {
      map.set(item.service.slug, item.service.name);
    }

    return Array.from(map.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (serviceSlug === "ALL") return cases;
    return cases.filter((item) => item.service.slug === serviceSlug);
  }, [cases, serviceSlug]);

  const selectedCase = cases.find((item) => item.id === caseId);

  async function createReport() {
    if (!selectedCase) {
      alert("اختر سجلًا أولًا.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/dashboard/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        caseEntryId: selectedCase.id,
        title: `تقرير - ${selectedCase.title || selectedCase.service.name}`,
        serviceSlug: selectedCase.service.slug,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(data.error || "فشل إنشاء التقرير.");
      return;
    }

    router.push(`/dashboard/reports/${data.reportId}/studio`);
  }

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-sky-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-200">Create Report</p>

        <h1 className="mt-4 text-5xl font-black">
          إنشاء تقرير من سجل محفوظ
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">
          اختر الخدمة ثم اختر السجل الذي تريد إصدار تقرير عنه. سيتم نقل بيانات السجل إلى استوديو التقارير.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            اختيار السجل
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-black text-slate-700">
                الخدمة
              </label>

              <select
                value={serviceSlug}
                onChange={(event) => {
                  setServiceSlug(event.target.value);
                  setCaseId("");
                }}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-sky-400"
              >
                <option value="ALL">كل الخدمات</option>

                {services.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                السجل
              </label>

              <select
                value={caseId}
                onChange={(event) => setCaseId(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-sky-400"
              >
                <option value="">اختر السجل</option>

                {filteredCases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.service.name} -{" "}
                    {new Date(item.createdAt).toLocaleDateString("ar-SA")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={createReport}
            disabled={loading}
            className="mt-8 rounded-2xl bg-slate-900 px-8 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "جارٍ الإنشاء..." : "إنشاء التقرير وفتح الاستوديو"}
          </button>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            معاينة بيانات الخدمة
          </h2>

          {!selectedCase ? (
            <p className="mt-5 text-sm leading-7 text-slate-500">
              اختر سجلًا لعرض بيانات الخدمة قبل إنشاء التقرير.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              <Info label="الخدمة" value={selectedCase.service.name} />
              <Info label="العنوان" value={selectedCase.title || "-"} />
              <Info
                label="المستفيد"
                value={selectedCase.student?.fullName || "-"}
              />
              <Info label="الصف" value={selectedCase.student?.grade || "-"} />
              <Info
                label="الشعبة"
                value={selectedCase.student?.classroom || "-"}
              />
              <Info
                label="ولي الأمر"
                value={selectedCase.student?.guardian?.name || "-"}
              />
              <Info label="عدد الحقول" value={String(selectedCase.values.length)} />
              <Info
                label="عدد الشواهد"
                value={String(selectedCase.evidences.length)}
              />
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>

      <p className="mt-2 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}