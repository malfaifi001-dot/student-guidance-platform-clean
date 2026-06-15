import { WorkspacePortfolioPage } from "@/components/workspace/workspace-portfolio-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function ActivityLeaderPortfolioPage() {
  const current = await requireDashboardUser();

  return (
    <WorkspacePortfolioPage
      eyebrow="ريادة النشاط"
      title="ملف إنجاز رائد النشاط"
      description="ملف موحد يجمع برامج النشاط، الشواهد، التكليفات، والتقارير المرتبطة بريادة النشاط."
      ownerName={current.user.officialName || current.user.name}
      completionPercent={70}
      backHref="/dashboard/activity-leader"
      backLabel="العودة إلى لوحة رائد النشاط"
      sections={[
        {
          title: "برامج النشاط",
          description: "البرامج والفعاليات المنفذة حسب مجالات النشاط.",
          href: "/dashboard/activity-leader/programs",
          value: "رسمي",
          icon: "assignments",
        },
        {
          title: "الشواهد",
          description: "الشواهد والمرفقات الداعمة للبرامج والفعاليات.",
          href: "/dashboard/activity-leader/evidence",
          value: "قريبًا",
          icon: "evidence",
        },
        {
          title: "التقارير",
          description: "تقارير النشاط وبطاقات البرامج المعتمدة.",
          href: "/dashboard/report-2",
          value: "رسمي",
          icon: "reports",
        },
        {
          title: "تكليفات المعلمين",
          description: "متابعة تكليفات المعلمين واعتماد المشاركات.",
          href: "/dashboard/activity-leader/teacher-assignments",
          value: "رسمي",
          icon: "certificates",
        },
      ]}
    />
  );
}