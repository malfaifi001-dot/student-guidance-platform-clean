import { ServiceWorkspace } from "@/components/service-ui/service-workspace";
import { getServiceWorkspace } from "@/engine/services/service-workspace-engine";

export default async function StudentFollowUpPage() {
  const workspace = await getServiceWorkspace({
    slug: "student-follow-up",
    name: "متابعة الطلاب",
    description:
      "متابعة حالات الطلاب والطالبات وربطها ببيانات نور والمسودات والسجلات السابقة.",
  });

  return <ServiceWorkspace {...workspace} />;
}