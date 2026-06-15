import { WorkspacePortfolioPage } from "@/components/workspace/workspace-portfolio-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function TeacherPortfolioPage() {
  const current = await requireDashboardUser();

  return (
    <WorkspacePortfolioPage
      eyebrow="مساحة المعلم"
      title="ملف إنجازي"
      description="ملف موحد يجمع تكليفات المعلم وشواهده وتقاريره وشهاداته في صفحة واحدة قابلة للربط بالبيانات الحقيقية لاحقًا."
      ownerName={current.user.officialName || current.user.name}
      completionPercent={68}
      backHref="/dashboard/teacher"
      backLabel="العودة إلى مساحة المعلم"
      sections={[
        {
          title: "تكليفاتي",
          description: "متابعة التكليفات المرسلة للمعلم وحالة كل تكليف.",
          href: "/dashboard/teacher/assignments",
          value: "قريبًا",
          icon: "assignments",
        },
        {
          title: "شواهدي",
          description: "رفع وتنظيم الشواهد المرتبطة بالمشاركات والتكليفات.",
          href: "/dashboard/teacher/evidence",
          value: "قريبًا",
          icon: "evidence",
        },
        {
          title: "تقاريري",
          description: "استعراض التقارير المرتبطة بأعمال المعلم داخل المنصة.",
          href: "/dashboard/report-2",
          value: "رسمي",
          icon: "reports",
        },
        {
          title: "شهاداتي",
          description: "عرض الشهادات والتكريمات المرتبطة بالمعلم.",
          href: "/dashboard/teacher/certificates",
          value: "قريبًا",
          icon: "certificates",
        },
      ]}
    />
  );
}