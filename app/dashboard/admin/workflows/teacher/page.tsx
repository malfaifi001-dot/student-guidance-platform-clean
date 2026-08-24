import { AdminWorkflowRoleIndex } from "@/components/admin/workflows/admin-workflow-role-index";
import { getAdminWorkflowServicesForRole } from "@/lib/admin/workflows/role-workflow-services";

export default async function AdminTeacherWorkflowsPage() {
  const services = await getAdminWorkflowServicesForRole("TEACHER");
  return (
    <AdminWorkflowRoleIndex
      title="المعلم"
      description="إدارة خدمات Workflow الخاصة بالمعلم فقط."
      services={services}
    />
  );
}
