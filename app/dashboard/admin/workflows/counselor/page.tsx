import { AdminWorkflowRoleIndex } from "@/components/admin/workflows/admin-workflow-role-index";
import { getAdminWorkflowServicesForRole } from "@/lib/admin/workflows/role-workflow-services";

export default async function AdminCounselorWorkflowsPage() {
  const services = await getAdminWorkflowServicesForRole("COUNSELOR");
  return (
    <AdminWorkflowRoleIndex
      title="الموجه الطلابي"
      description="إدارة الخدمات التي تعتمد على Workflow للموجه الطلابي فقط."
      services={services}
    />
  );
}
