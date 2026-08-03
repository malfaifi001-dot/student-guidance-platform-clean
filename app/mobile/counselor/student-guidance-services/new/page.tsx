import { MobileNewCaseWorkflowPage } from "@/components/mobile/mobile-new-case-workflow-page";

export default function Page() {
  return (
    <MobileNewCaseWorkflowPage
      serviceSlug="student-guidance-services"
      title="خدمات التوجيه الطلابي"
      requiresStudent={true}
    />
  );
}