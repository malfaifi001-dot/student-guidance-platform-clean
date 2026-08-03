import { MobileNewCaseWorkflowPage } from "@/components/mobile/mobile-new-case-workflow-page";

export default function Page() {
  return (
    <MobileNewCaseWorkflowPage
      serviceSlug="family-school-communication"
      title="التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور"
      requiresStudent={true}
    />
  );
}