import { WorkspacePortfolioPage } from "@/components/workspace/workspace-portfolio-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function CounselorPortfolioPage() {
  const current = await requireDashboardUser();

  return (
    <WorkspacePortfolioPage
      eyebrow="التوجيه الطلابي"
      title="ملف إنجاز الموجه"
      description="ملف موحد يجمع الحالات، الشواهد، التقارير، والبرامج الإرشادية المرتبطة بعمل الموجه الطلابي."
      ownerName={current.user.officialName || current.user.name}
      completionPercent={72}
      backHref="/dashboard"
      backLabel="العودة إلى لوحة الموجه"
      sections={[
        {
          title: "الحالات",
          description: "متابعة الحالات الطلابية المرتبطة بعمل الموجه.",
          href: "/dashboard/cases",
          value: "رسمي",
          icon: "assignments",
        },
        {
          title: "الشواهد",
          description: "الشواهد والمرفقات الداعمة للحالات والبرامج.",
          href: "/dashboard/evidence",
          value: "قريبًا",
          icon: "evidence",
        },
        {
          title: "التقارير",
          description: "التقارير الرسمية الصادرة من المنصة.",
          href: "/dashboard/report-2",
          value: "رسمي",
          icon: "reports",
        },
        {
          title: "البرامج الإرشادية",
          description: "البرامج والخطط الإرشادية المنفذة داخل المدرسة.",
          href: "/dashboard/guidance-programs",
          value: "Workflow",
          icon: "certificates",
        },
      ]}
    />
  );
}