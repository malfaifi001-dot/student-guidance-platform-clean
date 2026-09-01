import { redirect } from "next/navigation";
import { CurriculumDistributionShell } from "@/components/curriculum-distribution/curriculum-distribution-shell";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function CurriculumDistributionPage() {
  const current = await requireServiceAccessForCurrentUser("curriculum-distribution");
  if (current.user.role !== "TEACHER" && current.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <main dir="rtl" className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 px-4 py-4 text-white shadow-md md:px-5 md:py-5">
        <div className="grid gap-2 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <h1 className="text-2xl font-black leading-tight md:text-3xl">
              توزيع المنهج
            </h1>
            <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-sky-50 md:text-sm">
              استعرض توزيع الوحدات والدروس حسب المرحلة والصف والفصل والمادة.
            </p>
          </div>
        </div>
      </section>
      <CurriculumDistributionShell />
    </main>
  );
}
