import { AdminWorkflowRoleIndex } from "@/components/admin/workflows/admin-workflow-role-index";
import { getAdminWorkflowServicesForRole } from "@/lib/admin/workflows/role-workflow-services";

export default async function AdminActivityLeaderWorkflowsPage() {
  const services = await getAdminWorkflowServicesForRole("ACTIVITY_LEADER");
  return (
    <AdminWorkflowRoleIndex
      title="رائد النشاط"
      description="إدارة خدمات Workflow الخاصة برائد النشاط فقط."
      services={services}
    />
  );
}
