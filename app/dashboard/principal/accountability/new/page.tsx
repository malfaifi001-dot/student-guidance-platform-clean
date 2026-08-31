import Link from "next/link";

import { AccountabilityCreateForm } from "@/components/accountability/accountability-create-form";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { requirePrincipalServicePageAccess } from "@/lib/principal/performance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPrincipalAccountabilityPage() {
  const access = await requirePrincipalServicePageAccess({ serviceSlug: ACCOUNTABILITY_SERVICE.slug });
  const workflow = await getRuntimeWorkflowByServiceSlug(ACCOUNTABILITY_SERVICE.slug);
  const members = await prisma.user.findMany({
    where: { schoolAccountId: access.schoolAccountId as string, isActive: true, role: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER", "STAFF"] } },
    orderBy: [{ officialName: "asc" }, { name: "asc" }],
    select: { id: true, name: true, officialName: true, role: true },
  });

  if (!workflow) {
    return <main dir="rtl" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-black text-amber-950">لا يوجد Workflow منشور</h1><p className="mt-3 text-sm font-bold leading-7 text-amber-800">يرجى نشر Workflow لخدمة متابعة المعلمين أولًا.</p><Link href={ACCOUNTABILITY_SERVICE.href} className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-amber-900">العودة إلى الخدمة</Link></main>;
  }

  return <main dir="rtl"><AccountabilityCreateForm workflow={workflow.workflow} serviceId={access.service.id} members={members.map((member) => ({ id: member.id, name: member.officialName || member.name, role: member.role }))} /></main>;
}
