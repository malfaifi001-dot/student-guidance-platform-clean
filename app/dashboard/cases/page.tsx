import { CasesSearchTable } from "@/components/cases/cases-search-table";
import { prisma } from "@/lib/prisma";

export default async function CasesPage() {
  const cases = await prisma.caseEntry.findMany({
    include: {
      student: true,
      service: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const rows = cases.map((caseItem) => ({
    id: caseItem.id,
    title: caseItem.title || "بدون عنوان",
    status: caseItem.status,
    createdAt: new Date(caseItem.createdAt).toLocaleDateString("ar-SA"),
    serviceName: caseItem.service.name,
    studentName: caseItem.student?.fullName || "بدون طالب",
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Cases Center</p>

        <h1 className="mt-3 text-4xl font-black">الحالات والسجلات</h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          مركز شامل للبحث في سجلات كل الخدمات مع بقاء كل خدمة محتفظة بسجلاتها الخاصة.
        </p>
      </section>

      <CasesSearchTable cases={rows} />
    </div>
  );
}