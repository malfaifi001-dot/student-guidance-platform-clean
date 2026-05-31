import { AdminCommandCenter } from "@/components/admin/admin-command-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const current = await requireDashboardUser();

  const [
    schools,
    users,
    activeUsers,
    students,
    services,
    workflows,
    reports,
    reportTemplates,
    activeSessions,
    incompleteSchoolProfiles,
  ] = await Promise.all([
    prisma.schoolAccount.count(),

    prisma.user.count(),

    prisma.user.count({
      where: {
        isActive: true,
      },
    }),

    prisma.student.count(),

    prisma.service.count(),

    prisma.workflow.count(),

    prisma.guidanceReport.count(),

    prisma.reportTemplate.count(),

    prisma.userSession.count({
      where: {
        isActive: true,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    }),

    prisma.schoolAccount.count({
      where: {
        OR: [
          {
            profile: null,
          },
          {
            profile: {
              OR: [
                { schoolName: "" },
                { educationDepartment: "" },
                { academicYear: "" },
                { currentSemester: "" },
              ],
            },
          },
        ],
      },
    }),
  ]);

  /*
    ملاحظة معمارية:
    حاليًا ReportTemplate لا يحتوي status في Prisma.
    لذلك نجعل draftReportTemplates = 0 مؤقتًا حتى نضيف لاحقًا:
    DRAFT / PUBLISHED / ARCHIVED
  */
  const draftReportTemplates = 0;

  /*
    نفس الفكرة للـ Workflow:
    لو كان عندك status لاحقًا نرجع نحسب المنشور والمسودة بدقة.
    الآن نخليها آمنة للبناء ومتوافقة مع السكيمة الحالية.
  */
  const publishedWorkflows = workflows;
  const draftWorkflows = 0;

  return (
    <AdminCommandCenter
      adminName={current.user.officialName || current.user.name || "الأدمن"}
      stats={{
        schools,
        users,
        activeUsers,
        students,
        services,
        workflows,
        publishedWorkflows,
        draftWorkflows,
        reports,
        reportTemplates,
        draftReportTemplates,
        activeSessions,
        incompleteSchoolProfiles,
      }}
    />
  );
}
