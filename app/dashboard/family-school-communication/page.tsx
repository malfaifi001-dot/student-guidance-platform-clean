import { ServiceWorkspace } from "@/components/service-ui/service-workspace";
import { getServiceWorkspace } from "@/engine/services/service-workspace-engine";

export default async function FamilySchoolCommunicationPage() {
  const workspace = await getServiceWorkspace({
    slug: "family-school-communication",
    name: "التواصل بين الأسرة والمدرسة",
    description:
      "توثيق التواصل مع الأسرة، سبب التواصل، ما تم مناقشته، والنتيجة ضمن سجلات الخدمة.",
  });

  return <ServiceWorkspace {...workspace} />;
}