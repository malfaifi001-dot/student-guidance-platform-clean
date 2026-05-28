import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function EditCasePage({
  params,
}: PageProps) {
  const { caseId } = await params;

  if (!caseId) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-orange-100">
          Runtime Resume
        </p>

        <h1 className="mt-3 text-4xl font-black">
          استكمال الحالة
        </h1>

        <p className="mt-4 max-w-3xl leading-8 text-orange-50">
          المرحلة القادمة: Restore Draft Runtime + Resume Values.
        </p>
      </section>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center card-shadow">
        <h2 className="text-2xl font-black text-slate-900">
          Draft Restore قادم الآن
        </h2>

        <p className="mt-4 text-slate-500">
          سيتم هنا تحميل Runtime كامل مع القيم السابقة.
        </p>
      </div>
    </div>
  );
}