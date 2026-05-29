type ReportTemplateItem = {
  id: string;
  name: string;
  serviceSlug: string | null;
  type: string;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  templates?: ReportTemplateItem[];
};

export function ReportTemplateList({ templates = [] }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-3xl font-black text-slate-900">
          قوالب التقارير
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          القوالب الرسمية والشخصية التي يمكن استخدامها في استوديو التقارير.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد قوالب محفوظة حتى الآن.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الاسم
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الخدمة
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  النوع
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  عدد الاستخدام
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الحالة
                </th>
              </tr>
            </thead>

            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-t border-slate-100">
                  <td className="px-6 py-5 font-black text-slate-900">
                    {template.name}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {template.serviceSlug || "كل الخدمات"}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {template.type}
                  </td>

                  <td className="px-6 py-5 font-black text-slate-900">
                    {template.usageCount}
                  </td>

                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {template.isActive ? "نشط" : "معطل"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}