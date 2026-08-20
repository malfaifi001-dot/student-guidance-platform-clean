import { redirect } from "next/navigation";
import { CurriculumDistributionShell } from "@/components/curriculum-distribution/curriculum-distribution-shell";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function CurriculumDistributionPage() {
  const current = await requireServiceAccessForCurrentUser("curriculum-distribution");
  if (current.user.role !== "TEACHER" && current.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <main dir="rtl" className="space-y-7">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-6 text-white shadow-xl md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">
              توزيع المنهج
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50 md:text-base">
              استعرض توزيع الوحدات والدروس حسب المرحلة والصف والفصل والمادة.
            </p>
          </div>
        </div>
      </section>
      <CurriculumDistributionShell />
    </main>
  );
}
