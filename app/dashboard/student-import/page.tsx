import { StudentImportCard } from "@/components/students/student-import-card";
import { StudentTable } from "@/components/students/student-table";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";
import { prisma } from "@/lib/prisma";

export default async function StudentImportPage() {
  const school = await ensureDefaultSchoolAccount();

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId: school.id,
      isActive: true,
    },
    include: {
      guardian: true,
    },
    orderBy: {
      fullName: "asc",
    },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">School Data Center</p>
        <h1 className="mt-3 text-4xl font-black">مركز بيانات المدرسة</h1>
        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          هنا يتم رفع بيانات الطلاب من نظام نور مرة واحدة، ثم تُستخدم في جميع
          الخدمات: متابعة الطلاب، التواصل مع الأسرة، الخدمات التوجيهية، التقارير.
        </p>
      </section>

      <StudentImportCard />
      <StudentTable students={students} />
    </div>
  );
}
