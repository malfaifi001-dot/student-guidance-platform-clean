"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type CaseRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  serviceName: string;
  studentName: string;
};

export function CasesSearchTable({ cases }: { cases: CaseRow[] }) {
  const [query, setQuery] = useState("");

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return cases;

    return cases.filter((item) =>
      [
        item.title,
        item.status,
        item.serviceName,
        item.studentName,
        item.createdAt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [cases, query]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم الطالب، الخدمة، الحالة، العنوان..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-4">العنوان</th>
              <th className="p-4">الخدمة</th>
              <th className="p-4">الطالب/الطالبة</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">التاريخ</th>
              <th className="p-4">الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {filteredCases.map((caseItem) => (
              <tr key={caseItem.id} className="border-t border-slate-100">
                <td className="p-4 font-black text-slate-900">
                  {caseItem.title}
                </td>

                <td className="p-4 text-slate-500">{caseItem.serviceName}</td>
                <td className="p-4 text-slate-500">{caseItem.studentName}</td>

                <td className="p-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {caseItem.status}
                  </span>
                </td>

                <td className="p-4 text-slate-500">{caseItem.createdAt}</td>

                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/cases/${caseItem.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      عرض
                    </Link>

                    <Link
                      href={`/dashboard/cases/${caseItem.id}/edit`}
                      className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700"
                    >
                      متابعة
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  لا توجد نتائج مطابقة للبحث.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}