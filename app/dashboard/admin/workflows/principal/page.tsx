import { AdminWorkflowRoleIndex } from "@/components/admin/workflows/admin-workflow-role-index";
import { getAdminWorkflowServicesForRole } from "@/lib/admin/workflows/role-workflow-services";

export default async function AdminPrincipalWorkflowsPage() {
  const services = await getAdminWorkflowServicesForRole("PRINCIPAL");
  return (
    <AdminWorkflowRoleIndex
      title="مدير المدرسة"
      description="إدارة خدمات Workflow الخاصة بمدير المدرسة فقط."
      services={services}
    />
  );
}
